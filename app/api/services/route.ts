import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";

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
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { name, price, duration } = await req.json();
    if (!name || price == null || duration == null) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const parsedPrice = parseFloat(price);
    const parsedDuration = parseInt(duration);

    if (isNaN(parsedPrice) || parsedPrice <= 0 || parsedPrice > 100000) {
      return NextResponse.json({ error: "Price must be between 0.01 and 100000" }, { status: 400 });
    }

    if (isNaN(parsedDuration) || parsedDuration <= 0 || parsedDuration > 480) {
      return NextResponse.json({ error: "Duration must be between 1 and 480 minutes" }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: { name, price: parsedPrice, duration: parsedDuration, salonId },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
