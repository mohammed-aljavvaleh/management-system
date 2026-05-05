"use client";

import Link from "next/link";
import { User, Phone, Calendar, Package } from "lucide-react";
import { useLang } from "@/components/providers/language-provider";

type Customer = {
  id: string;
  name: string;
  phone: string;
  _count: { appointments: number; packages: number };
  packages: { remainingSessions: number; totalSessions: number }[];
};

export function CustomersClient({ customers }: { customers: Customer[] }) {
    const { t } = useLang();
    return (
    <div style={{ padding: "32px 36px", maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500 }}>
            {t.customers.title}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>
            {customers.length} {customers.length === 1 ? t.customers.subtitle1 : t.customers.subtitle2}
          </p>
        </div>
      </div>

      {customers.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 0",
          color: "var(--muted-foreground)", fontSize: 14,
        }}>
          <User size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>{t.customers.noCustomers}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {customers.map((c) => {
            const activePackages = c.packages.filter((p) => p.remainingSessions > 0);
            const lowSessions = activePackages.some((p) => p.remainingSessions < 2);

            return (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 20px",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  transition: "border-color 0.15s",
                  cursor: "pointer",
                }}>
                  {/* Left: avatar + name + phone */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: "50%",
                      background: "var(--primary-light)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 600, color: "var(--primary)",
                      flexShrink: 0,
                    }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14.5 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <Phone size={10} /> {c.phone}
                      </div>
                    </div>
                  </div>

                  {/* Right: stats */}
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted-foreground)" }}>
                        <Calendar size={11} />  {t.appointments.appointments}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 15, textAlign: "center" }}>
                        {c._count.appointments}
                      </div>
                    </div>

                    {activePackages.length > 0 && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted-foreground)" }}>
                          <Package size={11} /> {t.customers.sessionsLeft}
                        </div>
                        <div style={{
                          fontWeight: 600, fontSize: 15, textAlign: "center",
                          color: lowSessions ? "#c45c5c" : "var(--foreground)",
                        }}>
                          {activePackages.reduce((sum, p) => sum + p.remainingSessions, 0)}
                        </div>
                      </div>
                    )}

                    <div style={{
                      fontSize: 12, color: "var(--muted-foreground)",
                      padding: "4px 10px", background: "var(--muted)",
                      borderRadius: 20,
                    }}>
                      {t.customers.ViewDetails} →
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}