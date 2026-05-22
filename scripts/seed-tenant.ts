// scripts/seed-tenant.ts
// Usage: npx tsx scripts/seed-tenant.ts
// Seeds mock data scoped to a single salon ID safely.

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const targetSalonId = "cmp8ylsy10000xwjeokaaxhya"; // Scoped salonId

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Add it to .env before running this script.");
}

const pool = new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`Starting database seed for salon: ${targetSalonId}...`);

  // Verify that the Salon exists
  const salon = await prisma.salon.findUnique({
    where: { id: targetSalonId },
  });
  if (!salon) {
    throw new Error(`Salon with ID "${targetSalonId}" not found in database.`);
  }

  console.log(`Found salon: "${salon.name}". Cleaning up existing tenant data...`);

  // 1. Clean existing data for this salon ONLY
  const packages = await prisma.userPackage.findMany({
    where: { salonId: targetSalonId },
    select: { id: true },
  });
  const packageIds = packages.map((p) => p.id);

  if (packageIds.length > 0) {
    const deletedInstallments = await prisma.installment.deleteMany({
      where: { userPackageId: { in: packageIds } },
    });
    console.log(`Deleted ${deletedInstallments.count} installments.`);
  }

  const deletedAppointments = await prisma.appointment.deleteMany({ where: { salonId: targetSalonId } });
  console.log(`Deleted ${deletedAppointments.count} appointments.`);

  const deletedPackages = await prisma.userPackage.deleteMany({ where: { salonId: targetSalonId } });
  console.log(`Deleted ${deletedPackages.count} packages.`);

  const deletedCustomers = await prisma.customer.deleteMany({ where: { salonId: targetSalonId } });
  console.log(`Deleted ${deletedCustomers.count} customers.`);

  const deletedStaff = await prisma.staff.deleteMany({ where: { salonId: targetSalonId } });
  console.log(`Deleted ${deletedStaff.count} staff.`);

  const deletedServices = await prisma.service.deleteMany({ where: { salonId: targetSalonId } });
  console.log(`Deleted ${deletedServices.count} services.`);

  // 2. Seed 5 Services
  console.log("Seeding services...");
  const services = await Promise.all([
    prisma.service.create({ data: { name: "Classic Manicure", price: 60, duration: 30, salonId: targetSalonId } }),
    prisma.service.create({ data: { name: "Gel Extensions", price: 120, duration: 90, salonId: targetSalonId } }),
    prisma.service.create({ data: { name: "Pedicure Deluxe", price: 90, duration: 45, salonId: targetSalonId } }),
    prisma.service.create({ data: { name: "Laser - Full Body", price: 1200, duration: 120, salonId: targetSalonId } }),
    prisma.service.create({ data: { name: "Nail Art Custom", price: 40, duration: 30, salonId: targetSalonId } }),
  ]);

  // 3. Seed 4 Staff Members
  console.log("Seeding staff...");
  const staff = await Promise.all([
    prisma.staff.create({ data: { name: "Lamees Bahaa", role: "Owner", salonId: targetSalonId } }),
    prisma.staff.create({ data: { name: "Sara Ahmed", role: "Senior Technician", salonId: targetSalonId } }),
    prisma.staff.create({ data: { name: "Nour Hassan", role: "Technician", salonId: targetSalonId } }),
    prisma.staff.create({ data: { name: "Zeynep Kaya", role: "Junior Technician", salonId: targetSalonId } }),
  ]);

  // 4. Seed 15 Customers (Turkish phone format 05XXXXXXXXX)
  console.log("Seeding customers...");
  const customerNames = [
    "Aisha Malik", "Fatma Demir", "Emel Can", "Leyla Yıldız", "Meryem Aksoy",
    "Selma Öztürk", "Hülya Arslan", "Gül Şahin", "Derya Aydın", "Buse Koç",
    "Arzu Kurt", "Sibel Özdemir", "Nalan Yılmaz", "Pelin Polat", "Selin Kılıç"
  ];

  const customers = await Promise.all(
    customerNames.map((name, i) =>
      prisma.customer.create({
        data: { name, phone: `05${(555000000 + i).toString()}`, salonId: targetSalonId }
      })
    )
  );

  // 5. Create Packages for some customers
  console.log("Seeding packages...");
  const laserService = services.find(s => s.name === "Laser - Full Body")!;
  const activePackages = await Promise.all([
    prisma.userPackage.create({
      data: {
        name: "Laser Package 6 Sessions",
        totalSessions: 6,
        remainingSessions: 4,
        totalPrice: 4800,
        paidAmount: 1600,
        salonId: targetSalonId,
        customerId: customers[0].id,
        serviceId: laserService.id,
      }
    }),
    prisma.userPackage.create({
      data: {
        name: "Monthly Manicure Club",
        totalSessions: 4,
        remainingSessions: 2,
        totalPrice: 200,
        paidAmount: 100,
        salonId: targetSalonId,
        customerId: customers[1].id,
        serviceId: services[0].id,
      }
    })
  ]);

  // 6. Seed Installments for those packages
  console.log("Seeding installments...");
  await prisma.installment.createMany({
    data: [
      { amount: 800, note: "Down Payment", userPackageId: activePackages[0].id },
      { amount: 800, note: "Installment 1", userPackageId: activePackages[0].id },
      { amount: 100, note: "First Month", userPackageId: activePackages[1].id },
    ]
  });

  // 7. Generate appointments spread out over the last 15 days and next 7 days
  console.log("Generating appointments...");
  const statuses = ["COMPLETED", "SCHEDULED", "CANCELLED"];
  const appointmentsData = [];
  const now = new Date();

  // Create 60 appointments to ensure rich dashboard visualization (charts, heatmap, trends)
  for (let i = 0; i < 60; i++) {
    const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
    const randomStaff = staff[Math.floor(Math.random() * staff.length)];
    const randomService = services[Math.floor(Math.random() * services.length)];
    
    const date = new Date();
    // Distribute randomly between -14 days and +7 days
    const dayOffset = Math.floor(Math.random() * 22) - 14; 
    date.setDate(now.getDate() + dayOffset);
    
    // Operating hours 09:00 - 20:00. Weekdays: Mon-Sat
    const randomHour = 9 + Math.floor(Math.random() * 11);
    date.setHours(randomHour, 0, 0, 0);

    // Skip Sundays for realistic booking patterns
    if (date.getDay() === 0) {
      date.setDate(date.getDate() + 1); // shift to Monday
    }

    let status = "COMPLETED";
    if (date > now) {
      status = "SCHEDULED";
    } else {
      // Past appointments: 80% completed, 20% cancelled
      status = Math.random() > 0.2 ? "COMPLETED" : "CANCELLED";
    }

    const usePackage = randomCustomer.id === customers[0].id && randomService.id === laserService.id;

    appointmentsData.push({
      startTime: date,
      customerId: randomCustomer.id,
      serviceId: randomService.id,
      staffId: randomStaff.id,
      salonId: targetSalonId,
      priceAtBooking: usePackage ? 0 : randomService.price,
      userPackageId: usePackage ? activePackages[0].id : null,
      status: status,
    });
  }

  await prisma.appointment.createMany({ data: appointmentsData });

  console.log("Seeding successfully completed!");
  console.log(`Scoping Results for Salon ID: "${targetSalonId}":`);
  console.log(` - Services Created    : 5`);
  console.log(` - Staff Members Created: 4`);
  console.log(` - Customers Seeded     : 15`);
  console.log(` - Packages Configured  : 2`);
  console.log(` - Appointments Scrambled: 60`);
}

main()
  .catch((e) => {
    console.error("Error seeding tenant database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
