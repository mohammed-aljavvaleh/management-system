import "../globals.css";
import type { Metadata } from "next";
import { ShellClient } from "@/components/layout/shell-client";
import { QueryProvider } from "@/components/providers/query-provider";
import { LanguageProvider } from "@/components/providers/language-provider";

export const metadata: Metadata = {
  title: "Güzellik Salonu",
  description: "Güzellik Salonu Yönetim Sistemi",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <LanguageProvider>
          <QueryProvider>
            <ShellClient>{children}</ShellClient>
          </QueryProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
