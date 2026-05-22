"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Users,
  Scissors,
  UserCheck,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/components/providers/language-provider";

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLang();

  const tabs = [
    { href: "/mobile/appointments", label: t.nav.appointments, icon: CalendarDays },
    { href: "/mobile/customers", label: t.nav.customers, icon: Users },
    { href: "/mobile/services", label: t.nav.services, icon: Scissors },
    { href: "/mobile/staff", label: t.nav.staff, icon: UserCheck },
    { href: "/mobile/packages", label: t.nav.packages, icon: Package },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Top header */}
      <header className="flex-none bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-zinc-900 tracking-tight">
          Lamees Nail Salon
        </h1>
        <span className="text-xs text-zinc-400 font-medium">{t.nav.staff}</span>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 flex z-50">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                active
                  ? "text-rose-500"
                  : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5",
                  active ? "text-rose-500" : "text-zinc-400"
                )}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}