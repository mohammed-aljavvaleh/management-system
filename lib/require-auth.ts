import { getSession, SessionData } from "@/lib/session";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const session = await getSession();
  if (!session.adminId || !session.salonId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

type AuthenticatedSession = Required<SessionData>;

export async function requireApiSession(): Promise<
  | { session: AuthenticatedSession; response?: never }
  | { response: NextResponse; session?: never }
> {
  const session = await getSession();
  if (!session.adminId || !session.salonId) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session: session as AuthenticatedSession };
}
