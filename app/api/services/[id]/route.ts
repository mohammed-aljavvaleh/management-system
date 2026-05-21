import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";
import { parsePositiveInt, parsePositiveMoney } from "@/lib/api-validation";
import { getTranslations } from "@/lib/get-translations";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  const t = await getTranslations();
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: t.apiErrors.nameRequired }, { status: 400 });
      data.name = name;
    }
    if (body.price !== undefined) {
      const price = parsePositiveMoney(body.price, 100_000);
      if (price === null) {
        return NextResponse.json({ error: t.apiErrors.priceRange }, { status: 400 });
      }
      data.price = price;
    }
    if (body.duration !== undefined) {
      const duration = parsePositiveInt(body.duration, 480);
      if (duration === null) {
        return NextResponse.json({ error: t.apiErrors.durationRange }, { status: 400 });
      }
      data.duration = duration;
    }

    const service = await prisma.service.updateManyAndReturn({
      where: { id, salonId },
      data,
    });
    if (!service[0]) return NextResponse.json({ error: t.apiErrors.notFound }, { status: 404 });
    return NextResponse.json(service[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: t.apiErrors.failed }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { id } = await params;
    const result = await prisma.service.deleteMany({ where: { id, salonId } });
    if (result.count === 0) {
      const t = await getTranslations();
      return NextResponse.json({ error: t.apiErrors.notFound }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    const t = await getTranslations();
    return NextResponse.json({ error: t.apiErrors.deleteFailed }, { status: 500 });
  }
}
