// scripts/seed-tenant.ts
// Usage: npm run tenant:seed
// Optional: SEED_ADMIN_USERNAME=noor npm run tenant:seed
// Seeds rich demo data scoped to the salon owned by one admin.

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

const isTurkish = targetAdminUsername === "moha";

const serviceSeeds: Array<{ key: ServiceKey; name: string; price: number; duration: number }> = isTurkish ? [
  { key: "classicManicure", name: "Klasik Manikür", price: 300, duration: 35 },
  { key: "gelExtensions", name: "Jel Protez Tırnak", price: 800, duration: 95 },
  { key: "pedicureDeluxe", name: "Medikal Pedikür", price: 450, duration: 50 },
  { key: "laserFullBody", name: "Tüm Vücut Lazer", price: 2500, duration: 120 },
  { key: "nailArt", name: "Nail Art Tasarım", price: 200, duration: 35 },
  { key: "facial", name: "Derin Cilt Bakımı", price: 900, duration: 70 },
  { key: "browsLashes", name: "Kaş & Kirpik Tasarım", price: 600, duration: 55 },
] : [
  { key: "classicManicure", name: "مانيكير كلاسيكي", price: 120, duration: 35 },
  { key: "gelExtensions", name: "تركيب جل", price: 260, duration: 95 },
  { key: "pedicureDeluxe", name: "بديكير فاخر", price: 180, duration: 50 },
  { key: "laserFullBody", name: "ليزر - كامل الجسم", price: 1200, duration: 120 },
  { key: "nailArt", name: "رسم أظافر مخصص", price: 90, duration: 35 },
  { key: "facial", name: "تنظيف بشرة عميق", price: 350, duration: 70 },
  { key: "browsLashes", name: "حواجب ورموش", price: 220, duration: 55 },
];

const staffSeeds: Array<{ key: StaffKey; name: string; role: string; phone?: string; email?: string; notes?: string }> = isTurkish ? [
  { key: "owner", name: "Muhammed Kaya", role: "Salon Müdürü", phone: "05300000001", email: "muhammed@mohasalon.com", notes: "Salon sahibi ve müdürü." },
  { key: "laser", name: "Zeynep Demir", role: "Lazer Uzmanı", phone: "05300000002", email: "zeynep@mohasalon.com", notes: "Lazer cihazları konusunda 5 yıllık deneyim." },
  { key: "nails", name: "Elif Yıldız", role: "Tırnak Teknisyeni", phone: "05300000003", email: "elif@mohasalon.com", notes: "Nail art ve protez tırnak uzmanı." },
  { key: "skin", name: "Merve Aydın", role: "Cilt Bakım Uzmanı", phone: "05300000004", email: "merve@mohasalon.com", notes: "Cilt analizi ve bakımı uzmanı." },
  { key: "reception", name: "Canan Yılmaz", role: "Resepsiyonist", phone: "05300000005", email: "canan@mohasalon.com", notes: "Randevu koordinasyonu ve müşteri ilişkileri." },
] : [
  { key: "owner", name: "نورا السالم", role: "مديرة الصالون", phone: "05500000001", email: "noora@noorsalon.com", notes: "المالكة والمديرة العامة للصالون." },
  { key: "laser", name: "ريم الحربي", role: "أخصائية ليزر", phone: "05500000002", email: "reem@noorsalon.com", notes: "خبرة ٥ سنوات في أجهزة الديكا والجنتل ليزر." },
  { key: "nails", name: "لينا العتيبي", role: "خبيرة أظافر", phone: "05500000003", email: "lina@noorsalon.com", notes: "متخصصة في رسم الأظافر وتركيب الأكريليك والجل." },
  { key: "skin", name: "هبة الأنصاري", role: "أخصائية بشرة", phone: "05500000004", email: "heba@noorsalon.com", notes: "حاصلة على شهادة الـ CIDESCO للعناية بالبشرة." },
  { key: "reception", name: "جود القحطاني", role: "استقبال ومتابعة", phone: "05500000005", email: "joud@noorsalon.com", notes: "مسؤولة عن تنسيق المواعيد وخدمة العملاء." },
];

const customerSeeds = isTurkish ? [
  { name: "Fatma Çelik", phone: "05410000001", notes: "Sabah saatlerini tercih ediyor." },
  { name: "Ayşe Yılmaz", phone: "05410000002", notes: "Aylık paket üyesi." },
  { name: "Hatice Kaya", phone: "05410000003", notes: "Parfümlü ürünlere alerjisi var." },
  { name: "Emine Demir", phone: "05410000004", notes: "Paket ve kampanyalarla ilgileniyor." },
  { name: "İrem Şahin", phone: "05410000005", notes: "Randevudan 1 gün önce hatırlatma istiyor." },
  { name: "Zehra Öztürk", phone: "05410000006", notes: "Kartla ödeme tercih ediyor." },
  { name: "Leyla Can", phone: "05410000007", notes: "Öğleden sonra randevuları tercih ediyor." },
  { name: "Gamze Kurt", phone: "05410000008", notes: "Instagram'dan gelen yeni müşteri." },
  { name: "Selin Koç", phone: "05410000009", notes: "Sade renkleri tercih ediyor." },
  { name: "Büşra Polat", phone: "05410000010", notes: "2 haftada bir geliyor." },
  { name: "Dilan Aydın", phone: "05410000011", notes: "Cilt bakım uzmanı Merve'yi tercih ediyor." },
  { name: "Aslı Arslan", phone: "05410000012", notes: "Lazer hizmetini ilk kez deniyor." },
] : [
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
    data: { 
      name: isTurkish ? "Moha Güzellik Salonu" : "Noor Salon", 
      currency: isTurkish ? "TRY" : "SAR" 
    },
  });

  console.log(`Seeding ${isTurkish ? "Turkish" : "Arabic"} demo data for ${salon.name} (${salon.id}) as admin "${admin.username}"...`);
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
      name: isTurkish ? "Tüm Vücut Lazer — 6 Seans" : "باقة ليزر كامل الجسم — 6 جلسات",
      totalSessions: 6,
      remainingSessions: 3,
      totalPrice: isTurkish ? 10000 : 4800,
      paidAmount: isTurkish ? 5000 : 2400,
      salonId: salon.id,
      customerId: customers[0].id,
      serviceId: services.laserFullBody.id,
    },
  });

  const manicurePackage = await prisma.userPackage.create({
    data: {
      name: isTurkish ? "Aylık Manikür Kulübü — 4 Seans" : "نادي المانيكير الشهري — 4 جلسات",
      totalSessions: 4,
      remainingSessions: 1,
      totalPrice: isTurkish ? 1000 : 640,
      paidAmount: isTurkish ? 750 : 480,
      salonId: salon.id,
      customerId: customers[1].id,
      serviceId: services.classicManicure.id,
    },
  });

  const browsPackage = await prisma.userPackage.create({
    data: {
      name: isTurkish ? "Kaş & Kirpik Tasarım — 3 Seans" : "باقة الحواجب والرموش — 3 جلسات",
      totalSessions: 3,
      remainingSessions: 0,
      totalPrice: isTurkish ? 1500 : 660,
      paidAmount: isTurkish ? 1500 : 660,
      salonId: salon.id,
      customerId: customers[2].id,
      serviceId: services.browsLashes.id,
    },
  });

  const facialPackage = await prisma.userPackage.create({
    data: {
      name: isTurkish ? "Cilt Yenileme Paketi — 5 Seans" : "باقة نضارة البشرة — 5 جلسات",
      totalSessions: 5,
      remainingSessions: 4,
      totalPrice: isTurkish ? 3500 : 1500,
      paidAmount: isTurkish ? 700 : 350,
      salonId: salon.id,
      customerId: customers[10].id,
      serviceId: services.facial.id,
    },
  });

  await prisma.installment.createMany({
    data: [
      { userPackageId: laserPackage.id, amount: isTurkish ? 1666.67 : 800, note: isTurkish ? "Peşinat" : "الدفعة المقدمة", paidAt: appointmentDate(-24, 12) },
      { userPackageId: laserPackage.id, amount: isTurkish ? 1666.67 : 800, note: isTurkish ? "1. Taksit" : "القسط الأول", paidAt: appointmentDate(-15, 12) },
      { userPackageId: laserPackage.id, amount: isTurkish ? 1666.66 : 800, note: isTurkish ? "Ara Ödeme" : "دفعة متابعة", paidAt: appointmentDate(-6, 12) },
      { userPackageId: manicurePackage.id, amount: isTurkish ? 250 : 160, note: isTurkish ? "Peşinat" : "الدفعة المقدمة", paidAt: appointmentDate(-20, 12) },
      { userPackageId: manicurePackage.id, amount: isTurkish ? 250 : 160, note: isTurkish ? "1. Taksit" : "القسط الأول", paidAt: appointmentDate(-12, 12) },
      { userPackageId: manicurePackage.id, amount: isTurkish ? 250 : 160, note: isTurkish ? "2. Taksit" : "القسط الثاني", paidAt: appointmentDate(-4, 12) },
      { userPackageId: browsPackage.id, amount: isTurkish ? 1500 : 660, note: isTurkish ? "Tamamı Ödendi" : "تم الدفع بالكامل", paidAt: appointmentDate(-18, 12) },
      { userPackageId: facialPackage.id, amount: isTurkish ? 700 : 350, note: isTurkish ? "Rezervasyonda Ödendi" : "تم الدفع عند الحجز", paidAt: appointmentDate(-3, 12) },
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
    { customerIndex: 0, serviceKey: "laserFullBody", staffKey: "laser", dayOffset: -24, hour: 10, status: "COMPLETED", price: isTurkish ? 1666.67 : 800, packageId: laserPackage.id, notes: isTurkish ? "Lazer paketinin ilk seansı tamamlandı." : "جلسة أولى ضمن باقة الليزر." },
    { customerIndex: 0, serviceKey: "laserFullBody", staffKey: "laser", dayOffset: -15, hour: 11, status: "COMPLETED", price: isTurkish ? 1666.67 : 800, packageId: laserPackage.id, notes: isTurkish ? "Önceki seansa göre harika sonuçlar." : "استجابة ممتازة بعد الجلسة السابقة." },
    { customerIndex: 0, serviceKey: "laserFullBody", staffKey: "laser", dayOffset: -6, hour: 12, status: "COMPLETED", price: isTurkish ? 1666.67 : 800, packageId: laserPackage.id, notes: isTurkish ? "4 seans randevusu onaylandı." : "تأكيد موعد المتابعة بعد أربعة أسابيع." },
    { customerIndex: 1, serviceKey: "classicManicure", staffKey: "nails", dayOffset: -20, hour: 13, status: "COMPLETED", price: isTurkish ? 250 : 160, packageId: manicurePackage.id, notes: isTurkish ? "Klasik manikür yapıldı." : "لون وردي هادئ." },
    { customerIndex: 1, serviceKey: "classicManicure", staffKey: "nails", dayOffset: -12, hour: 14, status: "COMPLETED", price: isTurkish ? 250 : 160, packageId: manicurePackage.id, notes: isTurkish ? "Kırık tırnak onarıldı." : "تم إصلاح ظفر مكسور." },
    { customerIndex: 1, serviceKey: "classicManicure", staffKey: "nails", dayOffset: -4, hour: 15, status: "COMPLETED", price: isTurkish ? 250 : 160, packageId: manicurePackage.id, notes: isTurkish ? "Nude ton tercih etti." : "اختارت لون بيج." },
    { customerIndex: 2, serviceKey: "browsLashes", staffKey: "skin", dayOffset: -18, hour: 16, status: "COMPLETED", price: isTurkish ? 500 : 220, packageId: browsPackage.id, notes: isTurkish ? "Hafif kaş alımı yapıldı." : "تنظيف وترتيب خفيف." },
    { customerIndex: 2, serviceKey: "browsLashes", staffKey: "skin", dayOffset: -10, hour: 17, status: "COMPLETED", price: isTurkish ? 500 : 220, packageId: browsPackage.id, notes: isTurkish ? "Doğal ipek kirpik uygulaması." : "تثبيت رموش طبيعي." },
    { customerIndex: 2, serviceKey: "browsLashes", staffKey: "skin", dayOffset: -2, hour: 18, status: "COMPLETED", price: isTurkish ? 500 : 220, packageId: browsPackage.id, notes: isTurkish ? "Paket tamamlandı." : "الباقة مكتملة." },
    { customerIndex: 10, serviceKey: "facial", staffKey: "skin", dayOffset: -3, hour: 10, status: "COMPLETED", price: isTurkish ? 700 : 300, packageId: facialPackage.id, notes: isTurkish ? "Derin cilt bakımı seansı tamamlandı." : "جلسة تنظيف عميق أولى." },
    { customerIndex: 0, serviceKey: "laserFullBody", staffKey: "laser", dayOffset: 8, hour: 11, status: "SCHEDULED", price: isTurkish ? 1666.67 : 800, packageId: laserPackage.id, notes: isTurkish ? "Paket kapsamındaki gelecek seans." : "جلسة قادمة ضمن الباقة." },
    { customerIndex: 1, serviceKey: "classicManicure", staffKey: "nails", dayOffset: 5, hour: 16, status: "SCHEDULED", price: isTurkish ? 250 : 160, packageId: manicurePackage.id, notes: isTurkish ? "Son seans, bakiye kapatılacak." : "الجلسة الأخيرة، يلزم تسوية الرصيد." },
    { customerIndex: 10, serviceKey: "facial", staffKey: "skin", dayOffset: 9, hour: 13, status: "SCHEDULED", price: isTurkish ? 700 : 300, packageId: facialPackage.id, notes: isTurkish ? "Cilt paketi 2. seansı." : "الجلسة الثانية من باقة البشرة." },
    { customerIndex: 3, serviceKey: "gelExtensions", staffKey: "nails", dayOffset: -1, hour: 10, status: "COMPLETED", notes: isTurkish ? "Fransız manikürü tasarımı yapıldı." : "تصميم فرنسي ناعم." },
    { customerIndex: 4, serviceKey: "pedicureDeluxe", staffKey: "nails", dayOffset: 0, hour: 9, status: "COMPLETED", notes: isTurkish ? "Kontrol panelinde görüntülenecek sabah randevusu." : "موعد صباحي للعرض في لوحة التحكم." },
    { customerIndex: 5, serviceKey: "facial", staffKey: "skin", dayOffset: 0, hour: 11, status: "SCHEDULED", notes: isTurkish ? "Randevudan 2 saat önce onay istendi." : "تأكيد قبل الموعد بساعتين." },
    { customerIndex: 6, serviceKey: "gelExtensions", staffKey: "nails", dayOffset: 0, hour: 14, status: "CANCELLED", notes: isTurkish ? "Müşteri acil bir durum nedeniyle iptal etti." : "اعتذرت العميلة بسبب ظرف طارئ." },
    { customerIndex: 7, serviceKey: "laserFullBody", staffKey: "laser", dayOffset: 1, hour: 10, status: "SCHEDULED", notes: isTurkish ? "İlk lazer seansı öncesi danışma." : "استشارة أولى قبل الليزر." },
    { customerIndex: 8, serviceKey: "nailArt", staffKey: "nails", dayOffset: 1, hour: 15, status: "SCHEDULED", notes: isTurkish ? "Özel gün tasarımı." : "تصميم للمناسبة." },
    { customerIndex: 9, serviceKey: "classicManicure", staffKey: "nails", dayOffset: 2, hour: 17, status: "SCHEDULED", notes: isTurkish ? "Düzenli randevu." : "زيارة دورية." },
    { customerIndex: 11, serviceKey: "laserFullBody", staffKey: "laser", dayOffset: 3, hour: 12, status: "SCHEDULED", notes: isTurkish ? "Lazer hizmetini ilk kez deniyor." : "تجربة أولى لخدمة الليزر." },
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

  const turkishNotes = [
    "Nemlendirici odaklı rutin seans.",
    "Müşteri soft renkleri tercih ediyor.",
    "Mükemmel düzenli takip seansı.",
    "Not: Parfümsüz ürünler kullanılmalıdır.",
    "Hızlı ve pratik seans.",
    "Not: Girişte sade kahve tercih ediyor.",
    "Mobil uygulama üzerinden randevu alındı.",
    "Randevu hatırlatma SMS'i istiyor.",
    "Önceki hizmetten son derece memnun kaldı.",
    "Her zaman aynı teknisyeni tercih ediyor."
  ];

  const arabicCancellationNotes = [
    "اعتذرت العميلة بسبب ظرف عائلي مفاجئ.",
    "تم الإلغاء لعدم إمكانية الحضور وتأجيل الموعد.",
    "العميلة خارج المدينة حالياً.",
    "تغيير خطط السفر.",
    "إلغاء بسبب طارئ صحي بسيط."
  ];

  const turkishCancellationNotes = [
    "Müşteri son dakika ailevi acil durum bildirdi.",
    "Müşteri katılamayacağı için ertelendi.",
    "Müşteri şu anda şehir dışında seyahatte.",
    "İş seyahati nedeniyle plan değişti.",
    "Hafif bir rahatsızlık nedeniyle iptal edildi."
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
      ? (isTurkish ? turkishCancellationNotes[i % turkishCancellationNotes.length] : arabicCancellationNotes[i % arabicCancellationNotes.length])
      : (isTurkish ? turkishNotes[i % turkishNotes.length] : arabicNotes[i % arabicNotes.length]);

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

  console.log(`${isTurkish ? "Turkish" : "Arabic"} demo seed completed.`);
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
