import "../globals.css";
import type { Metadata } from "next";
import { ShellClient } from "@/components/layout/shell-client";
import { QueryProvider } from "@/components/providers/query-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Güzellik Salonu",
  description: "Güzellik Salonu Yönetim Sistemi",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "en";
  const dir = lang === "ar" ? "rtl" : "ltr";

  const session = await getSession();
  let initialCurrency = session.currency;

  if (!initialCurrency && session.salonId) {
    const salon = await prisma.salon.findUnique({
      where: { id: session.salonId },
      select: { currency: true },
    });
    if (salon) {
      initialCurrency = salon.currency as "TRY" | "SAR";
    }
  }

  initialCurrency = initialCurrency || "TRY";

  return (
    <html lang={lang} dir={dir} className="h-full">
      <body className="h-full">
        <LanguageProvider initialCurrency={initialCurrency}>
          <QueryProvider>
            <ShellClient>{children}</ShellClient>
          </QueryProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
