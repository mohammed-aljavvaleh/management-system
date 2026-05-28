import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let session;
  try {
    session = await requireSession();
  } catch {
    redirect("/login");
  }

  const { salonId, username } = session;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayAppointments, upcomingCount, services, staff, salon] =
    await Promise.all([
      prisma.appointment.findMany({
        where: { salonId, startTime: { gte: today, lt: tomorrow } },
        include: { service: true, staff: true, customer: true },
        orderBy: { startTime: "asc" },
      }),
      prisma.appointment.count({
        where: { salonId, startTime: { gte: today }, status: "SCHEDULED" },
      }),
      prisma.service.count({ where: { salonId } }),
      prisma.staff.count({ where: { salonId } }),
      prisma.salon.findUnique({
        where: { id: salonId },
        select: { id: true, name: true, currency: true, openingHour: true, closingHour: true },
      }),
    ]);

  const todayRevenue = todayAppointments
    .filter((a) => a.status === "COMPLETED")
    .reduce((s, a) => s + a.priceAtBooking, 0);

  return (
    <DashboardClient
      todayAppointments={todayAppointments}
      todayRevenue={todayRevenue}
      upcomingCount={upcomingCount}
      servicesCount={services}
      staffCount={staff}
      username={username || ""}
      salon={salon}
    />
  );
}