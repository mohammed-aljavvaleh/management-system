import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new   PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean slate
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.staff.deleteMany();

  // Services
  const manicure = await prisma.service.create({
    data: { name: "Classic Manicure", price: 25, duration: 30 },
  });
  const gel = await prisma.service.create({
    data: { name: "Gel Manicure", price: 40, duration: 45 },
  });
  const pedicure = await prisma.service.create({
    data: { name: "Classic Pedicure", price: 35, duration: 45 },
  });
  const nailArt = await prisma.service.create({
    data: { name: "Nail Art", price: 15, duration: 20 },
  });
  const acrylic = await prisma.service.create({
    data: { name: "Acrylic Full Set", price: 65, duration: 90 },
  });

  console.log("Services created");

  // Staff
  const lamees = await prisma.staff.create({
    data: { name: "Lamees Al-Rashid", role: "Owner" },
  });
  const sara = await prisma.staff.create({
    data: { name: "Sara Ahmed", role: "Senior Technician" },
  });
  const nour = await prisma.staff.create({
    data: { name: "Nour Hassan", role: "Technician" },
  });

  console.log("Staff created");

  // Appointments — today and nearby dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function apptTime(dayOffset: number, hour: number, minute = 0) {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  await prisma.appointment.createMany({
    data: [
      // Today
      {
        customerName: "Aisha Malik",
        customerEmail: "aisha@example.com",
        startTime: apptTime(0, 9, 0),
        serviceId: manicure.id,
        staffId: sara.id,
        status: "COMPLETED",
      },
      {
        customerName: "Reem Al-Farsi",
        customerEmail: "reem@example.com",
        startTime: apptTime(0, 10, 30),
        serviceId: gel.id,
        staffId: lamees.id,
        status: "COMPLETED",
      },
      {
        customerName: "Dana Khalid",
        startTime: apptTime(0, 13, 0),
        serviceId: pedicure.id,
        staffId: nour.id,
        status: "SCHEDULED",
      },
      {
        customerName: "Lina Saeed",
        customerEmail: "lina@example.com",
        startTime: apptTime(0, 14, 30),
        serviceId: acrylic.id,
        staffId: lamees.id,
        status: "SCHEDULED",
      },
      {
        customerName: "Hessa Nasser",
        startTime: apptTime(0, 16, 0),
        serviceId: nailArt.id,
        staffId: sara.id,
        status: "CANCELLED",
      },

      // Yesterday
      {
        customerName: "Mona Hassan",
        customerEmail: "mona@example.com",
        startTime: apptTime(-1, 10, 0),
        serviceId: gel.id,
        staffId: sara.id,
        status: "COMPLETED",
      },
      {
        customerName: "Fatima Al-Ali",
        startTime: apptTime(-1, 11, 30),
        serviceId: manicure.id,
        staffId: nour.id,
        status: "COMPLETED",
      },
      {
        customerName: "Sara Al-Mutairi",
        startTime: apptTime(-1, 14, 0),
        serviceId: pedicure.id,
        staffId: lamees.id,
        status: "COMPLETED",
      },

      // 2 days ago
      {
        customerName: "Noura Ahmed",
        customerEmail: "noura@example.com",
        startTime: apptTime(-2, 9, 30),
        serviceId: acrylic.id,
        staffId: lamees.id,
        status: "COMPLETED",
      },
      {
        customerName: "Wafa Al-Rashid",
        startTime: apptTime(-2, 13, 0),
        serviceId: gel.id,
        staffId: sara.id,
        status: "COMPLETED",
      },

      // 3 days ago
      {
        customerName: "Basma Yousef",
        startTime: apptTime(-3, 10, 0),
        serviceId: nailArt.id,
        staffId: nour.id,
        status: "COMPLETED",
      },
      {
        customerName: "Hana Al-Dosari",
        customerEmail: "hana@example.com",
        startTime: apptTime(-3, 15, 0),
        serviceId: manicure.id,
        staffId: sara.id,
        status: "COMPLETED",
      },

      // Tomorrow
      {
        customerName: "Rawan Al-Otaibi",
        customerEmail: "rawan@example.com",
        startTime: apptTime(1, 10, 0),
        serviceId: gel.id,
        staffId: sara.id,
        status: "SCHEDULED",
      },
      {
        customerName: "Manal Hamdan",
        startTime: apptTime(1, 12, 0),
        serviceId: pedicure.id,
        staffId: nour.id,
        status: "SCHEDULED",
      },
      {
        customerName: "Dalal Al-Shammari",
        startTime: apptTime(1, 14, 30),
        serviceId: acrylic.id,
        staffId: lamees.id,
        status: "SCHEDULED",
      },

      // Day after tomorrow
      {
        customerName: "Shahad Bilal",
        customerEmail: "shahad@example.com",
        startTime: apptTime(2, 11, 0),
        serviceId: manicure.id,
        staffId: nour.id,
        status: "SCHEDULED",
      },
      {
        customerName: "Nadia Al-Rashidi",
        startTime: apptTime(2, 13, 30),
        serviceId: gel.id,
        staffId: lamees.id,
        status: "SCHEDULED",
      },
    ],
  });

  console.log("Appointments created");
  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });