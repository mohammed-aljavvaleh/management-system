import "../globals.css";
import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/query-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { MobileShell } from "@/components/mobile/mobile-shell";

export const metadata: Metadata = {
  title: "Güzellik Salonu",
  description: "Güzellik Salonu Yönetim Sistemi",
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <LanguageProvider>
          <QueryProvider>
            <MobileShell>{children}</MobileShell>
          </QueryProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}