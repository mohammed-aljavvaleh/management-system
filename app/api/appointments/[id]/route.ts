import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { service: true, staff: true, customer: true, userPackage: true },
    });
    if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(appointment);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch appointment" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Handle COMPLETED status with atomic transaction
    if (body.status === "COMPLETED") {
      const installmentAmount = body.installmentAmount
        ? Number(body.installmentAmount)
        : 0;

      const appointment = await prisma.$transaction(async (tx) => {
        // 1. Fetch current appointment to check if it has a package
        const current = await tx.appointment.findUnique({
          where: { id },
          select: { userPackageId: true, status: true },
        });

        if (!current) throw new Error("Appointment not found");
        if (current.status === "COMPLETED") throw new Error("Already completed");

        // 2. Mark appointment as completed
        const updated = await tx.appointment.update({
          where: { id },
          data: { status: "COMPLETED" },
          include: { service: true, staff: true, customer: true, userPackage: true },
        });

        // 3. If linked to a package, decrement remaining sessions + record installment
        if (current.userPackageId) {
          const pkg = await tx.userPackage.findUnique({
            where: { id: current.userPackageId },
            select: { remainingSessions: true, paidAmount: true },
          });

          if (!pkg) throw new Error("Package not found");
          if (pkg.remainingSessions <= 0) throw new Error("No remaining sessions in package");

          await tx.userPackage.update({
            where: { id: current.userPackageId },
            data: {
              remainingSessions: { decrement: 1 },
              paidAmount: { increment: installmentAmount },
            },
          });

          if (installmentAmount > 0) {
            await tx.installment.create({
              data: {
                userPackageId: current.userPackageId,
                amount: installmentAmount,
                note: `Session payment`,
              },
            });
          }
        }

        return updated;
      });

      return NextResponse.json(appointment);
    }

    // Non-COMPLETED status updates (e.g. CANCELLED, rescheduling)
    const data: Record<string, unknown> = {};
    if (body.startTime !== undefined) data.startTime = new Date(body.startTime);
    if (body.serviceId !== undefined) data.serviceId = body.serviceId;
    if (body.staffId !== undefined) data.staffId = body.staffId;
    if (body.status !== undefined) data.status = body.status;

    const appointment = await prisma.appointment.update({
      where: { id },
      data,
      include: { service: true, staff: true, customer: true, userPackage: true },
    });
    return NextResponse.json(appointment);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to update";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.appointment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}