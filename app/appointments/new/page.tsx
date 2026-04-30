import { prisma } from "@/lib/prisma";
import { AppointmentForm } from "@/components/appointments/appointment-form";

export default async function NewAppointmentPage() {
  const [services, staff] = await Promise.all([
    prisma.service.findMany({ orderBy: { name: "asc" } }),
    prisma.staff.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <AppointmentForm services={services} staff={staff} />;
}