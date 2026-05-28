import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma";

async function main() {
  const appts = await prisma.appointment.findMany({
    where: {
      customer: { name: "Selin Koç" },
      staff: { name: "Elif Yıldız" },
      service: { name: "Nail Art Tasarım" },
      startTime: {
        gte: new Date("2026-05-29T00:00:00Z"),
        lte: new Date("2026-05-29T23:59:59Z")
      }
    },
    include: { service: true, staff: true, customer: true }
  });

  console.log(`Found ${appts.length} matching appointments:`);
  for (const a of appts) {
    console.log(`ID: ${a.id}`);
    console.log(`  Start Time (UTC): ${a.startTime.toISOString()}`);
    console.log(`  Start Time (Local): ${a.startTime.toString()}`);
    console.log(`  Notes: ${a.notes}`);
    console.log(`  Status: ${a.status}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
