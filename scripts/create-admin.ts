import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("123456", 12);
  await prisma.admin.create({
    data: { username: "lamees", passwordHash: hash },
  });
  console.log("Admin created!");
}

main().then(() => prisma.$disconnect());