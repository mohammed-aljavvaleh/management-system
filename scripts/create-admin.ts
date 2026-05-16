// scripts/create-admin.ts
// Usage: npx tsx scripts/create-admin.ts
// Creates a new Salon + Admin atomically.

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const SALON_NAME = process.env.ADMIN_SALON_NAME;
const USERNAME = process.env.ADMIN_USERNAME;
const PASSWORD = process.env.ADMIN_PASSWORD;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Add it to .env before running this script.");
}
if (!SALON_NAME?.trim() || !USERNAME?.trim() || !PASSWORD) {
  throw new Error("ADMIN_SALON_NAME, ADMIN_USERNAME, and ADMIN_PASSWORD are required.");
}
if (PASSWORD.length < 12) {
  throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
}
const salonName = SALON_NAME.trim();
const username = USERNAME.trim();
const password = PASSWORD;

const adapter = new PrismaPg(DATABASE_URL);
const prisma  = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing) {
    console.error(`Admin "${username}" already exists.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { salon, admin } = await prisma.$transaction(async (tx) => {
    const salon = await tx.salon.create({
      data: { name: salonName },
    });
    const admin = await tx.admin.create({
      data: { username, passwordHash, salonId: salon.id },
    });
    return { salon, admin };
  });

  console.log("Done.");
  console.log(`   Salon : ${salon.name} (${salon.id})`);
  console.log(`   Admin : ${admin.username} (${admin.id})`);
  console.log(`   salonId: ${salon.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
