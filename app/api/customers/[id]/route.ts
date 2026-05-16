import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: { id, salonId },
      include: {
        appointments: {
          include: { service: true, staff: true, userPackage: true },
          orderBy: { startTime: "desc" },
        },
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
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
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

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = String(body.name).trim();

    if (body.phone !== undefined) {
      const digits = String(body.phone).replace(/\D/g, "");
      if (!digits.startsWith("05") || digits.length !== 11) {
        return NextResponse.json(
          { error: "Phone must be 11 digits and start with 05" },
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
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json(customer[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}
