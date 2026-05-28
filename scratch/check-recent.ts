import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma";

async function main() {
  const appts = await prisma.appointment.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { service: true, staff: true, customer: true }
  });

  console.log("Recent appointments:");
  for (const a of appts) {
    console.log(`ID: ${a.id}`);
    console.log(`  Customer: ${a.customer.name}`);
    console.log(`  Staff: ${a.staff.name}`);
    console.log(`  Service: ${a.service.name} (${a.service.duration}m)`);
    console.log(`  Start Time (Local): ${a.startTime.toString()}`);
    console.log(`  Status: ${a.status}`);
    console.log(`  Created At: ${a.createdAt.toISOString()}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
