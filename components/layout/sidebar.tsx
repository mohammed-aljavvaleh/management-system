"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Users,
  IdCardLanyard,
  BarChart2,
  Sparkles,
} from "lucide-react";
import { useLang } from "@/components/providers/language-provider";
import { LanguageToggle } from "@/components/layout/language-toggle";

export function Sidebar() {
  const path = usePathname();
  const { t } = useLang();

  const nav = [
    { href: "/", label: t.nav.dashboard, icon: LayoutDashboard },
    { href: "/appointments", label: t.nav.appointments, icon: CalendarDays },
    { href: "/customers", label: t.nav.customers, icon: Users },
    { href: "/services", label: t.nav.services, icon: Scissors },
    { href: "/staff", label: t.nav.staff, icon: IdCardLanyard },
    { href: "/reports", label: t.nav.reports, icon: BarChart2 },
  ];

  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        minHeight: "100vh",
        background: "var(--card)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "28px 20px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={15} color="white" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 600,
                color: "var(--foreground)",
                lineHeight: 1.1,
              }}
            >
              Lamees
            </div>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Nail Salon
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 8,
                marginBottom: 2,
                color: active ? "var(--primary)" : "var(--muted-foreground)",
                background: active ? "var(--primary-light)" : "transparent",
                fontWeight: active ? 500 : 400,
                fontSize: 13.5,
                textDecoration: "none",
              }}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <LanguageToggle />
        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--foreground)" }}>
            {t.nav.adminPanel}
          </div>
          <div>v1.0.0</div>
        </div>
      </div>
    </aside>
  );
}