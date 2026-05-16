import "../globals.css";
import type { Metadata } from "next";
import { LanguageProvider } from "@/components/providers/language-provider";

export const metadata: Metadata = {
  title: "Lamees Nail Salon — Admin",
  description: "Nail salon appointment management system",
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
