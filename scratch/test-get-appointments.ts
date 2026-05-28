import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma";

async function main() {
  const appointments = await prisma.appointment.findMany({
    include: { service: true, staff: true, customer: true, userPackage: true },
    orderBy: { startTime: "asc" }
  });

  const targetDate = "2026-05-29";
  const filtered = appointments.filter((a) => {
    const d = new Date(a.startTime);
    const dateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Istanbul" });
    return dateStr === targetDate;
  });

  console.log(`Filtered appointments for ${targetDate}:`);
  for (const a of filtered) {
    console.log(`ID: ${a.id}`);
    console.log(`  Salon ID: ${a.salonId}`);
    console.log(`  Customer: ${a.customer.name}`);
    console.log(`  Staff: ${a.staff.name}`);
    console.log(`  Service: ${a.service.name}`);
    console.log(`  Start Time (JSON string): ${a.startTime.toISOString()}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
