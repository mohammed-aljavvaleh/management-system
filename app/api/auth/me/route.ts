import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session.adminId || !session.salonId) {
    return NextResponse.json({ username: null, salonName: null });
  }

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    include: { salon: true },
  });

  return NextResponse.json({
    username: session.username ?? null,
    salonName: admin?.salon.name ?? null,
  });
}
