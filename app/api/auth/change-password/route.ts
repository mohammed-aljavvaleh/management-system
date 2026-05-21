import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireApiSession } from "@/lib/require-auth";
import { getTranslations } from "@/lib/get-translations";

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { adminId, salonId } = auth.session;

  const t = await getTranslations();
  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: t.apiErrors.missingFields }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: t.apiErrors.passwordTooShort }, { status: 400 });
  }

  const admin = await prisma.admin.findFirst({ where: { id: adminId, salonId } });
  if (!admin) {
    return NextResponse.json({ error: t.apiErrors.adminNotFound }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: t.apiErrors.currentPasswordIncorrect }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
