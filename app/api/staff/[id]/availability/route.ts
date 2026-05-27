import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";
import { getTranslations } from "@/lib/get-translations";

const ALL_TIME_SLOTS = Array.from({ length: 48 }).map((_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  const t = await getTranslations();

  try {
    const { id: staffId } = await params;
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date"); // e.g. "2026-05-27"
    const durationParam = searchParams.get("duration"); // e.g. "35"

    if (!dateParam || !durationParam) {
      return NextResponse.json(
        { error: "Date and duration parameters are required." },
        { status: 400 }
      );
    }

    const duration = parseInt(durationParam, 10);
    if (isNaN(duration) || duration <= 0) {
      return NextResponse.json(
        { error: "Invalid duration parameter." },
        { status: 400 }
      );
    }

    const dateStart = new Date(`${dateParam}T00:00:00`);
    const dateEnd = new Date(`${dateParam}T23:59:59`);
    const queryStart = new Date(dateStart.getTime() - 4 * 60 * 60 * 1000); // 4-hour buffer for spillover

    const appointments = await prisma.appointment.findMany({
      where: {
        salonId,
        staffId,
        status: { not: "CANCELLED" },
        startTime: {
          gte: queryStart,
          lte: dateEnd,
        },
      },
      include: { service: true },
    });

    const bookedRanges = appointments.map((appt) => {
      const start = new Date(appt.startTime).getTime();
      const end = start + appt.service.duration * 60 * 1000;
      return { start, end };
    });

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { openingHour: true, closingHour: true },
    });
    const opening = salon?.openingHour || "09:00";
    const closing = salon?.closingHour || "18:00";

    const filteredSlots = ALL_TIME_SLOTS.filter((slot) => slot >= opening && slot <= closing);

    const availableSlots = filteredSlots.filter((slot) => {
      const slotStart = new Date(`${dateParam}T${slot}:00`).getTime();
      const slotEnd = slotStart + duration * 60 * 1000;

      const hasOverlap = bookedRanges.some((range) => {
        return slotStart < range.end && slotEnd > range.start;
      });

      return !hasOverlap;
    });

    return NextResponse.json({ slots: availableSlots });
  } catch (err) {
    console.error("Availability API Error:", err);
    return NextResponse.json({ error: t.apiErrors.fetchFailed }, { status: 500 });
  }
}
