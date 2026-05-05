import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        appointments: {
          include: { service: true, staff: true, userPackage: true },
          orderBy: { startTime: "desc" },
        },
        packages: {
          include: {
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

    const customer = await prisma.customer.update({ where: { id }, data });
    return NextResponse.json(customer);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}