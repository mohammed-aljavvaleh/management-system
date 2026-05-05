import { prisma } from "@/lib/prisma";
import { CustomersClient } from "@/components/customers/customers-client";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { appointments: true, packages: true } },
      packages: {
        select: { remainingSessions: true, totalSessions: true },
      },
    },
  });

  return <CustomersClient customers={customers} />;
}