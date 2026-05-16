import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";

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
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { name, role } = await req.json();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    const member = await prisma.staff.create({
      data: { name, role: role || "Technician", salonId },
    });
    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
