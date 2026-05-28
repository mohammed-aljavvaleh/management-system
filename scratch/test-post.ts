import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma";

async function run() {
  const staff = await prisma.staff.findFirst({ where: { name: "Elif Yıldız" } });
  const service = await prisma.service.findFirst({ where: { name: "Klasik Manikür" } });
  const customer = await prisma.customer.findFirst({ where: { name: "Fatma Çelik" } });

  if (!staff || !service || !customer) {
    console.error("Staff, service, or customer not found in DB");
    return;
  }

  const staffId = staff.id;
  const serviceId = service.id;
  const customerId = customer.id;
  const salonId = staff.salonId;
  const startTimeStr = "2026-05-29T12:30:00.000Z"; // 15:30 Local

  const apptStart = new Date(startTimeStr);
  const apptEnd = new Date(apptStart.getTime() + service.duration * 60 * 1000);

  console.log("Attempting to book new appointment:");
  console.log(`  Staff: Elif Yıldız (ID: ${staffId})`);
  console.log(`  Customer: Fatma Çelik (ID: ${customerId})`);
  console.log(`  Service: ${service.name} (${service.duration}m, ID: ${serviceId})`);
  console.log(`  Start Time: ${apptStart.toISOString()}`);
  console.log(`  End Time: ${apptEnd.toISOString()}`);

  const longestService = await prisma.service.findFirst({
    where: { salonId },
    orderBy: { duration: "desc" },
    select: { duration: true },
  });
  const maxDuration = longestService?.duration ?? 120;
  console.log("maxDuration:", maxDuration);

  const queryStart = new Date(apptStart.getTime() - maxDuration * 60 * 1000);
  console.log("Query bounds:", {
    gt: queryStart.toISOString(),
    lt: apptEnd.toISOString()
  });

  const conflicts = await prisma.appointment.findMany({
    where: {
      salonId,
      staffId,
      status: { not: "CANCELLED" },
      startTime: {
        lt: apptEnd,
        gt: queryStart,
      },
    },
    include: { service: true },
  });

  console.log(`Query returned ${conflicts.length} potential conflicts.`);

  const hasConflict = conflicts.some((conflict) => {
    const conflictEnd = new Date(
      conflict.startTime.getTime() + conflict.service.duration * 60 * 1000
    );
    const overlaps = conflict.startTime < apptEnd && conflictEnd > apptStart;
    console.log(`Checking appt (ID: ${conflict.id}, start: ${conflict.startTime.toISOString()}, duration: ${conflict.service.duration}m): overlaps? ${overlaps}`);
    return overlaps;
  });

  if (hasConflict) {
    console.log("CONFLICT TRIGGERED successfully!");
  } else {
    console.log("No conflict found.");
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
