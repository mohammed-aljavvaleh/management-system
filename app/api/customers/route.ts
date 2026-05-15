import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    const customers = await prisma.customer.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
            ],
          }
        : undefined,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { appointments: true, packages: true } },
      },
    });

    return NextResponse.json(customers);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauth = await requireAuth();
  if (unauth) return unauth;
  try {
    const body = await req.json();
    const { name, phone } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Phone validation: 11 digits, starts with 05
    const digits = String(phone ?? "").replace(/\D/g, "");
    if (!digits.startsWith("05") || digits.length !== 11) {
      return NextResponse.json(
        { error: "Phone must be 11 digits and start with 05" },
        { status: 400 }
      );
    }

    // Return existing customer if phone already registered
    const existing = await prisma.customer.findUnique({ 
      where: { phone: digits },
      include: {
        _count: { select: { appointments: true, packages: true } },
        packages: {
          select: { remainingSessions: true, totalSessions: true },
        },
      },
    });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const customer = await prisma.customer.create({
      data: { name: name.trim(), phone: digits },
      include: {
        _count: { select: { appointments: true, packages: true } },
        packages: {
          select: { remainingSessions: true, totalSessions: true },
        },
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}