import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma";

async function main() {
  const appts = await prisma.appointment.findMany({
    where: { status: { not: "CANCELLED" } },
    include: { service: true, staff: true, customer: true }
  });

  console.log("Checking for double bookings...");
  let found = false;

  for (let i = 0; i < appts.length; i++) {
    const a1 = appts[i];
    const start1 = a1.startTime.getTime();
    const end1 = start1 + a1.service.duration * 60 * 1000;

    for (let j = i + 1; j < appts.length; j++) {
      const a2 = appts[j];
      if (a1.staffId !== a2.staffId) continue;
      if (a1.salonId !== a2.salonId) continue;

      const start2 = a2.startTime.getTime();
      const end2 = start2 + a2.service.duration * 60 * 1000;

      // Overlap condition
      if (start1 < end2 && end1 > start2) {
        found = true;
        console.log(`DOUBLE BOOKING FOUND for staff member: ${a1.staff.name} (ID: ${a1.staffId})`);
        console.log(`  Appt 1 (ID: ${a1.id}):`);
        console.log(`    Customer: ${a1.customer.name}`);
        console.log(`    Time (Local): ${a1.startTime.toString()}`);
        console.log(`    Duration: ${a1.service.duration}m`);
        console.log(`  Appt 2 (ID: ${a2.id}):`);
        console.log(`    Customer: ${a2.customer.name}`);
        console.log(`    Time (Local): ${a2.startTime.toString()}`);
        console.log(`    Duration: ${a2.service.duration}m`);
        console.log("-----------------------------------------");
      }
    }
  }

  if (!found) {
    console.log("No double bookings found in the database!");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
