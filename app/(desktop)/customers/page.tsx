import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { CustomersClient } from "@/components/customers/customers-client";

export const dynamic = "force-dynamic";
export default async function CustomersPage() {
  const { salonId } = await requireSession();
  const customers = await prisma.customer.findMany({
    where: { salonId },
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
