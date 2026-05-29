import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/require-auth";
import { getTranslations } from "@/lib/get-translations";

export async function GET(req: NextRequest) {
  const auth = await requireApiSession();
  if (auth.response) return auth.response;
  const { salonId } = auth.session;
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "week"; // 'day' | 'week' | 'month'

    const now = new Date();
    let startDate: Date;

    if (range === "day") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "week") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    }

    const [appointments, installments] = await Promise.all([
      prisma.appointment.findMany({
        where: { salonId, startTime: { gte: startDate }, status: "COMPLETED" },
        include: { service: true, staff: true },
        orderBy: { startTime: "asc" },
      }),
      prisma.installment.findMany({
        where: {
          userPackage: { salonId },
          paidAt: { gte: startDate }
        },
        orderBy: { paidAt: "asc" },
      })
    ]);

    // Revenue by day
    const byDay: Record<string, { count: number; revenue: number }> = {};
    for (const appt of appointments) {
      const dayKey = appt.startTime.toISOString().slice(0, 10);
      if (!byDay[dayKey]) byDay[dayKey] = { count: 0, revenue: 0 };
      byDay[dayKey].count++;
      if (!appt.userPackageId) {
        byDay[dayKey].revenue += appt.priceAtBooking;
      }
    }

    for (const inst of installments) {
      const dayKey = inst.paidAt.toISOString().slice(0, 10);
      if (!byDay[dayKey]) byDay[dayKey] = { count: 0, revenue: 0 };
      byDay[dayKey].revenue += inst.amount;
    }

    // Top services
    const serviceMap: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const appt of appointments) {
      const sid = appt.serviceId;
      if (!serviceMap[sid]) serviceMap[sid] = { name: appt.service.name, count: 0, revenue: 0 };
      serviceMap[sid].count++;
      serviceMap[sid].revenue += appt.priceAtBooking;
    }

    // Staff performance
    const staffMap: Record<string, { name: string; count: number }> = {};
    for (const appt of appointments) {
      const stid = appt.staffId;
      if (!staffMap[stid]) staffMap[stid] = { name: appt.staff.name, count: 0 };
      staffMap[stid].count++;
    }

    const standardRevenue = appointments
      .filter((a) => !a.userPackageId)
      .reduce((s, a) => s + a.priceAtBooking, 0);
    const installmentRevenue = installments.reduce((s, inst) => s + inst.amount, 0);
    const totalRevenue = standardRevenue + installmentRevenue;
    const totalCount = appointments.length;

    // Cancelled count
    const cancelledCount = await prisma.appointment.count({
      where: { salonId, startTime: { gte: startDate }, status: "CANCELLED" },
    });

    return NextResponse.json({
      totalRevenue,
      totalCount,
      cancelledCount,
      byDay: Object.entries(byDay).map(([date, v]) => ({ date, ...v })),
      topServices: Object.values(serviceMap).sort((a, b) => b.count - a.count).slice(0, 5),
      staffPerformance: Object.values(staffMap).sort((a, b) => b.count - a.count),
    });
  } catch (err) {
    console.error(err);
    const t = await getTranslations();
    return NextResponse.json({ error: t.apiErrors.failed }, { status: 500 });
  }
}
