import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma";

async function main() {
  const start = new Date("2026-05-29T00:00:00Z");
  const end = new Date("2026-05-29T23:59:59Z");
  const appts = await prisma.appointment.findMany({
    where: {
      startTime: {
        gte: start,
        lte: end
      }
    },
    include: { service: true, staff: true, customer: true }
  });
  console.log(`Appointments on 2026-05-29 (UTC count: ${appts.length}):`);
  for (const a of appts) {
    console.log(`ID: ${a.id}`);
    console.log(`  Customer: ${a.customer.name}`);
    console.log(`  Staff: ${a.staff.name} (ID: ${a.staffId})`);
    console.log(`  Service: ${a.service.name} (Duration: ${a.service.duration}m)`);
    console.log(`  Start Time (UTC): ${a.startTime.toISOString()}`);
    console.log(`  Start Time (Local): ${a.startTime.toString()}`);
    console.log(`  Status: ${a.status}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
