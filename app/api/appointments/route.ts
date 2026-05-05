import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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
  try {
    const body = await req.json();
    const {
      customerId,
      startTime,
      serviceId,
      staffId,
      sessions,       // number of sessions (default 1)
      price,          // overridden price (defaults to service.price)
      installmentAmount, // payment made now (optional, for packages)
    } = body;

    if (!customerId || !startTime || !serviceId || !staffId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sessionCount = Math.max(1, Number(sessions) || 1);

    const [customer, service] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.service.findUnique({ where: { id: serviceId } }),
    ]);

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    const totalPrice = price !== undefined ? Number(price) : service.price * sessionCount;
    const paidNow = installmentAmount ? Number(installmentAmount) : 0;

    // Single session — no package needed
    if (sessionCount === 1) {
      const appointment = await prisma.appointment.create({
        data: {
          customerId,
          startTime: new Date(startTime),
          serviceId,
          staffId,
          status: "SCHEDULED",
          priceAtBooking: totalPrice,
        },
        include: { service: true, staff: true, customer: true, userPackage: true },
      });
      return NextResponse.json(appointment, { status: 201 });
    }

    // Multiple sessions — create package + first appointment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const pkg = await tx.userPackage.create({
        data: {
          name: `${service.name} — ${sessionCount} Sessions`,
          customerId,
          totalSessions: sessionCount,
          remainingSessions: sessionCount,
          totalPrice,
          paidAmount: paidNow,
        },
      });

      // Record initial installment if a payment was made at booking
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
          startTime: new Date(startTime),
          serviceId,
          staffId,
          status: "SCHEDULED",
          priceAtBooking: paidNow, // first installment amount
          userPackageId: pkg.id,
        },
        include: { service: true, staff: true, customer: true, userPackage: true },
      });

      return appointment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}