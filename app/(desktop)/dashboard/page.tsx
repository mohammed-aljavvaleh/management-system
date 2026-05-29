import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let session;
  try {
    session = await requireSession();
  } catch {
    redirect("/login");
  }

  const { salonId, username } = session;

  const cookieStore = await cookies();
  const offsetParam = cookieStore.get("timezone-offset")?.value;
  const offset = offsetParam ? parseInt(offsetParam, 10) : -180; // Default to UTC+3 (Turkey/Saudi)

  const now = new Date();
  const localTimeMs = now.getTime() - offset * 60 * 1000;
  const localDate = new Date(localTimeMs);
  localDate.setUTCHours(0, 0, 0, 0);

  const today = new Date(localDate.getTime() + offset * 60 * 1000);
  const tomorrowLocal = new Date(localDate);
  tomorrowLocal.setUTCDate(tomorrowLocal.getUTCDate() + 1);
  const tomorrow = new Date(tomorrowLocal.getTime() + offset * 60 * 1000);

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

  const standardRevenue = todayAppointments
    .filter((a) => a.status === "COMPLETED" && !a.userPackageId)
    .reduce((s, a) => s + a.priceAtBooking, 0);

  const todayInstallments = await prisma.installment.findMany({
    where: {
      userPackage: { salonId },
      paidAt: { gte: today, lt: tomorrow },
    },
  });
  const installmentRevenue = todayInstallments.reduce((s, inst) => s + inst.amount, 0);

  const todayRevenue = standardRevenue + installmentRevenue;

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