import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { notFound } from "next/navigation";
import { StaffProfileClient } from "@/components/staff/staff-profile-client";

export const dynamic = "force-dynamic";

export default async function StaffProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { salonId } = await requireSession();

  const member = await prisma.staff.findFirst({
    where: { id, salonId },
    include: {
      appointments: {
        include: { customer: true, service: true },
        orderBy: { startTime: "desc" },
      },
    },
  });

  if (!member) notFound();

  // Pre-compute stats server-side
  const completed = member.appointments.filter((a) => a.status === "COMPLETED");
  const cancelled = member.appointments.filter((a) => a.status === "CANCELLED");
  const revenue = completed.reduce((sum, a) => sum + a.priceAtBooking, 0);
  const completionRate =
    member.appointments.length > 0
      ? Math.round((completed.length / member.appointments.length) * 100)
      : 0;

  // Top services by count
  const serviceCountMap: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const appt of completed) {
    const svc = appt.service;
    if (!serviceCountMap[svc.id]) {
      serviceCountMap[svc.id] = { name: svc.name, count: 0, revenue: 0 };
    }
    serviceCountMap[svc.id].count++;
    serviceCountMap[svc.id].revenue += appt.priceAtBooking;
  }
  const topServices = Object.values(serviceCountMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top customers by completed bookings count
  const customerCountMap: Record<string, { id: string; name: string; count: number }> = {};
  for (const appt of completed) {
    const cust = appt.customer;
    if (!customerCountMap[cust.id]) {
      customerCountMap[cust.id] = { id: cust.id, name: cust.name, count: 0 };
    }
    customerCountMap[cust.id].count++;
  }
  const loyalCustomers = Object.values(customerCountMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Monthly performance trends for the last 6 months (including current month)
  const monthlyTrends: { month: string; count: number; revenue: number }[] = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    monthlyTrends.push({
      month: `${year}-${month}`,
      count: 0,
      revenue: 0,
    });
  }

  for (const appt of completed) {
    const date = new Date(appt.startTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const key = `${year}-${month}`;
    const bucket = monthlyTrends.find((t) => t.month === key);
    if (bucket) {
      bucket.count++;
      bucket.revenue += appt.priceAtBooking;
    }
  }

  return (
    <StaffProfileClient
      member={member}
      stats={{
        total: member.appointments.length,
        completed: completed.length,
        cancelled: cancelled.length,
        revenue,
        completionRate,
      }}
      topServices={topServices}
      loyalCustomers={loyalCustomers}
      monthlyTrends={monthlyTrends}
    />
  );
}
