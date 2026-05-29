import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { ReportsClient } from "@/components/reports/reports-client";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ range?: string; start?: string; end?: string }>;

export default async function ReportsPage(props: { searchParams: SearchParams }) {
  const { salonId } = await requireSession();
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { openingHour: true, closingHour: true },
  });
  const openingHour = parseInt(salon?.openingHour?.slice(0, 2) ?? "09", 10);
  const closingHour = parseInt(salon?.closingHour?.slice(0, 2) ?? "20", 10);
  const heatmapCols = closingHour - openingHour + 1;
  const searchParams = await props.searchParams;
  const range = searchParams.range || "7days";
  const startParam = searchParams.start;
  const endParam = searchParams.end;

  const cookieStore = await cookies();
  const offsetParam = cookieStore.get("timezone-offset")?.value;
  const offset = offsetParam ? parseInt(offsetParam, 10) : -180; // Default to UTC+3 (Turkey/Saudi)

  const now = new Date();
  const localTimeMs = now.getTime() - offset * 60 * 1000;
  const localDate = new Date(localTimeMs);

  let startDate = new Date();
  let endDate = new Date();
  let daysCount = 7;

  let prevStartDate = new Date();
  let prevEndDate = new Date();

  // Helper to construct UTC representation of local midnight
  function getLocalMidnight(dayAdjustment: number): Date {
    const d = new Date(localDate);
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + dayAdjustment);
    return new Date(d.getTime() + offset * 60 * 1000);
  }

  if (range === "today") {
    startDate = getLocalMidnight(0);
    endDate = new Date(getLocalMidnight(1).getTime() - 1);
    daysCount = 1;

    prevStartDate = getLocalMidnight(-1);
    prevEndDate = new Date(getLocalMidnight(0).getTime() - 1);
  } else if (range === "7days") {
    startDate = getLocalMidnight(-6);
    endDate = new Date(getLocalMidnight(1).getTime() - 1);
    daysCount = 7;

    prevStartDate = getLocalMidnight(-13);
    prevEndDate = new Date(getLocalMidnight(-6).getTime() - 1);
  } else if (range === "thisMonth") {
    const localStartOfMonth = new Date(localDate);
    localStartOfMonth.setUTCHours(0, 0, 0, 0);
    localStartOfMonth.setUTCDate(1);
    startDate = new Date(localStartOfMonth.getTime() + offset * 60 * 1000);

    endDate = new Date(getLocalMidnight(1).getTime() - 1);
    const timeDiff = endDate.getTime() - startDate.getTime();
    daysCount = Math.max(Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1, 1);

    const localStartOfLastMonth = new Date(localStartOfMonth);
    localStartOfLastMonth.setUTCMonth(localStartOfLastMonth.getUTCMonth() - 1);
    prevStartDate = new Date(localStartOfLastMonth.getTime() + offset * 60 * 1000);

    const lastMonthDays = new Date(Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), 0)).getUTCDate();
    const targetDay = Math.min(localDate.getUTCDate(), lastMonthDays);
    const localEndOfLastMonthPeriod = new Date(localStartOfLastMonth);
    localEndOfLastMonthPeriod.setUTCDate(targetDay + 1);
    prevEndDate = new Date(localEndOfLastMonthPeriod.getTime() + offset * 60 * 1000 - 1);
  } else if (range === "thisYear") {
    const localStartOfYear = new Date(localDate);
    localStartOfYear.setUTCHours(0, 0, 0, 0);
    localStartOfYear.setUTCMonth(0, 1);
    startDate = new Date(localStartOfYear.getTime() + offset * 60 * 1000);

    endDate = new Date(getLocalMidnight(1).getTime() - 1);
    const timeDiff = endDate.getTime() - startDate.getTime();
    daysCount = Math.max(Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1, 1);

    const localStartOfLastYear = new Date(localStartOfYear);
    localStartOfLastYear.setUTCFullYear(localStartOfLastYear.getUTCFullYear() - 1);
    prevStartDate = new Date(localStartOfLastYear.getTime() + offset * 60 * 1000);

    const localEndOfLastYearPeriod = new Date(localDate);
    localEndOfLastYearPeriod.setUTCHours(0, 0, 0, 0);
    localEndOfLastYearPeriod.setUTCFullYear(localEndOfLastYearPeriod.getUTCFullYear() - 1);
    localEndOfLastYearPeriod.setUTCDate(localEndOfLastYearPeriod.getUTCDate() + 1);
    prevEndDate = new Date(localEndOfLastYearPeriod.getTime() + offset * 60 * 1000 - 1);
  } else if (range === "custom" && startParam && endParam) {
    const localStart = new Date(`${startParam}T00:00:00Z`);
    startDate = new Date(localStart.getTime() + offset * 60 * 1000);

    const localEnd = new Date(`${endParam}T23:59:59.999Z`);
    endDate = new Date(localEnd.getTime() + offset * 60 * 1000);

    const timeDiff = endDate.getTime() - startDate.getTime();
    daysCount = Math.max(Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1, 1);

    const diff = endDate.getTime() - startDate.getTime() + 1;
    prevStartDate = new Date(startDate.getTime() - diff);
    prevEndDate = new Date(endDate.getTime() - diff);
  } else {
    // Default to 7days
    startDate = getLocalMidnight(-6);
    endDate = new Date(getLocalMidnight(1).getTime() - 1);
    daysCount = 7;

    prevStartDate = getLocalMidnight(-13);
    prevEndDate = new Date(getLocalMidnight(-6).getTime() - 1);
  }

  // Fetch appointments and installments for both current and previous ranges
  const [allAppointments, allInstallments] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        salonId,
        startTime: {
          gte: prevStartDate,
          lte: endDate
        }
      },
      include: { service: true, staff: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.installment.findMany({
      where: {
        userPackage: { salonId },
        paidAt: {
          gte: prevStartDate,
          lte: endDate
        }
      },
      orderBy: { paidAt: "asc" },
    })
  ]);

  const appointments = allAppointments.filter(
    (a) => a.startTime >= startDate && a.startTime <= endDate
  );
  const prevAppointments = allAppointments.filter(
    (a) => a.startTime >= prevStartDate && a.startTime <= prevEndDate
  );

  const installments = allInstallments.filter(
    (inst) => inst.paidAt >= startDate && inst.paidAt <= endDate
  );
  const prevInstallments = allInstallments.filter(
    (inst) => inst.paidAt >= prevStartDate && inst.paidAt <= prevEndDate
  );

  // Build daily data for charts
  const byDay: Record<string, { count: number; revenue: number; completed: number; cancelled: number }> = {};
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(startDate.getTime() - offset * 60 * 1000);
    d.setUTCDate(d.getUTCDate() + i);
    byDay[d.toISOString().slice(0, 10)] = { count: 0, revenue: 0, completed: 0, cancelled: 0 };
  }

  for (const a of appointments) {
    const key = new Date(a.startTime.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
    if (!byDay[key]) continue;
    if (a.status === "CANCELLED") {
      byDay[key].cancelled++;
    } else if (a.status === "COMPLETED") {
      byDay[key].count++;
      byDay[key].completed++;
      if (!a.userPackageId) {
        byDay[key].revenue += a.priceAtBooking;
      }
    }
  }

  // Add installments to daily revenue
  for (const inst of installments) {
    const key = new Date(inst.paidAt.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
    if (byDay[key]) {
      byDay[key].revenue += inst.amount;
    }
  }
 
  // Calculations for current period
  const completedAppointments = appointments.filter((a) => a.status === "COMPLETED");
  const standardRevenue = completedAppointments
    .filter((a) => !a.userPackageId)
    .reduce((s, a) => s + a.priceAtBooking, 0);
  const installmentRevenue = installments.reduce((s, inst) => s + inst.amount, 0);
  const totalRevenue = standardRevenue + installmentRevenue;

  const cancelledCount = appointments.filter((a) => a.status === "CANCELLED").length;
  const completedCount = completedAppointments.length;
  const cashCount = completedAppointments.filter((a) => a.paymentMethod === "CASH").length;
  const cardCount = completedAppointments.filter((a) => a.paymentMethod === "CARD").length;

  // Calculations for previous period (for trend arrows)
  const prevCompletedAppointments = prevAppointments.filter((a) => a.status === "COMPLETED");
  const prevStandardRevenue = prevCompletedAppointments
    .filter((a) => !a.userPackageId)
    .reduce((s, a) => s + a.priceAtBooking, 0);
  const prevInstallmentRevenue = prevInstallments.reduce((s, inst) => s + inst.amount, 0);
  const prevRevenue = prevStandardRevenue + prevInstallmentRevenue;

  const prevCancelledCount = prevAppointments.filter((a) => a.status === "CANCELLED").length;
  const prevCompletedCount = prevCompletedAppointments.length;

  // Compute monthly goal tracker revenue (Current Month Completed Revenue)
  const localStartOfMonth = new Date(localDate);
  localStartOfMonth.setUTCHours(0, 0, 0, 0);
  localStartOfMonth.setUTCDate(1);
  const startOfMonth = new Date(localStartOfMonth.getTime() + offset * 60 * 1000);

  const [monthlyCompleted, monthlyInstallments] = await Promise.all([
    prisma.appointment.aggregate({
      where: {
        salonId,
        status: "COMPLETED",
        userPackageId: null, // exclude package appointments
        startTime: {
          gte: startOfMonth,
          lte: now
        }
      },
      _sum: {
        priceAtBooking: true
      }
    }),
    prisma.installment.aggregate({
      where: {
        userPackage: { salonId },
        paidAt: {
          gte: startOfMonth,
          lte: now
        }
      },
      _sum: {
        amount: true
      }
    })
  ]);
  const currentMonthRevenue = (monthlyCompleted._sum.priceAtBooking || 0) + (monthlyInstallments._sum.amount || 0);

  // Top services (using priceAtBooking to show value delivered)
  const serviceMap: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const a of appointments) {
    if (a.status !== "COMPLETED") continue;
    const sid = a.serviceId;
    if (!serviceMap[sid]) serviceMap[sid] = { name: a.service.name, count: 0, revenue: 0 };
    serviceMap[sid].count++;
    serviceMap[sid].revenue += a.priceAtBooking;
  }

  // Staff performance (also counting scheduled/completed for booked slots count)
  const staffMap: Record<string, { name: string; count: number; revenue: number; bookedCount: number }> = {};
  for (const a of appointments) {
    const stid = a.staffId;
    if (!staffMap[stid]) {
      staffMap[stid] = { name: a.staff.name, count: 0, revenue: 0, bookedCount: 0 };
    }

    if (a.status === "COMPLETED") {
      staffMap[stid].count++;
      staffMap[stid].revenue += a.priceAtBooking;
    }

    if (a.status === "COMPLETED" || a.status === "SCHEDULED") {
      staffMap[stid].bookedCount++;
    }
  }

  // Compute Heatmap (7 rows [Sun-Sat] x 12 cols [09:00-20:00])
  const heatmapData = Array.from({ length: heatmapCols }, () => Array(7).fill(0));
  for (const a of appointments) {
    if (a.status === "CANCELLED") continue;
    const localDate = new Date(a.startTime.getTime() - offset * 60 * 1000);
    const day = localDate.getUTCDay();
    const hour = localDate.getUTCHours();
    if (hour >= openingHour && hour <= closingHour) {
      const row = hour - openingHour;
      const col = day;
      heatmapData[row][col]++;
    }
  }


  return (
    <ReportsClient
      dailyData={Object.entries(byDay).map(([date, v]) => ({ date, ...v }))}
      topServices={Object.values(serviceMap).sort((a, b) => b.count - a.count)}
      staffPerformance={Object.values(staffMap).sort((a, b) => b.count - a.count)}
      totalRevenue={totalRevenue}
      totalCount={completedCount}
      cancelledCount={cancelledCount}
      completedCount={completedCount}
      activeRange={range}
      startDate={startDate.toISOString()}
      endDate={endDate.toISOString()}
      // Comparison data
      prevRevenue={prevRevenue}
      prevCount={prevCompletedCount}
      prevCancelledCount={prevCancelledCount}
      prevCompletedCount={prevCompletedCount}
      // Configurable Goal & Heatmap
      currentMonthRevenue={currentMonthRevenue}
      heatmapData={heatmapData}
      openingHour={salon?.openingHour ?? "09:00"}
      closingHour={salon?.closingHour ?? "20:00"}
      cashCount={cashCount}
      cardCount={cardCount}
    />
  );
}
