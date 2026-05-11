import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const staffId = searchParams.get("staffId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (dateParam) {
      const date = new Date(dateParam);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.startTime = { gte: date, lt: nextDay };
    }
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;

    const appointments = await prisma.appointment.findMany({
      where,
      include: { service: true, staff: true, customer: true, userPackage: true },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(appointments);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
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
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sessionCount = Math.max(1, Number(sessions) || 1);

    const [customer, service, longestService] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.service.findUnique({ where: { id: serviceId } }),
      prisma.service.findFirst({ orderBy: { duration: "desc" }, select: { duration: true } }),
    ]);

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    // ── Overlap check ─────────────────────────────────────────────────
    const apptStart = new Date(startTime);
    const apptEnd = new Date(apptStart.getTime() + service.duration * 60 * 1000);
    const maxDuration = longestService?.duration ?? 120;

    const conflict = await prisma.appointment.findFirst({
      where: {
        staffId,
        status: { not: "CANCELLED" },
        startTime: {
          lt: apptEnd,
          gt: new Date(apptStart.getTime() - maxDuration * 60 * 1000),
        },
      },
      include: { service: true },
    });

    if (conflict) {
      const conflictEnd = new Date(
        conflict.startTime.getTime() + conflict.service.duration * 60 * 1000
      );
      if (conflict.startTime < apptEnd && conflictEnd > apptStart) {
        return NextResponse.json(
          { error: "Bu personel üyesi zaten o zaman diliminde bir randevusu var." },
          { status: 409 }
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────

    const totalPrice = price !== undefined ? Number(price) : service.price * sessionCount;
    const paidNow = installmentAmount ? Number(installmentAmount) : 0;

    // Validate prices
    if (isNaN(totalPrice) || totalPrice <= 0 || totalPrice > 1000000) {
      return NextResponse.json({ error: "Invalid total price" }, { status: 400 });
    }
    if (paidNow < 0 || paidNow > totalPrice) {
      return NextResponse.json({ error: "Invalid installment amount" }, { status: 400 });
    }

    // Single session — no package needed
    if (sessionCount === 1) {
      const appointment = await prisma.appointment.create({
        data: {
          customerId,
          startTime: apptStart,
          serviceId,
          staffId,
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
          totalSessions: sessionCount,
          remainingSessions: sessionCount,
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
          status: "SCHEDULED",
          priceAtBooking: paidNow,
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
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}