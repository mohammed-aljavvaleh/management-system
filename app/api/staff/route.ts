import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";
import { getTranslations } from "@/lib/get-translations";

export async function GET() {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const staff = await prisma.staff.findMany({
      where: { salonId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(staff);
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
    const { name, role, email, phone } = await req.json();
    if (!name) return NextResponse.json({ error: t.apiErrors.nameRequired }, { status: 400 });
    const member = await prisma.staff.create({
      data: {
        name,
        role: role || "Technician",
        email: email || null,
        phone: phone || null,
        salonId,
      },
    });
    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: t.apiErrors.createFailed }, { status: 500 });
  }
}
