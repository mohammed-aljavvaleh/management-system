import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { AppointmentsClient } from "@/components/appointments/Appointments-client";

export const dynamic = "force-dynamic";
export default async function AppointmentsPage() {
  const { salonId } = await requireSession();
  const [appointments, services, staff] = await Promise.all([
    prisma.appointment.findMany({
      where: { salonId },
      include: { service: true, staff: true, customer: true, userPackage: true},
      orderBy: { startTime: "desc" },
      take: 200,
    }),
    prisma.service.findMany({ where: { salonId }, orderBy: { name: "asc" } }),
    prisma.staff.findMany({ where: { salonId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AppointmentsClient
      initialAppointments={appointments}
      services={services}
      staff={staff}
    />
  );
}
