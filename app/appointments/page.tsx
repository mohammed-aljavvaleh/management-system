import { prisma } from "@/lib/prisma";
import { AppointmentsClient } from "@/components/appointments/appointments-client";

export default async function AppointmentsPage() {
  const [appointments, services, staff] = await Promise.all([
    prisma.appointment.findMany({
      include: { service: true, staff: true },
      orderBy: { startTime: "desc" },
      take: 200,
    }),
    prisma.service.findMany({ orderBy: { name: "asc" } }),
    prisma.staff.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AppointmentsClient
      initialAppointments={appointments}
      services={services}
      staff={staff}
    />
  );
}