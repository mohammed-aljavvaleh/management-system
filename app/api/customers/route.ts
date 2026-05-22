import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";
import { getTranslations } from "@/lib/get-translations";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    const customers = await prisma.customer.findMany({
      where: {
        salonId,
        ...(query
          ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
            ],
          }
          : {}),
      },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { appointments: true, packages: true } },
      },
    });

    return NextResponse.json(customers);
  } catch (err) {
    console.error(err);
    const t = await getTranslations();
    return NextResponse.json({ error: t.apiErrors.fetchCustomersFailed }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  const t = await getTranslations();
  try {
    const body = await req.json();
    const { name, phone } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: t.apiErrors.nameRequired }, { status: 400 });
    }

    // Phone validation: 11 digits, starts with 05
    const digits = String(phone ?? "").replace(/\D/g, "");
    if (!digits.startsWith("05") || digits.length !== 11) {
      return NextResponse.json(
        { error: t.apiErrors.phoneValidation },
        { status: 400 }
      );
    }

    // Return error if phone already registered
    const existing = await prisma.customer.findUnique({
      where: { salonId_phone: { salonId, phone: digits } },
    });
    if (existing) {
      return NextResponse.json(
        { error: t.apiErrors.phoneExists },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: { name: name.trim(), phone: digits, salonId },
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
    return NextResponse.json({ error: t.apiErrors.createCustomerFailed }, { status: 500 });
  }
}
