// scripts/seed-tenant.ts
// Usage: npm run tenant:seed
// Optional: SEED_ADMIN_USERNAME=noor npm run tenant:seed
// Seeds rich Arabic demo data scoped to the salon owned by one admin.

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const targetAdminUsername = (process.env.SEED_ADMIN_USERNAME || process.env.ADMIN_USERNAME || "noor").trim();

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Add it to .env before running this script.");
}
if (!targetAdminUsername) {
  throw new Error("SEED_ADMIN_USERNAME or ADMIN_USERNAME is required.");
}

const pool = new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type ServiceKey =
  | "classicManicure"
  | "gelExtensions"
  | "pedicureDeluxe"
  | "laserFullBody"
  | "nailArt"
  | "facial"
  | "browsLashes";

type StaffKey = "owner" | "laser" | "nails" | "skin" | "reception";

const serviceSeeds: Array<{ key: ServiceKey; name: string; price: number; duration: number }> = [
  { key: "classicManicure", name: "مانيكير كلاسيكي", price: 120, duration: 35 },
  { key: "gelExtensions", name: "تركيب جل", price: 260, duration: 95 },
  { key: "pedicureDeluxe", name: "بديكير فاخر", price: 180, duration: 50 },
  { key: "laserFullBody", name: "ليزر - كامل الجسم", price: 1200, duration: 120 },
  { key: "nailArt", name: "رسم أظافر مخصص", price: 90, duration: 35 },
  { key: "facial", name: "تنظيف بشرة عميق", price: 350, duration: 70 },
  { key: "browsLashes", name: "حواجب ورموش", price: 220, duration: 55 },
];

const staffSeeds: Array<{ key: StaffKey; name: string; role: string; phone?: string; email?: string; notes?: string }> = [
  { key: "owner", name: "نورا السالم", role: "مديرة الصالون", phone: "05500000001", email: "noora@noorsalon.com", notes: "المالكة والمديرة العامة للصالون." },
  { key: "laser", name: "ريم الحربي", role: "أخصائية ليزر", phone: "05500000002", email: "reem@noorsalon.com", notes: "خبرة ٥ سنوات في أجهزة الديكا والجنتل ليزر." },
  { key: "nails", name: "لينا العتيبي", role: "خبيرة أظافر", phone: "05500000003", email: "lina@noorsalon.com", notes: "متخصصة في رسم الأظافر وتركيب الأكريليك والجل." },
  { key: "skin", name: "هبة الأنصاري", role: "أخصائية بشرة", phone: "05500000004", email: "heba@noorsalon.com", notes: "حاصلة على شهادة الـ CIDESCO للعناية بالبشرة." },
  { key: "reception", name: "جود القحطاني", role: "استقبال ومتابعة", phone: "05500000005", email: "joud@noorsalon.com", notes: "مسؤولة عن تنسيق المواعيد وخدمة العملاء." },
];

const customerSeeds = [
  { name: "سارة القحطاني", phone: "05510000001", notes: "تفضل المواعيد الصباحية وتحب الهدوء." },
  { name: "نورة الدوسري", phone: "05510000002", notes: "عميلة باقة شهرية، تفضل لينا." },
  { name: "مها الشمري", phone: "05510000003", notes: "حساسية بسيطة من العطور القوية." },
  { name: "هند الغامدي", phone: "05510000004", notes: "مهتمة بالعروض والباقات." },
  { name: "لمى الحربي", phone: "05510000005", notes: "تحتاج تذكير قبل الموعد بيوم." },
  { name: "ريم المطيري", phone: "05510000006", notes: "تفضل الدفع الإلكتروني." },
  { name: "جود العنزي", phone: "05510000007", notes: "مواعيد بعد العصر فقط." },
  { name: "أمل الزهراني", phone: "05510000008", notes: "زائرة جديدة من إنستغرام." },
  { name: "عبير المالكي", phone: "05510000009", notes: "تطلب لون جل هادئ دائماً." },
  { name: "دلال الشهري", phone: "05510000010", notes: "تراجع كل أسبوعين." },
  { name: "خلود اليامي", phone: "05510000011", notes: "تفضل أخصائية البشرة هبة." },
  { name: "بيان الحارثي", phone: "05510000012", notes: "تجربة أولى لخدمة الليزر." },
];

function appointmentDate(dayOffset: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function clearSalonData(salonId: string) {
  const packages = await prisma.userPackage.findMany({
    where: { salonId },
    select: { id: true },
  });
  const packageIds = packages.map((pkg) => pkg.id);

  if (packageIds.length > 0) {
    const deletedInstallments = await prisma.installment.deleteMany({
      where: { userPackageId: { in: packageIds } },
    });
    console.log(`Deleted installments: ${deletedInstallments.count}`);
  }

  const deletedAppointments = await prisma.appointment.deleteMany({ where: { salonId } });
  const deletedPackages = await prisma.userPackage.deleteMany({ where: { salonId } });
  const deletedCustomers = await prisma.customer.deleteMany({ where: { salonId } });
  const deletedStaff = await prisma.staff.deleteMany({ where: { salonId } });
  const deletedServices = await prisma.service.deleteMany({ where: { salonId } });

  console.log(`Deleted appointments: ${deletedAppointments.count}`);
  console.log(`Deleted packages: ${deletedPackages.count}`);
  console.log(`Deleted customers: ${deletedCustomers.count}`);
  console.log(`Deleted staff: ${deletedStaff.count}`);
  console.log(`Deleted services: ${deletedServices.count}`);
}

async function main() {
  const admin = await prisma.admin.findUnique({
    where: { username: targetAdminUsername },
    include: { salon: true },
  });

  if (!admin) {
    throw new Error(
      `Admin "${targetAdminUsername}" was not found. Create it first with ADMIN_USERNAME="${targetAdminUsername}" npm run admin:create.`
    );
  }

  const salon = await prisma.salon.update({
    where: { id: admin.salonId },
    data: { name: "Noor Salon", currency: "SAR" },
  });

  console.log(`Seeding Arabic demo data for ${salon.name} (${salon.id}) as admin "${admin.username}"...`);
  await clearSalonData(salon.id);

  const services = Object.fromEntries(
    await Promise.all(
      serviceSeeds.map(async (service) => {
        const created = await prisma.service.create({
          data: {
            name: service.name,
            price: service.price,
            duration: service.duration,
            salonId: salon.id,
          },
        });
        return [service.key, created] as const;
      })
    )
  ) as Record<ServiceKey, Awaited<ReturnType<typeof prisma.service.create>>>;

  const staff = Object.fromEntries(
    await Promise.all(
      staffSeeds.map(async (member) => {
        const created = await prisma.staff.create({
          data: {
            name: member.name,
            role: member.role,
            salonId: salon.id,
            phone: member.phone || null,
            email: member.email || null,
            notes: member.notes || null,
          },
        });
        return [member.key, created] as const;
      })
    )
  ) as Record<StaffKey, Awaited<ReturnType<typeof prisma.staff.create>>>;

  const customers = await Promise.all(
    customerSeeds.map((customer) =>
      prisma.customer.create({
        data: {
          ...customer,
          salonId: salon.id,
        },
      })
    )
  );

  const laserPackage = await prisma.userPackage.create({
    data: {
      name: "باقة ليزر كامل الجسم — 6 جلسات",
      totalSessions: 6,
      remainingSessions: 3,
      totalPrice: 4800,
      paidAmount: 2400,
      salonId: salon.id,
      customerId: customers[0].id,
      serviceId: services.laserFullBody.id,
    },
  });

  const manicurePackage = await prisma.userPackage.create({
    data: {
      name: "نادي المانيكير الشهري — 4 جلسات",
      totalSessions: 4,
      remainingSessions: 1,
      totalPrice: 640,
      paidAmount: 480,
      salonId: salon.id,
      customerId: customers[1].id,
      serviceId: services.classicManicure.id,
    },
  });

  const browsPackage = await prisma.userPackage.create({
    data: {
      name: "باقة الحواجب والرموش — 3 جلسات",
      totalSessions: 3,
      remainingSessions: 0,
      totalPrice: 660,
      paidAmount: 660,
      salonId: salon.id,
      customerId: customers[2].id,
      serviceId: services.browsLashes.id,
    },
  });

  const facialPackage = await prisma.userPackage.create({
    data: {
      name: "باقة نضارة البشرة — 5 جلسات",
      totalSessions: 5,
      remainingSessions: 4,
      totalPrice: 1500,
      paidAmount: 350,
      salonId: salon.id,
      customerId: customers[10].id,
      serviceId: services.facial.id,
    },
  });

  await prisma.installment.createMany({
    data: [
      { userPackageId: laserPackage.id, amount: 800, note: "الدفعة المقدمة" },
      { userPackageId: laserPackage.id, amount: 800, note: "القسط الأول" },
      { userPackageId: laserPackage.id, amount: 800, note: "دفعة متابعة" },
      { userPackageId: manicurePackage.id, amount: 160, note: "الدفعة المقدمة" },
      { userPackageId: manicurePackage.id, amount: 160, note: "القسط الأول" },
      { userPackageId: manicurePackage.id, amount: 160, note: "القسط الثاني" },
      { userPackageId: browsPackage.id, amount: 660, note: "تم الدفع بالكامل" },
      { userPackageId: facialPackage.id, amount: 350, note: "تم الدفع عند الحجز" },
    ],
  });

  const appointments: Array<{
    customerIndex: number;
    serviceKey: ServiceKey;
    staffKey: StaffKey;
    dayOffset: number;
    hour: number;
    minute?: number;
    status: "COMPLETED" | "CANCELLED" | "SCHEDULED";
    price?: number;
    packageId?: string;
    notes?: string;
  }> = [
    { customerIndex: 0, serviceKey: "laserFullBody", staffKey: "laser", dayOffset: -24, hour: 10, status: "COMPLETED", price: 800, packageId: laserPackage.id, notes: "جلسة أولى ضمن باقة الليزر." },
    { customerIndex: 0, serviceKey: "laserFullBody", staffKey: "laser", dayOffset: -15, hour: 11, status: "COMPLETED", price: 800, packageId: laserPackage.id, notes: "استجابة ممتازة بعد الجلسة السابقة." },
    { customerIndex: 0, serviceKey: "laserFullBody", staffKey: "laser", dayOffset: -6, hour: 12, status: "COMPLETED", price: 800, packageId: laserPackage.id, notes: "تأكيد موعد المتابعة بعد أربعة أسابيع." },
    { customerIndex: 1, serviceKey: "classicManicure", staffKey: "nails", dayOffset: -20, hour: 13, status: "COMPLETED", price: 160, packageId: manicurePackage.id, notes: "لون وردي هادئ." },
    { customerIndex: 1, serviceKey: "classicManicure", staffKey: "nails", dayOffset: -12, hour: 14, status: "COMPLETED", price: 160, packageId: manicurePackage.id, notes: "تم إصلاح ظفر مكسور." },
    { customerIndex: 1, serviceKey: "classicManicure", staffKey: "nails", dayOffset: -4, hour: 15, status: "COMPLETED", price: 160, packageId: manicurePackage.id, notes: "اختارت لون بيج." },
    { customerIndex: 2, serviceKey: "browsLashes", staffKey: "skin", dayOffset: -18, hour: 16, status: "COMPLETED", price: 220, packageId: browsPackage.id, notes: "تنظيف وترتيب خفيف." },
    { customerIndex: 2, serviceKey: "browsLashes", staffKey: "skin", dayOffset: -10, hour: 17, status: "COMPLETED", price: 220, packageId: browsPackage.id, notes: "تثبيت رموش طبيعي." },
    { customerIndex: 2, serviceKey: "browsLashes", staffKey: "skin", dayOffset: -2, hour: 18, status: "COMPLETED", price: 220, packageId: browsPackage.id, notes: "الباقة مكتملة." },
    { customerIndex: 10, serviceKey: "facial", staffKey: "skin", dayOffset: -3, hour: 10, status: "COMPLETED", price: 300, packageId: facialPackage.id, notes: "جلسة تنظيف عميق أولى." },
    { customerIndex: 0, serviceKey: "laserFullBody", staffKey: "laser", dayOffset: 8, hour: 11, status: "SCHEDULED", price: 800, packageId: laserPackage.id, notes: "جلسة قادمة ضمن الباقة." },
    { customerIndex: 1, serviceKey: "classicManicure", staffKey: "nails", dayOffset: 5, hour: 16, status: "SCHEDULED", price: 160, packageId: manicurePackage.id, notes: "الجلسة الأخيرة، يلزم تسوية الرصيد." },
    { customerIndex: 10, serviceKey: "facial", staffKey: "skin", dayOffset: 9, hour: 13, status: "SCHEDULED", price: 300, packageId: facialPackage.id, notes: "الجلسة الثانية من باقة البشرة." },
    { customerIndex: 3, serviceKey: "gelExtensions", staffKey: "nails", dayOffset: -1, hour: 10, status: "COMPLETED", notes: "تصميم فرنسي ناعم." },
    { customerIndex: 4, serviceKey: "pedicureDeluxe", staffKey: "nails", dayOffset: 0, hour: 9, status: "COMPLETED", notes: "موعد صباحي للعرض في لوحة التحكم." },
    { customerIndex: 5, serviceKey: "facial", staffKey: "skin", dayOffset: 0, hour: 11, status: "SCHEDULED", notes: "تأكيد قبل الموعد بساعتين." },
    { customerIndex: 6, serviceKey: "gelExtensions", staffKey: "nails", dayOffset: 0, hour: 14, status: "CANCELLED", notes: "اعتذرت العميلة بسبب ظرف طارئ." },
    { customerIndex: 7, serviceKey: "laserFullBody", staffKey: "laser", dayOffset: 1, hour: 10, status: "SCHEDULED", notes: "استشارة أولى قبل الليزر." },
    { customerIndex: 8, serviceKey: "nailArt", staffKey: "nails", dayOffset: 1, hour: 15, status: "SCHEDULED", notes: "تصميم للمناسبة." },
    { customerIndex: 9, serviceKey: "classicManicure", staffKey: "nails", dayOffset: 2, hour: 17, status: "SCHEDULED", notes: "زيارة دورية." },
    { customerIndex: 11, serviceKey: "laserFullBody", staffKey: "laser", dayOffset: 3, hour: 12, status: "SCHEDULED", notes: "تجربة أولى لخدمة الليزر." },
  ];

  // Generate 120 versatile appointments dynamically
  const arabicNotes = [
    "جلسة اعتيادية مع التركيز على الترطيب.",
    "تفضل عميلة الألوان الهادئة.",
    "متابعة دورية ممتازة.",
    "تحب استخدام المواد الخالية من المعطرات.",
    "موعد سريع ومنظم.",
    "ملاحظة: تفضل فنجان قهوة عند الوصول.",
    "حجزت عن طريق تطبيق الهاتف.",
    "تحتاج تذكير بالرسائل النصية.",
    "أبدت رضاها الكبير عن الخدمة السابقة.",
    "تفضل أخصائية معينة دائماً."
  ];

  const arabicCancellationNotes = [
    "اعتذرت العميلة بسبب ظرف عائلي مفاجئ.",
    "تم الإلغاء لعدم إمكانية الحضور وتأجيل الموعد.",
    "العميلة خارج المدينة حالياً.",
    "تغيير خطط السفر.",
    "إلغاء بسبب طارئ صحي بسيط."
  ];

  for (let i = 0; i < 120; i++) {
    let dayOffset = 0;
    let status: "COMPLETED" | "CANCELLED" | "SCHEDULED" = "SCHEDULED";

    if (i < 95) {
      dayOffset = -45 + (i % 45);
      status = (i % 10 === 0) ? "CANCELLED" : "COMPLETED";
    } else {
      dayOffset = 1 + (i % 15);
      status = "SCHEDULED";
    }

    const serviceSeedsKeys = serviceSeeds.map(s => s.key);
    const serviceKey = serviceSeedsKeys[i % serviceSeedsKeys.length];

    const staffSeedsKeys = staffSeeds.map(s => s.key);
    const staffKey = staffSeedsKeys[(i + 2) % staffSeedsKeys.length];

    const hour = 9 + (i % 11);
    const minute = (i % 3 === 0) ? 30 : 0;

    const notes = status === "CANCELLED"
      ? arabicCancellationNotes[i % arabicCancellationNotes.length]
      : arabicNotes[i % arabicNotes.length];

    appointments.push({
      customerIndex: i % customers.length,
      serviceKey,
      staffKey,
      dayOffset,
      hour,
      minute,
      status,
      notes,
    });
  }

  let completedIndex = 0;
  await prisma.appointment.createMany({
    data: appointments.map((appointment) => {
      const service = services[appointment.serviceKey];
      const member = staff[appointment.staffKey];
      const paymentMethod = appointment.status === "COMPLETED"
        ? (completedIndex++ % 2 === 0 ? "CASH" : "CARD")
        : null;
      return {
        startTime: appointmentDate(appointment.dayOffset, appointment.hour, appointment.minute ?? 0),
        customerId: customers[appointment.customerIndex].id,
        serviceId: service.id,
        staffId: member.id,
        salonId: salon.id,
        priceAtBooking: appointment.price ?? service.price,
        userPackageId: appointment.packageId ?? null,
        status: appointment.status,
        notes: appointment.notes ?? null,
        paymentMethod,
      };
    }),
  });

  console.log("Arabic demo seed completed.");
  console.log(`Salon: ${salon.name}`);
  console.log(`Admin: ${admin.username}`);
  console.log(`Currency: ${salon.currency}`);
  console.log(`Services: ${serviceSeeds.length}`);
  console.log(`Staff: ${staffSeeds.length}`);
  console.log(`Customers: ${customerSeeds.length}`);
  console.log("Packages: 4");
  console.log(`Appointments: ${appointments.length}`);
}

main()
  .catch((error) => {
    console.error("Error seeding tenant database:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
