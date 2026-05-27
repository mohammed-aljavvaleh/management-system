import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";
import { getTranslations } from "@/lib/get-translations";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { id } = await params;
    const member = await prisma.staff.findFirst({
      where: { id, salonId },
      include: {
        appointments: {
          include: { customer: true, service: true },
          orderBy: { startTime: "desc" },
        },
      },
    });
    if (!member) {
      const t = await getTranslations();
      return NextResponse.json({ error: t.apiErrors.notFound }, { status: 404 });
    }
    return NextResponse.json(member);
  } catch (err) {
    console.error(err);
    const t = await getTranslations();
    return NextResponse.json({ error: t.apiErrors.fetchFailed }, { status: 500 });
  }
}



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
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.email !== undefined) data.email = body.email || null;
    if (body.phone !== undefined) data.phone = body.phone || null;
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
