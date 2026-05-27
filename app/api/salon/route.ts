import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";

export async function PATCH(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;

  try {
    const body = await req.json();
    const { openingHour, closingHour } = body;

    // Basic validation
    if (!openingHour || !closingHour) {
      return NextResponse.json({ error: "Opening and closing hours are required." }, { status: 400 });
    }

    // Time format validation (e.g. HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(openingHour) || !timeRegex.test(closingHour)) {
      return NextResponse.json({ error: "Invalid time format. Use HH:MM." }, { status: 400 });
    }

    // Ensure opening is before closing
    if (openingHour >= closingHour) {
      return NextResponse.json({ error: "Opening hour must be before closing hour." }, { status: 400 });
    }

    const updated = await prisma.salon.update({
      where: { id: salonId },
      data: { openingHour, closingHour },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      currency: updated.currency,
      openingHour: updated.openingHour,
      closingHour: updated.closingHour,
    });
  } catch (err) {
    console.error("Salon Update API Error:", err);
    return NextResponse.json({ error: "Failed to update salon settings." }, { status: 500 });
  }
}


