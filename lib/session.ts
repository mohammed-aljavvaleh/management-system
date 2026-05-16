import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  adminId?: string;
  username?: string;
  salonId?: string; // ← added for multi-tenancy
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "lamees_session",
  cookieOptions: {
    secure: process.env.SESSION_COOKIE_SECURE === "true" || (
      process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://")
    ),
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/**
 * Use this in any Server Component or Server Action that requires authentication.
 * Throws "UNAUTHORIZED" if the session is missing adminId or salonId.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session.adminId || !session.salonId) {
    throw new Error("UNAUTHORIZED");
  }
  return session as Required<SessionData>;
}