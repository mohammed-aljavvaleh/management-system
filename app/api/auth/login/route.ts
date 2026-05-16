// app/api/auth/login/route.ts
// Updated: salonId is now written to the session on every successful login.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

// Simple in-memory rate limiting: 5 attempts per minute per IP
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

function getClientIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + 60_000 });
    return true;
  }
  if (record.count >= 5) return false;
  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again in 1 minute." },
      { status: 429 }
    );
  }

  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  // Fetch admin + salon in one query
  const admin = await prisma.admin.findUnique({
    where: { username },
    include: { salon: true },
  });

  if (!admin) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  // ── Write tenant context to session ───────────────────────────────────────
  const session = await getSession();
  session.adminId  = admin.id;
  session.username = admin.username;
  session.salonId  = admin.salonId;   // ← the key addition
  await session.save();

  return NextResponse.json({ ok: true, salonId: admin.salonId });
}