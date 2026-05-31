"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Users,
  IdCardLanyard,
  BarChart2,
  X,
  LogOut
} from "lucide-react";
import { useLang } from "@/components/providers/language-provider";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { Avatar } from "@/components/ui/avatar";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const path = usePathname();
  const { t } = useLang();
  const [adminName, setAdminName] = useState<string | null>(null);
  const [salonName, setSalonName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted) return;
        if (data?.username) setAdminName(capitalize(data.username));
        if (data?.salonName) setSalonName(data.salonName);
      })
      .catch(() => {
        // ignore failures
      });

    return () => {
      mounted = false;
    };
  }, []);

  function capitalize(text: string) {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  const nav = [
    { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
    { href: "/appointments", label: t.nav.appointments, icon: CalendarDays },
    { href: "/customers", label: t.nav.customers, icon: Users },
    { href: "/services", label: t.nav.services, icon: Scissors },
    { href: "/staff", label: t.nav.staff, icon: IdCardLanyard },
    { href: "/reports", label: t.nav.reports, icon: BarChart2 },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      <style>{`
        .sidebar-close-btn {
          display: flex;
          position: absolute;
          top: 14px;
          right: 14px;
        }
        [dir="rtl"] .sidebar-close-btn {
          right: auto;
          left: 14px;
        }
        .sidebar-root {
          position: fixed;
          top: 0; left: 0; bottom: 0;
          z-index: 40;
          width: var(--sidebar-width);
          background: var(--card);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          /* Override the global * transition so only transform animates */
          transition: transform 300ms ease-in-out !important;
          transform: ${isOpen ? "translateX(0)" : "translateX(-100%)"};
        }
        [dir="rtl"] .sidebar-root {
          left: auto;
          right: 0;
          border-right: none;
          border-left: 1px solid var(--border);
          transform: ${isOpen ? "translateX(0)" : "translateX(100%)"};
        }

        @media (min-width: 1024px) {
          .sidebar-root {
            position: static;
            transform: translateX(0) !important;
            flex-shrink: 0;
            min-height: 100vh;
          }
          .sidebar-close-btn { display: none; }
        }
      `}</style>

      <aside className="sidebar-root">
        {/* Close button — mobile only */}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted-foreground)", padding: 8, borderRadius: 6,
            alignItems: "center", justifyContent: "center",
          }}
          aria-label="Close menu"
        >
          <X size={25} />
        </button>

        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 500,
            color: "var(--foreground)",
            letterSpacing: "0.02em",
            lineHeight: 1.2
          }}>
            {salonName ?? "\u00A0"}
          </div>
          <div style={{
            fontSize: 10,
            color: "var(--muted-foreground)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginTop: 2
          }}>
            {t.nav.sidebarSubtitle}
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
                onClick={onClose}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                  color: active ? "var(--primary)" : "var(--muted-foreground)",
                  background: active ? "var(--primary-light)" : "transparent",
                  fontWeight: active ? 500 : 400,
                  fontSize: 13.5, textDecoration: "none",
                }}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{
          padding: "16px 20px", borderTop: "1px solid var(--border)",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <LanguageToggle />
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 8,
              background: "none", border: "1px solid var(--border)",
              cursor: "pointer", color: "var(--muted-foreground)",
              fontSize: 13, width: "100%",
            }}
          >
            <LogOut size={14} />
            {t.nav.signOut}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <Avatar name={adminName || "Admin"} size={28} fontSize={12} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: "var(--foreground)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}>
                {adminName ?? "Admin"}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                {t.nav.adminPanel}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
