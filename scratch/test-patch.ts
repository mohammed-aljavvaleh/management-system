import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma";

async function run() {
  const id = "cmpq00u2h000004l7q6z10tp1"; // Büşra Polat (currently at 12:00 UTC / 15:00 Local)
  const newStartTimeStr = "2026-05-29T10:00:00.000Z"; // 13:00 Local (which is occupied by Gamze Kurt 10:00-11:00 UTC)
  const salonId = "cmppnny690000z3je3954ex9i"; // assuming the salon ID is consistent, let's find the appointment first to check.

  const current = await prisma.appointment.findFirst({
    where: { id },
    include: { service: true }
  });

  if (!current) {
    console.error("Appointment not found");
    return;
  }

  const actualSalonId = current.salonId;
  const staffId = current.staffId;
  const newStart = new Date(newStartTimeStr);
  const newEnd = new Date(newStart.getTime() + current.service.duration * 60 * 1000);

  console.log("Current appointment:", {
    id: current.id,
    staffId: current.staffId,
    service: current.service.name,
    duration: current.service.duration,
    startTime: current.startTime.toISOString(),
  });

  console.log("Attempting to reschedule to:", {
    newStart: newStart.toISOString(),
    newEnd: newEnd.toISOString()
  });

  const longestService = await prisma.service.findFirst({
    where: { salonId: actualSalonId },
    orderBy: { duration: "desc" },
    select: { duration: true },
  });
  const maxDuration = longestService?.duration ?? 120;
  console.log("maxDuration:", maxDuration);

  const queryStart = new Date(newStart.getTime() - maxDuration * 60 * 1000);
  console.log("Query bounds:", {
    gt: queryStart.toISOString(),
    lt: newEnd.toISOString()
  });

  const conflict = await prisma.appointment.findFirst({
    where: {
      salonId: actualSalonId,
      staffId: staffId,
      status: { not: "CANCELLED" },
      id: { not: id }, // exclude self
      startTime: {
        lt: newEnd,
        gt: queryStart,
      },
    },
    include: { service: true },
  });

  if (conflict) {
    const conflictEnd = new Date(
      conflict.startTime.getTime() + conflict.service.duration * 60 * 1000
    );
    console.log("Conflict found:", {
      id: conflict.id,
      customer: conflict.customerId,
      startTime: conflict.startTime.toISOString(),
      endTime: conflictEnd.toISOString()
    });
    if (conflict.startTime < newEnd && conflictEnd > newStart) {
      console.log("CONFLICT TRIGGERED successfully!");
    } else {
      console.log("Conflict query found an appointment, but overlap checks evaluated to false.");
    }
  } else {
    console.log("No conflict found in database query.");
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
