import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import path from "path";

export type SessionData = {
  adminId?: string;
  username?: string;
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
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}