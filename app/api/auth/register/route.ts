// app/api/auth/register/route.ts
// Atomically creates a Salon + its first Admin in a single transaction.
// On success the admin is immediately logged in (session cookie set).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

interface RegisterBody {
  salonName: string;
  username: string;
  password: string;
  currency?: string;
}

export async function POST(req: NextRequest) {
  const body: RegisterBody = await req.json();
  const { salonName, username, password } = body;

  // ── Validation ────────────────────────────────────────────────────────────
  if (!salonName?.trim() || !username?.trim() || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  const currency = parseCurrency(body.currency);
  if (!currency) {
    return NextResponse.json({ error: "Currency must be either TRY or SAR." }, { status: 400 });
  }
  const normalizedUsername = username.trim();

  // ── Uniqueness pre-check (friendlier error than a DB constraint violation) ─
  const existing = await prisma.admin.findUnique({ where: { username: normalizedUsername } });
  if (existing) {
    return NextResponse.json({ error: "Username already taken." }, { status: 409 });
  }

  // ── Atomic creation ───────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(password, 12);

  const { salon, admin } = await prisma.$transaction(async (tx) => {
    const salon = await tx.salon.create({
      data: { name: salonName.trim(), currency },
    });

    const admin = await tx.admin.create({
      data: {
        username: normalizedUsername,
        passwordHash,
        salonId: salon.id,
      },
    });

    return { salon, admin };
  });

  // ── Auto-login after registration ─────────────────────────────────────────
  const session = await getSession();
  session.adminId = admin.id;
  session.username = admin.username;
  session.salonId = salon.id;
  session.currency = salon.currency as "TRY" | "SAR";
  await session.save();

  return NextResponse.json({ ok: true, salonId: salon.id, currency: salon.currency }, { status: 201 });
}

function parseCurrency(value: string | undefined) {
  const normalized = value?.trim().toUpperCase() || "TRY";
  if (normalized !== "TRY" && normalized !== "SAR") return null;
  return normalized;
}
