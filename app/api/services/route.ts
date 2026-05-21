import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";
import { getTranslations } from "@/lib/get-translations";

export async function GET() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const services = await prisma.service.findMany({
      where: { salonId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(services);
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
    const { name, price, duration } = await req.json();
    if (!name || price == null || duration == null) {
      return NextResponse.json({ error: t.apiErrors.missingFields }, { status: 400 });
    }

    const parsedPrice = parseFloat(price);
    const parsedDuration = parseInt(duration);

    if (isNaN(parsedPrice) || parsedPrice <= 0 || parsedPrice > 100000) {
      return NextResponse.json({ error: t.apiErrors.priceRange }, { status: 400 });
    }

    if (isNaN(parsedDuration) || parsedDuration <= 0 || parsedDuration > 480) {
      return NextResponse.json({ error: t.apiErrors.durationRange }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: { name, price: parsedPrice, duration: parsedDuration, salonId },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: t.apiErrors.createFailed }, { status: 500 });
  }
}
