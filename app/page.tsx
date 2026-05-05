import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayAppointments, upcomingCount, services, staff] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { startTime: { gte: today, lt: tomorrow } },
        include: { service: true, staff: true, customer: true },
        orderBy: { startTime: "asc" },
      }),
      prisma.appointment.count({
        where: { startTime: { gte: today }, status: "SCHEDULED" },
      }),
      prisma.service.count(),
      prisma.staff.count(),
    ]);

  const todayRevenue = todayAppointments
    .filter((a) => a.status !== "CANCELLED")
    .reduce((s, a) => s + a.priceAtBooking, 0);

  return (
    <DashboardClient
      todayAppointments={todayAppointments}
      todayRevenue={todayRevenue}
      upcomingCount={upcomingCount}
      servicesCount={services}
      staffCount={staff}
    />
  );
}