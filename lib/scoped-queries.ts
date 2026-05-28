// lib/scoped-queries.ts
// Every helper here accepts a `salonId` and injects it into every Prisma `where` clause.
// Import these in Server Components / Server Actions — NEVER pass salonId from the client.
//
// Pattern:
//   const session = await requireSession();          // auth guard
//   const data    = await getAppointments(session.salonId, { ... });

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Prisma } from "@/app/generated/prisma";

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function getAppointments(
  salonId: string,
  opts?: {
    from?: Date;
    to?: Date;
    status?: string;
    staffId?: string;
  }
) {
  return prisma.appointment.findMany({
    where: {
      salonId,
      ...(opts?.status && { status: opts.status }),
      ...(opts?.staffId && { staffId: opts.staffId }),
      ...(opts?.from || opts?.to
        ? {
            startTime: {
              ...(opts.from && { gte: opts.from }),
              ...(opts.to && { lte: opts.to }),
            },
          }
        : {}),
    },
    include: {
      customer: true,
      service: true,
      staff: true,
      userPackage: true,
    },
    orderBy: { startTime: "asc" },
  });
}

export async function getScopedAppointments(opts?: {
  from?: Date;
  to?: Date;
  status?: string;
  staffId?: string;
}) {
  const { salonId } = await requireSession();
  return getAppointments(salonId, opts);
}

export async function getAppointmentById(salonId: string, id: string) {
  return prisma.appointment.findFirst({
    where: { id, salonId },   // salonId guard prevents cross-tenant lookup
    include: { customer: true, service: true, staff: true, userPackage: true },
  });
}

export async function createAppointment(
  salonId: string,
  data: Omit<Prisma.AppointmentUncheckedCreateInput, "salonId">
) {
  return prisma.appointment.create({ data: { ...data, salonId } });
}

export async function updateAppointmentStatus(
  salonId: string,
  id: string,
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED"
) {
  // updateMany with salonId in where ensures an admin can't mutate another tenant's record.
  return prisma.appointment.updateMany({
    where: { id, salonId },
    data: { status },
  });
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function getCustomers(salonId: string, search?: string) {
  return prisma.customer.findMany({
    where: {
      salonId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      }),
    },
    orderBy: { name: "asc" },
  });
}

export async function getCustomerById(salonId: string, id: string) {
  return prisma.customer.findFirst({
    where: { id, salonId },
    include: {
      appointments: { orderBy: { startTime: "desc" }, take: 10 },
      packages: true,
    },
  });
}

export async function upsertCustomer(
  salonId: string,
  data: { name: string; phone: string; notes?: string }
) {
  return prisma.customer.upsert({
    where: { salonId_phone: { salonId, phone: data.phone } },
    update: { name: data.name, notes: data.notes },
    create: { ...data, salonId },
  });
}

// ─── Services ─────────────────────────────────────────────────────────────────

export async function getServices(salonId: string) {
  return prisma.service.findMany({
    where: { salonId },
    orderBy: { name: "asc" },
  });
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export async function getStaff(salonId: string) {
  return prisma.staff.findMany({
    where: { salonId },
    orderBy: { name: "asc" },
  });
}

// ─── Packages ─────────────────────────────────────────────────────────────────

export async function getPackages(salonId: string, customerId?: string) {
  return prisma.userPackage.findMany({
    where: {
      salonId,
      ...(customerId && { customerId }),
    },
    include: { customer: true, service: true, installments: true },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats(salonId: string) {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const [todayCount, scheduledCount, customerCount, revenueTodayAppointments, revenueTodayInstallments] =
    await Promise.all([
      prisma.appointment.count({
        where: { salonId, startTime: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.appointment.count({ where: { salonId, status: "SCHEDULED" } }),
      prisma.customer.count({ where: { salonId } }),
      prisma.appointment.aggregate({
        where: {
          salonId,
          status: "COMPLETED",
          startTime: { gte: startOfDay, lte: endOfDay },
          userPackageId: null, // exclude package appointments (pre-paid)
        },
        _sum: { priceAtBooking: true },
      }),
      prisma.installment.aggregate({
        where: {
          userPackage: { salonId },
          paidAt: { gte: startOfDay, lte: endOfDay },
        },
        _sum: { amount: true },
      }),
    ]);

  return {
    todayAppointments: todayCount,
    upcomingAppointments: scheduledCount,
    totalCustomers: customerCount,
    revenueToday: (revenueTodayAppointments._sum.priceAtBooking ?? 0) + (revenueTodayInstallments._sum.amount ?? 0),
  };
}

export async function getScopedDashboardStats() {
  const { salonId } = await requireSession();
  return getDashboardStats(salonId);
}
