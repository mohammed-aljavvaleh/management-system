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
      include: { service: true, staff: true },
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
    const { customerName, customerPhone, startTime, serviceId, staffId } = body;

    if (!customerName || !startTime || !serviceId || !staffId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        customerName,
        customerPhone: customerPhone || null,
        startTime: new Date(startTime),
        serviceId,
        staffId,
        status: "SCHEDULED",
        priceAtBooking: service.price,
      },
      include: { service: true, staff: true },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}