import "../globals.css";
import type { Metadata } from "next";
import { LanguageProvider } from "@/components/providers/language-provider";

export const metadata: Metadata = {
  title: "Güzellik Salonu",
  description: "Güzellik Salonu Yönetim Sistemi",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
