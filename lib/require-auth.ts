import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const session = await getSession();
  if (!session.adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}