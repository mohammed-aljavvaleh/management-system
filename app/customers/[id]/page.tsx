import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CustomerProfileClient } from "@/components/customers/customer-profile-client";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  if (!customer) notFound();
  return <CustomerProfileClient customer={customer!} />;
}