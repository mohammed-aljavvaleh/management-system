import { prisma } from "@/lib/prisma";
import { ReportsClient } from "@/components/reports/reports-client";

export const dynamic = "force-dynamic";
export default async function ReportsPage() {
  // Default: last 7 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  const appointments = await prisma.appointment.findMany({
    where: { startTime: { gte: startDate } },
    include: { service: true, staff: true },
    orderBy: { startTime: "asc" },
  });

  // Build daily data
  const byDay: Record<string, { count: number; revenue: number; completed: number; cancelled: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    byDay[d.toISOString().slice(0, 10)] = { count: 0, revenue: 0, completed: 0, cancelled: 0 };
  }

  for (const a of appointments) {
    const key = a.startTime.toISOString().slice(0, 10);
    if (!byDay[key]) continue;
    if (a.status === "CANCELLED") {
      byDay[key].cancelled++;
    } else if (a.status === "COMPLETED") {
      byDay[key].count++;
      byDay[key].completed++;
      byDay[key].revenue += a.priceAtBooking;
    }
  }

  // Top services
  const serviceMap: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const a of appointments) {
    if (a.status !== "COMPLETED") continue;
    const sid = a.serviceId;
    if (!serviceMap[sid]) serviceMap[sid] = { name: a.service.name, count: 0, revenue: 0 };
    serviceMap[sid].count++;
    serviceMap[sid].revenue += a.priceAtBooking;
  }

  // Staff performance
  const staffMap: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const a of appointments) {
    if (a.status !== "COMPLETED") continue;
    const stid = a.staffId;
    if (!staffMap[stid]) staffMap[stid] = { name: a.staff.name, count: 0, revenue: 0 };
    staffMap[stid].count++;
    staffMap[stid].revenue += a.priceAtBooking;
  }

  const completedAppointments = appointments.filter((a) => a.status === "COMPLETED");
  const totalRevenue = completedAppointments.reduce((s, a) => s + a.priceAtBooking, 0);
  const cancelled = appointments.filter((a) => a.status === "CANCELLED").length;
  const completed = completedAppointments.length;

  return (
    <ReportsClient
      dailyData={Object.entries(byDay).map(([date, v]) => ({ date, ...v }))}
      topServices={Object.values(serviceMap).sort((a, b) => b.count - a.count)}
      staffPerformance={Object.values(staffMap).sort((a, b) => b.count - a.count)}
      totalRevenue={totalRevenue}
      totalCount={completed}
      cancelledCount={cancelled}
      completedCount={completed}
    />
  );
}