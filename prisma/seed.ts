import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting full database seed...");

  const salon = await prisma.salon.upsert({
    where: { id: "salon_default" },
    update: { name: "Lamees Nail Salon" },
    create: { id: "salon_default", name: "Lamees Nail Salon" },
  });

  // 1. Clean existing data
  await prisma.installment.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.userPackage.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.service.deleteMany();

  // 2. Seed 5 Services
  const services = await Promise.all([
    prisma.service.create({ data: { name: "Classic Manicure", price: 30, duration: 30, salonId: salon.id } }),
    prisma.service.create({ data: { name: "Gel Extensions", price: 60, duration: 90, salonId: salon.id } }),
    prisma.service.create({ data: { name: "Pedicure Deluxe", price: 45, duration: 45, salonId: salon.id } }),
    prisma.service.create({ data: { name: "Laser - Full Body", price: 1500, duration: 120, salonId: salon.id } }),
    prisma.service.create({ data: { name: "Nail Art Custom", price: 20, duration: 30, salonId: salon.id } }),
  ]);

  // 3. Seed 4 Staff Members
  const staff = await Promise.all([
    prisma.staff.create({ data: { name: "Lamees Bahaa", role: "Owner", salonId: salon.id } }),
    prisma.staff.create({ data: { name: "Sara Ahmed", role: "Senior Technician", salonId: salon.id } }),
    prisma.staff.create({ data: { name: "Nour Hassan", role: "Technician", salonId: salon.id } }),
    prisma.staff.create({ data: { name: "Zeynep Kaya", role: "Junior Technician", salonId: salon.id } }),
  ]);

  // 4. Seed 15 Customers (Turkish phone format 05XXXXXXXXX)
  const customerNames = [
    "Aisha Malik", "Fatma Demir", "Emel Can", "Leyla Yıldız", "Meryem Aksoy",
    "Selma Öztürk", "Hülya Arslan", "Gül Şahin", "Derya Aydın", "Buse Koç",
    "Arzu Kurt", "Sibel Özdemir", "Nalan Yılmaz", "Pelin Polat", "Selin Kılıç"
  ];

  const customers = await Promise.all(
    customerNames.map((name, i) =>
      prisma.customer.create({
        data: { name, phone: `05${(555000000 + i).toString()}`, salonId: salon.id }
      })
    )
  );

  // 5. Create Packages for some customers
  const laserService = services.find(s => s.name === "Laser - Full Body")!;
  const activePackages = await Promise.all([
    prisma.userPackage.create({
      data: {
        name: "Laser Package 6 Sessions",
        totalSessions: 6,
        remainingSessions: 4,
        totalPrice: 1200,
        paidAmount: 400,
        salonId: salon.id,
        customerId: customers[0].id,
        serviceId: laserService.id,
      }
    }),
    prisma.userPackage.create({
      data: {
        name: "Monthly Manicure Club",
        totalSessions: 4,
        remainingSessions: 2,
        totalPrice: 100,
        paidAmount: 50,
        salonId: salon.id,
        customerId: customers[1].id,
        serviceId: services[0].id,
      }
    })
  ]);

  // 6. Seed Installments for those packages
  await prisma.installment.createMany({
    data: [
      { amount: 200, note: "Down Payment", userPackageId: activePackages[0].id },
      { amount: 200, note: "Installment 1", userPackageId: activePackages[0].id },
      { amount: 50, note: "First Month", userPackageId: activePackages[1].id },
    ]
  });

  // 7. Generate scrambled Appointments
  const statuses = ["COMPLETED", "SCHEDULED", "CANCELLED"];
  const appointmentsData = [];

  // Generate 40 random appointments over the last month and next month
  for (let i = 0; i < 40; i++) {
    const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
    const randomStaff = staff[Math.floor(Math.random() * staff.length)];
    const randomService = services[Math.floor(Math.random() * services.length)];
    
    const date = new Date();
    date.setDate(date.getDate() + (Math.floor(Math.random() * 60) - 30)); // -30 to +30 days
    date.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

    // If it's a past date, mostly set to COMPLETED or CANCELLED. If future, SCHEDULED.
    let status = statuses[Math.floor(Math.random() * statuses.length)];
    if (date > new Date()) status = "SCHEDULED";
    else if (status === "SCHEDULED") status = "COMPLETED";

    // Randomly link some to Aisha's Laser Package if the service matches
    const usePackage = randomCustomer.id === customers[0].id && randomService.id === laserService.id;

    appointmentsData.push({
      startTime: date,
      customerId: randomCustomer.id,
      serviceId: randomService.id,
      staffId: randomStaff.id,
      salonId: salon.id,
      priceAtBooking: usePackage ? 0 : randomService.price,
      userPackageId: usePackage ? activePackages[0].id : null,
      status: status,
    });
  }

  await prisma.appointment.createMany({ data: appointmentsData });

  console.log("Seeding complete! 15 Customers, 4 Staff, 5 Services, and 40 scrambled appointments created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
