import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";
import { isAppointmentStatus, parsePositiveMoney, parseRequiredDate } from "@/lib/api-validation";
import { getTranslations } from "@/lib/get-translations";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const staffId = searchParams.get("staffId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { salonId };

    const t = await getTranslations();
    if (dateParam) {
      const date = parseRequiredDate(dateParam);
      if (!date) return NextResponse.json({ error: t.apiErrors.invalidDate }, { status: 400 });
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.startTime = { gte: date, lt: nextDay };
    }
    if (staffId) where.staffId = staffId;
    if (status) {
      if (!isAppointmentStatus(status)) {
        return NextResponse.json({ error: t.apiErrors.invalidStatus }, { status: 400 });
      }
      where.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: { service: true, staff: true, customer: true, userPackage: true },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(appointments);
  } catch (err) {
    console.error(err);
    const t = await getTranslations();
    return NextResponse.json({ error: t.apiErrors.fetchFailed }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  const t = await getTranslations();
  try {
    const body = await req.json();
    const {
      customerId,
      startTime,
      serviceId,
      staffId,
      sessions,
      price,
      installmentAmount,
    } = body;

    if (!customerId || !startTime || !serviceId || !staffId) {
      return NextResponse.json({ error: t.apiErrors.missingFields }, { status: 400 });
    }

    const parsedStartTime = parseRequiredDate(startTime);
    if (!parsedStartTime) {
      return NextResponse.json({ error: t.apiErrors.invalidStartTime }, { status: 400 });
    }

    const sessionCount = Math.max(1, Number(sessions) || 1);

    const [customer, service, staffMember, longestService] = await Promise.all([
      prisma.customer.findFirst({ where: { id: customerId, salonId } }),
      prisma.service.findFirst({ where: { id: serviceId, salonId } }),
      prisma.staff.findFirst({ where: { id: staffId, salonId } }),
      prisma.service.findFirst({
        where: { salonId },
        orderBy: { duration: "desc" },
        select: { duration: true },
      }),
    ]);

    if (!customer) return NextResponse.json({ error: t.apiErrors.customerNotFound }, { status: 404 });
    if (!service) return NextResponse.json({ error: t.apiErrors.serviceNotFound }, { status: 404 });
    if (!staffMember) return NextResponse.json({ error: t.apiErrors.staffNotFound }, { status: 404 });

    // ── Overlap check ─────────────────────────────────────────────────
    const apptStart = parsedStartTime;
    const apptEnd = new Date(apptStart.getTime() + service.duration * 60 * 1000);
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
    // ─────────────────────────────────────────────────────────────────

    const totalPrice = price !== undefined ? Number(price) : service.price * sessionCount;
    const paidNow = installmentAmount ? Number(installmentAmount) : 0;

    // Validate prices
    if (parsePositiveMoney(totalPrice) === null) {
      return NextResponse.json({ error: t.apiErrors.invalidPrice }, { status: 400 });
    }
    if (!Number.isFinite(paidNow) || paidNow < 0 || paidNow > totalPrice) {
      return NextResponse.json({ error: t.apiErrors.invalidInstallment }, { status: 400 });
    }

    // Single session — no package needed
    if (sessionCount === 1) {
      const appointment = await prisma.appointment.create({
        data: {
          customerId,
          startTime: apptStart,
          serviceId,
          staffId,
          salonId,
          status: "SCHEDULED",
          priceAtBooking: totalPrice,
        },
        include: { service: true, staff: true, customer: true, userPackage: true },
      });
      revalidatePath("/appointments");
      revalidatePath("/dashboard");
      revalidatePath("/mobile/appointments");
      return NextResponse.json(appointment, { status: 201 });
    }

    // Multiple sessions — create package + first appointment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const pkg = await tx.userPackage.create({
        data: {
          name: `${service.name} — ${sessionCount} Sessions`,
          customerId,
          serviceId,           // ← now saved so next-session route can find it
          salonId,
          totalSessions: sessionCount,
          remainingSessions: sessionCount - 1,
          totalPrice,
          paidAmount: paidNow,
        },
      });

      if (paidNow > 0) {
        await tx.installment.create({
          data: {
            userPackageId: pkg.id,
            amount: paidNow,
            note: "Paid at booking",
          },
        });
      }

      const appointment = await tx.appointment.create({
        data: {
          customerId,
          startTime: apptStart,
          serviceId,
          staffId,
          salonId,
          status: "SCHEDULED",
          priceAtBooking: Math.round((totalPrice / sessionCount) * 100) / 100,
          userPackageId: pkg.id,
        },
        include: { service: true, staff: true, customer: true, userPackage: true },
      });

      return appointment;
    });

    revalidatePath("/appointments");
    revalidatePath("/dashboard");
    revalidatePath("/mobile/appointments");
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: t.apiErrors.createFailed }, { status: 500 });
  }
}
