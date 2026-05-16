// app/customers/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { notFound } from "next/navigation";
import { CustomerProfileClient } from "@/components/customers/customer-profile-client";

export const dynamic = "force-dynamic";
export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { salonId } = await requireSession();

  const [customer, staffList] = await Promise.all([
    prisma.customer.findFirst({
      where: { id, salonId },
      include: {
        appointments: {
          include: { service: true, staff: true, userPackage: true },
          orderBy: { startTime: "desc" },
        },
        packages: {
          include: {
            service: true,           // ← needed for Schedule Next Session
            installments: { orderBy: { paidAt: "desc" } },
            _count: { select: { appointments: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.staff.findMany({ where: { salonId }, orderBy: { name: "asc" } }),
  ]);

  if (!customer) notFound();

  return <CustomerProfileClient customer={customer} staffList={staffList} />;
}
