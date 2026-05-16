import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";
import { parsePositiveInt, parsePositiveMoney } from "@/lib/api-validation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      data.name = name;
    }
    if (body.price !== undefined) {
      const price = parsePositiveMoney(body.price, 100_000);
      if (price === null) {
        return NextResponse.json({ error: "Price must be between 0.01 and 100000" }, { status: 400 });
      }
      data.price = price;
    }
    if (body.duration !== undefined) {
      const duration = parsePositiveInt(body.duration, 480);
      if (duration === null) {
        return NextResponse.json({ error: "Duration must be between 1 and 480 minutes" }, { status: 400 });
      }
      data.duration = duration;
    }

    const service = await prisma.service.updateManyAndReturn({
      where: { id, salonId },
      data,
    });
    if (!service[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(service[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { id } = await params;
    const result = await prisma.service.deleteMany({ where: { id, salonId } });
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
