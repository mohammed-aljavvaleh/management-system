// app/api/packages/[id]/next-session/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";
import { parseMoney, parseRequiredDate } from "@/lib/api-validation";
import { getTranslations } from "@/lib/get-translations";
import { revalidatePath } from "next/cache";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  const t = await getTranslations();
  try {
    const { id: packageId } = await params;
    const body = await req.json();
    const { startTime, staffId, installmentAmount } = body;

    if (!startTime || !staffId) {
      return NextResponse.json(
        { error: t.apiErrors.startAndStaffRequired },
        { status: 400 }
      );
    }

    const pkg = await prisma.userPackage.findFirst({
      where: { id: packageId, salonId },
      include: { service: true, customer: true },
    });

    if (!pkg) {
      return NextResponse.json({ error: t.apiErrors.packageNotFound }, { status: 404 });
    }

    if (pkg.remainingSessions <= 0) {
      return NextResponse.json(
        { error: t.apiErrors.noRemainingSessions },
        { status: 400 }
      );
    }

    const staffMember = await prisma.staff.findFirst({
      where: { id: staffId, salonId },
      select: { id: true },
    });
    if (!staffMember) {
      return NextResponse.json({ error: t.apiErrors.staffNotFound }, { status: 404 });
    }

    // Resolve service — use linked serviceId if present, otherwise infer from
    // the package's existing appointments (handles packages created before the
    // serviceId field was added to UserPackage).
    let service = pkg.service;

    if (!service) {
      const existingAppt = await prisma.appointment.findFirst({
        where: { userPackageId: packageId, salonId },
        include: { service: true },
        orderBy: { createdAt: "asc" },
      });

      if (!existingAppt) {
        return NextResponse.json(
          { error: t.apiErrors.cannotDetermineService },
          { status: 400 }
        );
      }

      service = existingAppt.service;

      // Backfill serviceId on the package so this lookup never runs again
      await prisma.userPackage.updateMany({
        where: { id: packageId, salonId },
        data: { serviceId: service.id },
      });
    }

    const apptStart = parseRequiredDate(startTime);
    if (!apptStart) {
      return NextResponse.json({ error: t.apiErrors.invalidStartTime }, { status: 400 });
    }
    const apptEnd = new Date(apptStart.getTime() + service.duration * 60 * 1000);

    // Overlap check
    const longestService = await prisma.service.findFirst({
      where: { salonId },
      orderBy: { duration: "desc" },
      select: { duration: true },
    });
    const maxDuration = longestService?.duration ?? 120;

    const conflicts = await prisma.appointment.findMany({
      where: {
        salonId,
        staffId,
        status: { not: "CANCELLED" },
        startTime: {
          lt: apptEnd,
          gt: new Date(apptStart.getTime() - maxDuration * 60 * 1000),
        },
      },
      include: { service: true },
    });

    const hasConflict = conflicts.some((conflict) => {
      const conflictEnd = new Date(
        conflict.startTime.getTime() + conflict.service.duration * 60 * 1000
      );
      return conflict.startTime < apptEnd && conflictEnd > apptStart;
    });

    if (hasConflict) {
      return NextResponse.json(
        { error: t.apiErrors.staffTimeConflict },
        { status: 409 }
      );
    }

    const paidNow = installmentAmount ? parseMoney(installmentAmount) : 0;
    if (paidNow === null) {
      return NextResponse.json({ error: t.apiErrors.invalidInstallment }, { status: 400 });
    }

    const remainingBalance = Math.max(0, pkg.totalPrice - pkg.paidAmount);
    if (paidNow > remainingBalance) {
      return NextResponse.json(
        { error: "Installment amount cannot exceed remaining debt" },
        { status: 400 }
      );
    }

    if (pkg.remainingSessions === 1 && Math.abs(paidNow - remainingBalance) > 0.009) {
      return NextResponse.json(
        { error: "Final session payment must equal the remaining balance" },
        { status: 400 }
      );
    }

    const appointment = await prisma.$transaction(async (tx) => {
      const freshPkg = await tx.userPackage.findFirst({
        where: { id: packageId, salonId },
        select: { remainingSessions: true },
      });
      if (!freshPkg || freshPkg.remainingSessions <= 0) {
        throw new Error(t.apiErrors.noRemainingSessions);
      }

      const appt = await tx.appointment.create({
        data: {
          customerId: pkg.customerId,
          startTime: apptStart,
          serviceId: service.id,
          staffId,
          salonId,
          status: "SCHEDULED",
          priceAtBooking: Math.round((pkg.totalPrice / pkg.totalSessions) * 100) / 100,
          userPackageId: packageId,
        },
        include: { service: true, staff: true, customer: true, userPackage: true },
      });

      await tx.userPackage.updateMany({
        where: { id: packageId, salonId },
        data: { remainingSessions: { decrement: 1 } },
      });

      if (paidNow > 0) {
        await tx.userPackage.updateMany({
          where: { id: packageId, salonId },
          data: { paidAmount: { increment: paidNow } },
        });
        await tx.installment.create({
          data: {
            userPackageId: packageId,
            amount: paidNow,
            note: "Advance payment for next session",
          },
        });
      }

      return appt;
    });

    revalidatePath("/appointments");
    revalidatePath("/dashboard");
    revalidatePath("/mobile/appointments");

    return NextResponse.json(appointment, { status: 201 });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : t.apiErrors.failed;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
