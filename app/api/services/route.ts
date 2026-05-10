import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(services);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const { name, price, duration } = await req.json();
    if (!name || price == null || duration == null) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const service = await prisma.service.create({
      data: { name, price: parseFloat(price), duration: parseInt(duration) },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}