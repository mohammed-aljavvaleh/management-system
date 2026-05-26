import "../globals.css";
import type { Metadata } from "next";
import { LanguageProvider } from "@/components/providers/language-provider";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Güzellik Salonu",
  description: "Güzellik Salonu Yönetim Sistemi",
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "en";
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <html lang={lang} dir={dir} className="h-full">
      <body className="h-full">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
