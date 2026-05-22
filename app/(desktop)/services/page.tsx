import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { ServicesClient } from "@/components/services/services-client";

export const dynamic = "force-dynamic";
export default async function ServicesPage() {
  const { salonId } = await requireSession();
  const services = await prisma.service.findMany({
    where: { salonId },
    orderBy: { name: "asc" },
  });
  return <ServicesClient initialServices={services} />;
}
