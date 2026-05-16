import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { AppointmentForm } from "@/components/appointments/appointment-form";

export const dynamic = "force-dynamic";
export default async function NewAppointmentPage() {
  const { salonId } = await requireSession();
  const [services, staff] = await Promise.all([
    prisma.service.findMany({ where: { salonId }, orderBy: { name: "asc" } }),
    prisma.staff.findMany({ where: { salonId }, orderBy: { name: "asc" } }),
  ]);
  return <AppointmentForm services={services} staff={staff} />;
}
