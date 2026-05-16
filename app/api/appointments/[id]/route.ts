import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireApiSession } from "@/lib/require-auth";

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
    if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(appointment);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch appointment" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { id } = await params;
    const body = await req.json();

    // ── COMPLETED — atomic transaction ────────────────────────────────
    if (body.status === "COMPLETED") {
      const installmentAmount = body.installmentAmount
        ? Number(body.installmentAmount)
        : 0;

      const appointment = await prisma.$transaction(async (tx) => {
        const current = await tx.appointment.findFirst({
          where: { id, salonId },
          select: { userPackageId: true, status: true },
        });
        
        
        
        if (!current) throw new Error("Appointment not found");
        if (current.status === "COMPLETED") throw new Error("Already completed");

        const updatedRows = await tx.appointment.updateManyAndReturn({
          where: { id, salonId },
          data: { status: "COMPLETED" },
          include: { service: true, staff: true, customer: true, userPackage: true },
        });
        const updated = updatedRows[0];
        if (!updated) throw new Error("Appointment not found");

        if (current.userPackageId) {
          const pkg = await tx.userPackage.findFirst({
            where: { id: current.userPackageId, salonId },
            select: { remainingSessions: true, paidAmount: true },
          });

          if (!pkg) throw new Error("Package not found");
          if (pkg.remainingSessions <= 0) throw new Error("No remaining sessions in package");

          await tx.userPackage.updateMany({
            where: { id: current.userPackageId, salonId },
            data: {
              remainingSessions: { decrement: 1 },
              paidAmount: { increment: installmentAmount },
            },
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

    // ── POSTPONE — reschedule startTime with overlap check ────────────
    if (body.action === "POSTPONE") {
      if (!body.startTime) {
        return NextResponse.json({ error: "startTime is required to postpone" }, { status: 400 });
      }

      const newStart = new Date(body.startTime);

      // Fetch current appointment to get staffId and service duration
      const current = await prisma.appointment.findFirst({
        where: { id, salonId },
        include: { service: true },
      });
      if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const newEnd = new Date(newStart.getTime() + current.service.duration * 60 * 1000);
      const longestService = await prisma.service.findFirst({
        where: { salonId },
        orderBy: { duration: "desc" },
        select: { duration: true },
      });
      const maxDuration = longestService?.duration ?? 120;

      const conflict = await prisma.appointment.findFirst({
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

      if (conflict) {
        const conflictEnd = new Date(
          conflict.startTime.getTime() + conflict.service.duration * 60 * 1000
        );
        if (conflict.startTime < newEnd && conflictEnd > newStart) {
          return NextResponse.json(
            { error: "Bu personel üyesi zaten o zaman diliminde bir randevusu var." },
            { status: 409 }
          );
        }
      }

      const data: Record<string, unknown> = { startTime: newStart };
      if (body.notes !== undefined) data.notes = body.notes || null;

      const appointments = await prisma.appointment.updateManyAndReturn({
        where: { id, salonId },
        data,
        include: { service: true, staff: true, customer: true, userPackage: true },
      });
      const appointment = appointments[0];
      if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(appointment);
    }

    // ── General updates (status, notes, price) ──────────────────────────────
    const data: Record<string, unknown> = {};
    if (body.startTime !== undefined) data.startTime = new Date(body.startTime);
    if (body.serviceId !== undefined) {
      const service = await prisma.service.findFirst({
        where: { id: body.serviceId, salonId },
        select: { id: true },
      });
      if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
      data.serviceId = body.serviceId;
    }
    if (body.staffId !== undefined) {
      const staff = await prisma.staff.findFirst({
        where: { id: body.staffId, salonId },
        select: { id: true },
      });
      if (!staff) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
      data.staffId = body.staffId;
    }
    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.priceAtBooking !== undefined) data.priceAtBooking = Number(body.priceAtBooking);

    const appointments = await prisma.appointment.updateManyAndReturn({
      where: { id, salonId },
      data,
      include: { service: true, staff: true, customer: true, userPackage: true },
    });
    const appointment = appointments[0];
    if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    revalidatePath("/dashboard");
    return NextResponse.json(appointment);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to update";
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
  try {
    const { id } = await params;
    const result = await prisma.appointment.deleteMany({ where: { id, salonId } });
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
