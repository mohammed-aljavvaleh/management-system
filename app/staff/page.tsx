import { prisma } from "@/lib/prisma";
import { StaffClient } from "@/components/staff/staff-client";

export default async function StaffPage() {
  const [staff, appointments] = await Promise.all([
    prisma.staff.findMany({ orderBy: { name: "asc" } }),
    prisma.appointment.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { staffId: true, service: { select: { price: true } } },
    }),
  ]);

  // Build stats per staff
  const statsMap: Record<string, { count: number; revenue: number }> = {};
  for (const a of appointments) {
    if (!statsMap[a.staffId]) statsMap[a.staffId] = { count: 0, revenue: 0 };
    statsMap[a.staffId].count++;
    statsMap[a.staffId].revenue += a.service.price;
  }

  const staffWithStats = staff.map((s) => ({
    ...s,
    appointmentCount: statsMap[s.id]?.count || 0,
    totalRevenue: statsMap[s.id]?.revenue || 0,
  }));

  return <StaffClient initialStaff={staffWithStats} />;
}