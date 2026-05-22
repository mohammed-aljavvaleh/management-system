import { getSession, SessionData } from "@/lib/session";
import { NextResponse } from "next/server";
import { getTranslations } from "@/lib/get-translations";

export async function requireAuth() {
  const session = await getSession();
  if (!session.adminId || !session.salonId) {
    const t = await getTranslations();
    return NextResponse.json({ error: t.apiErrors.unauthorized }, { status: 401 });
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
    const t = await getTranslations();
    return {
      response: NextResponse.json({ error: t.apiErrors.unauthorized }, { status: 401 }),
    };
  }

  return { session: session as AuthenticatedSession };
}
