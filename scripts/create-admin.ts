// scripts/create-admin.ts
// Usage: npx tsx scripts/create-admin.ts
// Creates a new Salon + Admin atomically.

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// ── Config: edit these before running ────────────────────────────────────────
const SALON_NAME = "Ghalia Salon";
const USERNAME   = "ghalia";
const PASSWORD   = "2019@ghalia";
// ─────────────────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Add it to .env before running this script.");
}

const adapter = new PrismaPg(DATABASE_URL);
const prisma  = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.admin.findUnique({ where: { username: USERNAME } });
  if (existing) {
    console.error(`❌  Admin "${USERNAME}" already exists.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const { salon, admin } = await prisma.$transaction(async (tx) => {
    const salon = await tx.salon.create({
      data: { name: SALON_NAME },
    });
    const admin = await tx.admin.create({
      data: { username: USERNAME, passwordHash, salonId: salon.id },
    });
    return { salon, admin };
  });

  console.log("✅  Done!");
  console.log(`   Salon : ${salon.name} (${salon.id})`);
  console.log(`   Admin : ${admin.username} (${admin.id})`);
  console.log(`   salonId: ${salon.id}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
