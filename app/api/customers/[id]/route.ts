import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";
import { getTranslations } from "@/lib/get-translations";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const excludeAppointments = searchParams.get("excludeAppointments") === "true";
    const t = await getTranslations();

    const customer = await prisma.customer.findFirst({
      where: { id, salonId },
      include: {
        ...(excludeAppointments ? {} : {
          appointments: {
            include: { service: true, staff: true, userPackage: true },
            orderBy: { startTime: "desc" },
          },
        }),
        packages: {
          include: {
            service: true, // now included so "Schedule Next Session" knows the service
            installments: { orderBy: { paidAt: "desc" } },
            _count: { select: { appointments: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: t.apiErrors.customerNotFound }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (err) {
    console.error(err);
    const t = await getTranslations();
    return NextResponse.json({ error: t.apiErrors.fetchCustomerFailed }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { id } = await params;
    const body = await req.json();
    const t = await getTranslations();

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = String(body.name).trim();

    if (body.phone !== undefined) {
      const digits = String(body.phone).replace(/\D/g, "");
      if (!digits.startsWith("05") || digits.length !== 11) {
        return NextResponse.json(
          { error: t.apiErrors.phoneValidation },
          { status: 400 }
        );
      }
      // Check if another customer already has this phone number
      const existing = await prisma.customer.findUnique({
        where: { salonId_phone: { salonId, phone: digits } },
      });
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: t.apiErrors.phoneExists },
          { status: 400 }
        );
      }
      data.phone = digits;
    }

    // notes: allow setting, clearing (empty string → null), or removing
    if (body.notes !== undefined) {
      data.notes = body.notes === "" ? null : String(body.notes).trim();
    }

    const customer = await prisma.customer.updateManyAndReturn({
      where: { id, salonId },
      data,
    });
    if (!customer[0]) {
      return NextResponse.json({ error: t.apiErrors.customerNotFound }, { status: 404 });
    }
    return NextResponse.json(customer[0]);
  } catch (err) {
    console.error(err);
    const t = await getTranslations();
    return NextResponse.json({ error: t.apiErrors.updateCustomerFailed }, { status: 500 });
  }
}
