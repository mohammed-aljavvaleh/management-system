import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";
import { getTranslations } from "@/lib/get-translations";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.role !== undefined) data.role = body.role;
    const member = await prisma.staff.updateManyAndReturn({
      where: { id, salonId },
      data,
    });
    if (!member[0]) {
      const t = await getTranslations();
      return NextResponse.json({ error: t.apiErrors.notFound }, { status: 404 });
    }
    return NextResponse.json(member[0]);
  } catch (err) {
    console.error(err);
    const t = await getTranslations();
    return NextResponse.json({ error: t.apiErrors.failed }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { id } = await params;
    const result = await prisma.staff.deleteMany({ where: { id, salonId } });
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
