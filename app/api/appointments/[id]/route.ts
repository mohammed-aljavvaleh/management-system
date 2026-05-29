import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireApiSession } from "@/lib/require-auth";
import { isAppointmentStatus, parseMoney, parseRequiredDate } from "@/lib/api-validation";
import { getTranslations } from "@/lib/get-translations";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { id } = await params;
    const appointment = await prisma.appointment.findFirst({
      where: { id, salonId },
      include: { service: true, staff: true, customer: true, userPackage: true },
    });
    if (!appointment) {
      const t = await getTranslations();
      return NextResponse.json({ error: t.apiErrors.notFound }, { status: 404 });
    }
    return NextResponse.json(appointment);
  } catch (err) {
    console.error(err);
    const t = await getTranslations();
    return NextResponse.json({ error: t.apiErrors.fetchAppointmentFailed }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  const t = await getTranslations();
  try {
    const { id } = await params;
    const body = await req.json();

    // ── COMPLETED — atomic transaction ────────────────────────────────
    if (body.status === "COMPLETED") {
      const installmentAmount = body.installmentAmount
        ? Number(body.installmentAmount)
        : 0;
      if (!Number.isFinite(installmentAmount) || installmentAmount < 0 || installmentAmount > 1_000_000) {
        return NextResponse.json({ error: t.apiErrors.invalidInstallment }, { status: 400 });
      }

      const paymentMethod = body.paymentMethod;
      if (paymentMethod && paymentMethod !== "CASH" && paymentMethod !== "CARD") {
        return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
      }

      const appointment = await prisma.$transaction(async (tx) => {
        const current = await tx.appointment.findFirst({
          where: { id, salonId },
          select: { userPackageId: true, status: true },
        });

        if (!current) throw new Error(t.apiErrors.notFound);
        if (current.status === "COMPLETED") throw new Error(t.apiErrors.alreadyCompleted);

        const updatedRows = await tx.appointment.updateManyAndReturn({
          where: { id, salonId },
          data: { status: "COMPLETED", paymentMethod: paymentMethod || null },
          include: { service: true, staff: true, customer: true, userPackage: true },
        });
        const updated = updatedRows[0];
        if (!updated) throw new Error(t.apiErrors.notFound);

        if (current.userPackageId) {
          const pkg = await tx.userPackage.findFirst({
            where: { id: current.userPackageId, salonId },
            select: { paidAmount: true },
          });

          if (!pkg) throw new Error("Package not found");

          await tx.userPackage.updateMany({
            where: { id: current.userPackageId, salonId },
            data: { paidAmount: { increment: installmentAmount } },
          });

          if (installmentAmount > 0) {
            await tx.installment.create({
              data: {
                userPackageId: current.userPackageId,
                amount: installmentAmount,
                note: "Session payment",
              },
            });
          }
        }

        return updated;
      });
      revalidatePath("/dashboard");
      return NextResponse.json(appointment);
    }

    // ── CANCELLED — restore a package session if needed ───────────────
    if (body.status === "CANCELLED") {
      const appointment = await prisma.$transaction(async (tx) => {
        const current = await tx.appointment.findFirst({
          where: { id, salonId },
          select: { userPackageId: true, status: true },
        });

        if (!current) throw new Error("Appointment not found");

        if (current.status !== "CANCELLED" && current.userPackageId) {
          await tx.userPackage.updateMany({
            where: { id: current.userPackageId, salonId },
            data: { remainingSessions: { increment: 1 } },
          });
        }

        const updatedRows = await tx.appointment.updateManyAndReturn({
          where: { id, salonId },
          data: { status: "CANCELLED" },
          include: { service: true, staff: true, customer: true, userPackage: true },
        });
        const updated = updatedRows[0];
        if (!updated) throw new Error("Appointment not found");
        return updated;
      });
      revalidatePath("/dashboard");
      return NextResponse.json(appointment);
    }

    // ── POSTPONE — reschedule startTime with overlap check ────────────
    if (body.action === "POSTPONE") {
      if (!body.startTime) {
        return NextResponse.json({ error: t.apiErrors.startTimeRequired }, { status: 400 });
      }

      const newStart = parseRequiredDate(body.startTime);
      if (!newStart) {
        return NextResponse.json({ error: t.apiErrors.invalidStartTime }, { status: 400 });
      }

      // Fetch current appointment to get staffId and service duration
      const current = await prisma.appointment.findFirst({
        where: { id, salonId },
        include: { service: true },
      });
      if (!current) return NextResponse.json({ error: t.apiErrors.notFound }, { status: 404 });

      const newEnd = new Date(newStart.getTime() + current.service.duration * 60 * 1000);
      const longestService = await prisma.service.findFirst({
        where: { salonId },
        orderBy: { duration: "desc" },
        select: { duration: true },
      });
      const maxDuration = longestService?.duration ?? 120;

      const conflicts = await prisma.appointment.findMany({
        where: {
          salonId,
          staffId: current.staffId,
          status: { not: "CANCELLED" },
          id: { not: id }, // exclude self
          startTime: {
            lt: newEnd,
            gt: new Date(newStart.getTime() - maxDuration * 60 * 1000),
          },
        },
        include: { service: true },
      });

      const hasConflict = conflicts.some((conflict) => {
        const conflictEnd = new Date(
          conflict.startTime.getTime() + conflict.service.duration * 60 * 1000
        );
        return conflict.startTime < newEnd && conflictEnd > newStart;
      });

      if (hasConflict) {
        return NextResponse.json(
          { error: t.apiErrors.staffTimeConflict },
          { status: 409 }
        );
      }

      const data: Record<string, unknown> = { startTime: newStart };
      if (body.notes !== undefined) data.notes = body.notes || null;

      const appointments = await prisma.appointment.updateManyAndReturn({
        where: { id, salonId },
        data,
        include: { service: true, staff: true, customer: true, userPackage: true },
      });
      const appointment = appointments[0];
      if (!appointment) return NextResponse.json({ error: t.apiErrors.notFound }, { status: 404 });
      return NextResponse.json(appointment);
    }

    // ── General updates (status, notes, price) ──────────────────────────────
    const data: Record<string, unknown> = {};

    if (body.startTime !== undefined || body.staffId !== undefined || body.serviceId !== undefined) {
      const current = await prisma.appointment.findFirst({
        where: { id, salonId },
        include: { service: true },
      });
      if (!current) return NextResponse.json({ error: t.apiErrors.notFound }, { status: 404 });

      const targetStart = body.startTime !== undefined
        ? parseRequiredDate(body.startTime)
        : current.startTime;
      if (!targetStart) return NextResponse.json({ error: t.apiErrors.invalidStartTime }, { status: 400 });

      const targetStaffId = body.staffId !== undefined
        ? body.staffId
        : current.staffId;

      let targetService = current.service;
      if (body.serviceId !== undefined && body.serviceId !== current.serviceId) {
        const svc = await prisma.service.findFirst({
          where: { id: body.serviceId, salonId },
        });
        if (!svc) return NextResponse.json({ error: t.apiErrors.serviceNotFound }, { status: 404 });
        targetService = svc;
      }

      const targetEnd = new Date(targetStart.getTime() + targetService.duration * 60 * 1000);
      const longestService = await prisma.service.findFirst({
        where: { salonId },
        orderBy: { duration: "desc" },
        select: { duration: true },
      });
      const maxDuration = longestService?.duration ?? 120;

      const conflicts = await prisma.appointment.findMany({
        where: {
          salonId,
          staffId: targetStaffId,
          status: { not: "CANCELLED" },
          id: { not: id }, // exclude self
          startTime: {
            lt: targetEnd,
            gt: new Date(targetStart.getTime() - maxDuration * 60 * 1000),
          },
        },
        include: { service: true },
      });

      const hasConflict = conflicts.some((conflict) => {
        const conflictEnd = new Date(
          conflict.startTime.getTime() + conflict.service.duration * 60 * 1000
        );
        return conflict.startTime < targetEnd && conflictEnd > targetStart;
      });

      if (hasConflict) {
        return NextResponse.json(
          { error: t.apiErrors.staffTimeConflict },
          { status: 409 }
        );
      }

      if (body.startTime !== undefined) data.startTime = targetStart;
      if (body.staffId !== undefined) data.staffId = targetStaffId;
      if (body.serviceId !== undefined) data.serviceId = targetService.id;
    }
    if (body.status !== undefined) {
      if (!isAppointmentStatus(body.status)) {
        return NextResponse.json({ error: t.apiErrors.invalidStatus }, { status: 400 });
      }
      data.status = body.status;

      // Handle package session decrement when restoring a cancelled appointment
      const current = await prisma.appointment.findFirst({
        where: { id, salonId },
        select: { status: true, userPackageId: true },
      });

      if (current && current.userPackageId) {
        const isCurrentlyCancelled = current.status === "CANCELLED";
        const isNewStatusActive = body.status === "SCHEDULED" || body.status === "COMPLETED";

        if (isCurrentlyCancelled && isNewStatusActive) {
          const pkg = await prisma.userPackage.findFirst({
            where: { id: current.userPackageId, salonId },
            select: { remainingSessions: true },
          });
          if (!pkg || pkg.remainingSessions <= 0) {
            return NextResponse.json(
              { error: t.apiErrors.noRemainingSessions || "No remaining sessions in package" },
              { status: 400 }
            );
          }
          await prisma.userPackage.updateMany({
            where: { id: current.userPackageId, salonId },
            data: { remainingSessions: { decrement: 1 } },
          });
        }
      }
    }
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.paymentMethod !== undefined) {
      if (body.paymentMethod && body.paymentMethod !== "CASH" && body.paymentMethod !== "CARD") {
        return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
      }
      data.paymentMethod = body.paymentMethod || null;
    }
    if (body.priceAtBooking !== undefined) {
      const appt = await prisma.appointment.findFirst({
        where: { id, salonId },
        select: { userPackageId: true },
      });
      if (!appt) return NextResponse.json({ error: t.apiErrors.notFound }, { status: 404 });
      if (appt.userPackageId) {
        return NextResponse.json({ error: "Cannot edit price of package appointments" }, { status: 400 });
      }

      const priceAtBooking = parseMoney(body.priceAtBooking);
      if (priceAtBooking === null) {
        return NextResponse.json({ error: t.apiErrors.invalidPrice }, { status: 400 });
      }
      data.priceAtBooking = priceAtBooking;
    }

    const appointments = await prisma.appointment.updateManyAndReturn({
      where: { id, salonId },
      data,
      include: { service: true, staff: true, customer: true, userPackage: true },
    });
    const appointment = appointments[0];
    if (!appointment) return NextResponse.json({ error: t.apiErrors.notFound }, { status: 404 });
    revalidatePath("/dashboard");
    return NextResponse.json(appointment);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : t.apiErrors.updateFailed;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  const t = await getTranslations();
  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.findFirst({
        where: { id, salonId },
        select: { userPackageId: true, status: true },
      });

      if (!appt) return null;

      // If active (not cancelled) package appointment, restore the credit
      if (appt.userPackageId && appt.status !== "CANCELLED") {
        await tx.userPackage.updateMany({
          where: { id: appt.userPackageId, salonId },
          data: { remainingSessions: { increment: 1 } },
        });
      }

      await tx.appointment.deleteMany({ where: { id, salonId } });
      return true;
    });

    if (!result) {
      return NextResponse.json({ error: t.apiErrors.notFound }, { status: 404 });
    }

    revalidatePath("/dashboard");
    revalidatePath("/appointments");
    revalidatePath("/mobile/appointments");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: t.apiErrors.deleteFailed }, { status: 500 });
  }
}
