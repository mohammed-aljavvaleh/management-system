"use client";

import { useState } from "react";
import Link from "next/link";
import { Prisma } from "@/app/generated/prisma";
import {
  Calendar,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Star,
  BarChart3,
  FileText,
  Pencil,
  Trash2,
  Check,
  X,
  Users,
  Mail,
  Phone,
} from "lucide-react";
import { useLang, Price } from "@/components/providers/language-provider";
import { format } from "date-fns";
import { ar } from "date-fns/locale/ar";
import { tr } from "date-fns/locale/tr";
import { enUS } from "date-fns/locale/en-US";
import { Avatar } from "@/components/ui/avatar";

type StaffWithAppointments = Prisma.StaffGetPayload<{
  include: {
    appointments: {
      include: { customer: true; service: true };
    };
  };
}>;

type TopService = {
  name: string;
  count: number;
  revenue: number;
};

type Stats = {
  total: number;
  completed: number;
  cancelled: number;
  revenue: number;
  completionRate: number;
};

type LoyalCustomer = {
  id: string;
  name: string;
  count: number;
};

type MonthlyTrend = {
  month: string;
  count: number;
  revenue: number;
};



export function StaffProfileClient({
  member,
  stats,
  topServices,
  loyalCustomers = [],
  monthlyTrends = [],
}: {
  member: StaffWithAppointments;
  stats: Stats;
  topServices: TopService[];
  loyalCustomers?: LoyalCustomer[];
  monthlyTrends?: MonthlyTrend[];
}) {
  const { t, lang, mounted } = useLang();
  const dateLocale = lang === "ar" ? ar : lang === "tr" ? tr : enUS;

  const [hoveredMonth, setHoveredMonth] = useState<MonthlyTrend | null>(null);

  const fmt = (date: Date | string | null | undefined, pattern: string) => {
    if (!mounted || !date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return format(d, pattern, { locale: dateLocale });
  };

  const maxCount = topServices[0]?.count || 1;

  const statusLabel = (status: string) => {
    if (status === "COMPLETED") return t.appointments.statuses.completed;
    if (status === "CANCELLED") return t.appointments.statuses.cancelled;
    return t.appointments.statuses.scheduled;
  };

  const statusColor = (status: string) => {
    if (status === "COMPLETED") return "#2d7a2d";
    if (status === "CANCELLED") return "#c45c5c";
    return "var(--primary)";
  };

  if (!mounted) {
    return (
      <div className="admin-page" style={{ padding: "32px 36px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const formatMonthName = (monthStr: string) => {
    const d = new Date(monthStr + "-02");
    return format(d, "MMMM yyyy", { locale: dateLocale });
  };

  const formatMonthNameAbbr = (monthStr: string) => {
    const d = new Date(monthStr + "-02");
    return format(d, "MMM yy", { locale: dateLocale });
  };

  const now = new Date();

  // Sort upcoming ascending (closest first)
  const upcoming = member.appointments
    .filter((appt) => appt.status === "SCHEDULED" && new Date(appt.startTime) >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Sort history descending (most recent first)
  const history = member.appointments.filter(
    (appt) => appt.status !== "SCHEDULED" || new Date(appt.startTime) < now
  );

  return (
    <div className="admin-page" style={{ padding: "32px 36px", maxWidth: 860 }}>
      {/* Dynamic styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .hover-underline:hover {
          text-decoration: underline !important;
          opacity: 0.9;
        }
      `}} />

      {/* Back */}
      <Link
        href="/staff"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "var(--muted-foreground)", fontSize: 13,
          textDecoration: "none", marginBottom: 24,
        }}
      >
        {t.staff.back}
      </Link>

      {/* ── Profile Header ─────────────────────────────────────────── */}
      <div
        className="admin-card-row"
        style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 14, padding: "28px 32px", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Avatar */}
          <Avatar name={member.name} size={68} fontSize={26} />
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, margin: 0 }}>
              {member.name}
            </h1>
            <div style={{ fontSize: 13.5, color: "var(--muted-foreground)", marginTop: 3 }}>
              {(t.staff.roles as Record<string, string>)[member.role] || member.role}
            </div>
            {member.createdAt && fmt(member.createdAt, "MMMM yyyy") && (
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                {t.staff.joinedOn} {fmt(member.createdAt, "MMMM yyyy")}
              </div>
            )}
            {stats.completed > 0 && stats.completionRate >= 90 && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11.5, fontWeight: 500, color: "#c9956b", background: "#f5ede5", padding: "2px 10px", borderRadius: 20 }}>
                <Star size={11} fill="#c9956b" /> {t.staff.topPerformer}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="admin-card-row-right" style={{ display: "flex", gap: 28, textAlign: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 2 }}>{t.appointments.appointments}</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#2d7a2d" }}>{stats.completed}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 2 }}>{t.appointments.statuses.completed}</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--primary)" }}>
              {stats.completionRate}%
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 2 }}>{t.staff.completionRate}</div>
          </div>
          <div>
            <Price amount={stats.revenue} showDecimals={false} size={24} style={{ fontWeight: 700, color: "var(--primary)" }} />
            <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 2 }}>{t.staff.revenueGenerated}</div>
          </div>
        </div>
      </div>

      {/* ── Staff Notes & Contact Info ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20, marginBottom: 20 }}>
        <StaffNotesCard staffId={member.id} initialNotes={member.notes ?? null} />
        <StaffContactCard staffId={member.id} initialEmail={member.email ?? null} initialPhone={member.phone ?? null} />
      </div>

      {/* ── Stats cards row ───────────────────────────────────────── */}
      <div className="admin-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        {[
          {
            label: t.staff.completed,
            value: stats.completed,
            icon: CheckCircle2,
            color: "#2d7a2d",
            bg: "#e8f5e8",
          },
          {
            label: t.appointments.statuses.cancelled,
            value: stats.cancelled,
            icon: XCircle,
            color: "#c45c5c",
            bg: "#fde8e8",
          },
          {
            label: t.staff.completionRate,
            value: `${stats.completionRate}%`,
            icon: TrendingUp,
            color: "var(--primary)",
            bg: "var(--primary-light)",
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "16px 20px",
              display: "flex", alignItems: "center", gap: 14,
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: card.bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <card.icon size={18} color={card.color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontFamily: "var(--font-display)", fontWeight: 600, color: card.color }}>
                {card.value}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Top Services & Top Customers ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20, marginBottom: 20 }}>
        {/* Top Services */}
        <section style={{ display: "flex", flexDirection: "column" }}>
          <h2 style={{
            fontSize: 15, fontWeight: 600, marginBottom: 14,
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <BarChart3 size={15} color="var(--primary)" /> {t.staff.topServices}
          </h2>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 22px", flex: 1, display: "flex", flexDirection: "column", justifyContent: topServices.length > 0 ? "flex-start" : "center" }}>
            {topServices.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 180, color: "var(--muted-foreground)", fontSize: 13.5 }}>
                {t.staff.noHistory}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {topServices.map((svc) => {
                  const pct = Math.round((svc.count / maxCount) * 100);
                  return (
                    <div key={svc.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{svc.name}</span>
                        <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: "var(--muted-foreground)" }}>
                          <span>{svc.count} {t.appointments.appointments}</span>
                          <Price amount={svc.revenue} style={{ color: "var(--primary)", fontWeight: 500 }} />
                        </div>
                      </div>
                      <div style={{ height: 6, background: "var(--muted)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          background: "var(--primary)", borderRadius: 3,
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Top Customers */}
        <section style={{ display: "flex", flexDirection: "column" }}>
          <h2 style={{
            fontSize: 15, fontWeight: 600, marginBottom: 14,
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <Users size={15} color="var(--primary)" /> {t.staff.loyalCustomers}
          </h2>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 22px", flex: 1, display: "flex", flexDirection: "column", justifyContent: loyalCustomers.length > 0 ? "flex-start" : "center" }}>
            {loyalCustomers.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 180, color: "var(--muted-foreground)", fontSize: 13.5 }}>
                {t.staff.noHistory}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {loyalCustomers.map((cust) => {
                  return (
                    <div key={cust.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={cust.name} size={32} />
                        <Link href={`/customers/${cust.id}`} style={{ fontSize: 13.5, fontWeight: 500, color: "var(--foreground)", textDecoration: "none" }} className="hover-underline">
                          {cust.name}
                        </Link>
                      </div>
                      <span style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>
                        {t.staff.bookingsCount.replace("{count}", String(cust.count))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Monthly Performance ── */}
      {monthlyTrends.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{
            fontSize: 15, fontWeight: 600, marginBottom: 14,
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <TrendingUp size={15} color="var(--primary)" /> {t.staff.monthlyPerformance}
          </h2>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
            
            {/* Header info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                {t.staff.completed} · {t.staff.revenue}
              </div>
              <div style={{ minHeight: 22 }}>
                {hoveredMonth ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500 }}>
                    <span style={{ color: "var(--foreground)" }}>{formatMonthName(hoveredMonth.month)}:</span>
                    <span style={{ color: "var(--primary)", fontWeight: 600 }}>
                      <Price amount={hoveredMonth.revenue} />
                    </span>
                    <span style={{ color: "var(--muted-foreground)" }}>
                      ({t.staff.bookingsCount.replace("{count}", String(hoveredMonth.count))})
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                    {lang === "ar" ? "ضع المؤشر على الأعمدة للتفاصيل" : lang === "tr" ? "Detaylar için sütunların üzerine gelin" : "Hover or tap bars for details"}
                  </div>
                )}
              </div>
            </div>

            {/* Bars container */}
            <div style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              height: 140,
              paddingBottom: 10,
              borderBottom: "1px solid var(--border)",
              gap: 12,
            }}>
              {(() => {
                const maxRevenue = Math.max(...monthlyTrends.map((t) => t.revenue), 1);
                return monthlyTrends.map((item) => {
                  const pct = Math.max((item.revenue / maxRevenue) * 100, item.revenue > 0 ? 5 : 0);
                  const isHovered = hoveredMonth?.month === item.month;
                  
                  return (
                    <div
                      key={item.month}
                      onMouseEnter={() => setHoveredMonth(item)}
                      onMouseLeave={() => setHoveredMonth(null)}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                    >
                      {/* Bar */}
                      <div style={{
                        width: "100%",
                        maxWidth: 42,
                        height: 120,
                        display: "flex",
                        alignItems: "flex-end",
                      }}>
                        <div
                          className="bar-chart-bar"
                          style={{
                            width: "100%",
                            height: `${pct}%`,
                            background: isHovered
                              ? "var(--primary)"
                              : "linear-gradient(to top, var(--primary-light), var(--primary))",
                            borderRadius: "4px 4px 0 0",
                            transition: "all 0.2s ease-out",
                            opacity: isHovered ? 1 : 0.85,
                          }}
                        />
                      </div>
                      
                      {/* Label under axis */}
                      <div style={{
                        marginTop: 8,
                        fontSize: 11,
                        color: isHovered ? "var(--foreground)" : "var(--muted-foreground)",
                        fontWeight: isHovered ? 600 : 400,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                      }}>
                        {formatMonthNameAbbr(item.month)}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </section>
      )}

      {/* ── Upcoming Bookings ── */}
      <section style={{ marginBottom: 20 }}>
        <h2 style={{
          fontSize: 15, fontWeight: 600, marginBottom: 14,
          display: "flex", alignItems: "center", gap: 7,
        }}>
          <Calendar size={15} color="var(--primary)" /> {t.staff.upcomingBookings}
        </h2>

        {upcoming.length === 0 ? (
          <div style={{
            background: "var(--card)", border: "2px dashed var(--border)",
            borderRadius: 12, padding: "28px 24px", textAlign: "center",
            color: "var(--muted-foreground)", fontSize: 13,
          }}>
            {t.staff.noUpcoming}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {upcoming.map((appt) => (
              <div
                key={appt.id}
                style={{
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "13px 18px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  {/* Status dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: statusColor(appt.status), flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13.5 }}>{appt.service.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                      {fmt(appt.startTime, "dd MMM yyyy")} · {fmt(appt.startTime, "HH:mm")} · {appt.customer.name}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 500,
                    color: statusColor(appt.status),
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {statusLabel(appt.status)}
                  </span>
                  <Price amount={appt.priceAtBooking} style={{ fontWeight: 600 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Appointment History ── */}
      <section style={{ marginBottom: 20 }}>
        <h2 style={{
          fontSize: 15, fontWeight: 600, marginBottom: 14,
          display: "flex", alignItems: "center", gap: 7,
        }}>
          <Calendar size={15} color="var(--primary)" /> {t.staff.appointmentHistory}
        </h2>

        {history.length === 0 ? (
          <div style={{
            background: "var(--card)", border: "2px dashed var(--border)",
            borderRadius: 12, padding: "28px 24px", textAlign: "center",
            color: "var(--muted-foreground)", fontSize: 13,
          }}>
            {t.staff.noHistory}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {history.map((appt) => (
              <div
                key={appt.id}
                style={{
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "13px 18px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  {/* Status dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: statusColor(appt.status), flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13.5 }}>{appt.service.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                      {fmt(appt.startTime, "dd MMM yyyy")} · {fmt(appt.startTime, "HH:mm")} · {appt.customer.name}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 500,
                    color: statusColor(appt.status),
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    {statusLabel(appt.status)}
                  </span>
                  <Price amount={appt.priceAtBooking} style={{ fontWeight: 600 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Staff Notes Card
// ─────────────────────────────────────────────────────────────────────────────

function StaffNotesCard({
  staffId,
  initialNotes,
}: {
  staffId: string;
  initialNotes: string | null;
}) {
  const { t } = useLang();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: draft }),
      });
      if (res.ok) {
        setNotes(draft);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function clearNotes() {
    if (!confirm(t.staff.removeNoteConfirm)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "" }),
      });
      if (res.ok) {
        setNotes("");
        setDraft("");
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "18px 22px", marginBottom: 20,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: editing || notes ? 12 : 0,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <FileText size={14} color="var(--primary)" /> {t.staff.staffNotes}
        </h3>
        {!editing && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => { setDraft(notes); setEditing(true); }}
              style={iconBtnStyle}
              title={t.common.edit}
            >
              <Pencil size={13} />
            </button>
            {notes && (
              <button
                onClick={clearNotes}
                disabled={saving}
                style={{ ...iconBtnStyle, color: "#c45c5c" }}
                title={t.staff.removeNoteConfirm}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.staff.staffNotePlaceholder}
            rows={3}
            autoFocus
            style={{
              width: "100%", padding: "10px 12px",
              border: "1px solid var(--border)", borderRadius: 8,
              background: "var(--background)", fontSize: 13.5,
              color: "var(--foreground)", outline: "none",
              resize: "vertical", boxSizing: "border-box",
              fontFamily: "inherit", lineHeight: 1.6,
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              style={ghostBtnStyle}
            >
              <X size={13} style={{ marginRight: 4 }} /> {t.common.cancel}
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{ ...primaryBtnStyle, display: "flex", alignItems: "center", gap: 4 }}
            >
              <Check size={13} /> {saving ? t.appointments.saving : t.common.save}
            </button>
          </div>
        </div>
      ) : notes ? (
        <p style={{
          margin: 0, fontSize: 13.5, lineHeight: 1.65,
          color: "var(--foreground)",
          background: "var(--muted)", padding: "12px 14px",
          borderRadius: 8, borderLeft: "3px solid var(--primary)",
          whiteSpace: "pre-wrap",
        }}>
          {notes}
        </p>
      ) : (
        <button
          onClick={() => { setDraft(""); setEditing(true); }}
          style={{
            width: "100%", padding: "12px",
            border: "1px dashed var(--border)", borderRadius: 8,
            background: "transparent", cursor: "pointer",
            color: "var(--muted-foreground)", fontSize: 13, textAlign: "center",
          }}
        >
          {t.staff.addStaffNote}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Staff Contact Card
// ─────────────────────────────────────────────────────────────────────────────

function StaffContactCard({
  staffId,
  initialEmail,
  initialPhone,
}: {
  staffId: string;
  initialEmail: string | null;
  initialPhone: string | null;
}) {
  const { t, lang } = useLang();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [editing, setEditing] = useState(false);
  const [draftEmail, setDraftEmail] = useState(email);
  const [draftPhone, setDraftPhone] = useState(phone);
  const [saving, setSaving] = useState(false);

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    setDraftPhone(digits);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: draftEmail.trim() || null, phone: draftPhone.trim() || null }),
      });
      if (res.ok) {
        setEmail(draftEmail.trim());
        setPhone(draftPhone.trim());
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const hasContact = email || phone;

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "18px 22px", marginBottom: 20,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: editing || hasContact ? 12 : 0,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Mail size={14} color="var(--primary)" /> {t.staff.contactInfo}
        </h3>
        {!editing && (
          <button
            onClick={() => { setDraftEmail(email); setDraftPhone(phone); setEditing(true); }}
            style={iconBtnStyle}
            title={t.common.edit}
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textAlign: lang === "ar" ? "right" : "left" }}>
              {t.staff.email}
            </label>
            <input
              type="email"
              value={draftEmail}
              onChange={(e) => setDraftEmail(e.target.value)}
              placeholder={t.staff.emailPlaceholder}
              style={{
                width: "100%", padding: "8px 10px",
                border: "1px solid var(--border)", borderRadius: 6,
                background: "var(--background)", fontSize: 13,
                color: "var(--foreground)", outline: "none",
                boxSizing: "border-box",
                textAlign: lang === "ar" ? "right" : "left",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--muted-foreground)", display: "block", marginBottom: 4, textAlign: lang === "ar" ? "right" : "left" }}>
              {t.staff.phone}
            </label>
            <input
              type="tel"
              inputMode="numeric"
              value={draftPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="05XXXXXXXXX"
              maxLength={11}
              style={{
                width: "100%", padding: "8px 10px",
                border: "1px solid var(--border)", borderRadius: 6,
                background: "var(--background)", fontSize: 13,
                color: "var(--foreground)", outline: "none",
                boxSizing: "border-box",
                textAlign: lang === "ar" ? "right" : "left",
                borderColor: (() => {
                  if (draftPhone.length === 0) return "var(--border)";
                  if (!draftPhone.startsWith("05")) return "#c45c5c";
                  if (draftPhone.length === 11) return "#2d7a2d";
                  return "var(--border)";
                })(),
              }}
            />
            <div style={{ marginTop: 5, minHeight: 18, display: "flex", justifyContent: "space-between" }}>
              <span style={{
                fontSize: 11,
                color: (() => {
                  if (draftPhone.length === 0) return "var(--muted-foreground)";
                  if (!draftPhone.startsWith("05")) return "#c45c5c";
                  if (draftPhone.length === 11) return "#2d7a2d";
                  return "var(--muted-foreground)";
                })(),
                textAlign: lang === "ar" ? "right" : "left",
                display: "block",
              }}>
                {(() => {
                  if (draftPhone.length === 0) return t.appointmentForm.phoneNumberRules;
                  if (!draftPhone.startsWith("05")) return t.appointmentForm.errors.phoneMustStart;
                  if (draftPhone.length === 11) return t.appointmentForm.availableNumber;
                  return t.appointmentForm.phoneNumberRules;
                })()}
              </span>
              <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
                {draftPhone.length}/11
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, justifyContent: "flex-end" }}>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              style={ghostBtnStyle}
            >
              <X size={13} style={{ marginRight: 4 }} /> {t.common.cancel}
            </button>
            <button
              onClick={save}
              disabled={saving || (draftPhone.length > 0 && (draftPhone.length !== 11 || !draftPhone.startsWith("05")))}
              style={{
                ...primaryBtnStyle,
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: (saving || (draftPhone.length > 0 && (draftPhone.length !== 11 || !draftPhone.startsWith("05")))) ? "var(--muted)" : "var(--primary)",
                color: (saving || (draftPhone.length > 0 && (draftPhone.length !== 11 || !draftPhone.startsWith("05")))) ? "var(--muted-foreground)" : "white",
                cursor: (saving || (draftPhone.length > 0 && (draftPhone.length !== 11 || !draftPhone.startsWith("05")))) ? "default" : "pointer",
              }}
            >
              <Check size={13} /> {saving ? t.appointments.saving : t.common.save}
            </button>
          </div>
        </div>
      ) : hasContact ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "center" }}>
          {email && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Mail size={13} color="var(--primary)" />
              </div>
              <a
                href={`mailto:${email}`}
                style={{ fontSize: 13.5, color: "var(--foreground)", textDecoration: "none" }}
                className="hover-underline"
              >
                {email}
              </a>
            </div>
          )}
          {phone && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Phone size={13} color="var(--primary)" />
              </div>
              <a
                href={`tel:${phone}`}
                style={{ fontSize: 13.5, color: "var(--foreground)", textDecoration: "none" }}
                className="hover-underline"
              >
                {phone}
              </a>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => { setDraftEmail(""); setDraftPhone(""); setEditing(true); }}
          style={{
            width: "100%", padding: "20px 12px",
            border: "1px dashed var(--border)", borderRadius: 8,
            background: "transparent", cursor: "pointer",
            color: "var(--muted-foreground)", fontSize: 13, textAlign: "center",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            flex: 1,
          }}
        >
          <Mail size={14} /> {t.staff.addContactInfo}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared styles
// ─────────────────────────────────────────────────────────────────────────────

const iconBtnStyle: React.CSSProperties = {
  padding: "6px", background: "var(--muted)", border: "1px solid var(--border)",
  borderRadius: 6, cursor: "pointer", color: "var(--muted-foreground)",
  display: "flex", alignItems: "center",
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8,
  border: "1px solid var(--border)", background: "transparent",
  cursor: "pointer", fontSize: 13, color: "var(--foreground)",
  display: "flex", alignItems: "center",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8,
  border: "none", background: "var(--primary)",
  color: "white", cursor: "pointer", fontSize: 13, fontWeight: 500,
};
