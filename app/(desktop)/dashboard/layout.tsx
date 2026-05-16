import { requireSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireSession();
  } catch {
    redirect("/login");
  }

  return children;
}
