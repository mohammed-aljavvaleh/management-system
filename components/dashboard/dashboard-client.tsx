"use client";

import { format } from "date-fns";
import { CalendarDays, TurkishLira, Clock, IdCardLanyard, Scissors, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/components/providers/language-provider";

type Appointment = {
  id: string;
  startTime: Date | string;
  customer: { name: string; phone: string };
  status: string;
  priceAtBooking: number;
  service: { name: string; price: number; duration: number };
  staff: { name: string };
};

type Props = {
  todayAppointments: Appointment[];
  todayRevenue: number;
  upcomingCount: number;
  servicesCount: number;
  staffCount: number;
};

export function DashboardClient({
  todayAppointments,
  todayRevenue,
  upcomingCount,
  servicesCount,
  staffCount,
}: Props) {
  const { t } = useLang();

  const completed = todayAppointments.filter((a) => a.status === "COMPLETED").length;
  const cancelled = todayAppointments.filter((a) => a.status === "CANCELLED").length;
  const scheduled = todayAppointments.filter((a) => a.status === "SCHEDULED").length;

  const stats = [
    {
      label: t.dashboard.todayRevenue,
      value: `₺${todayRevenue.toFixed(2)}`,
      icon: TurkishLira,
      sub: `${todayAppointments.length} ${t.dashboard.appointments}`,
      color: "#c9956b",
    },
    {
      label: t.dashboard.upcoming,
      value: upcomingCount.toString(),
      icon: CalendarDays,
      sub: t.dashboard.scheduledFromNow,
      color: "#7b9ec9",
    },
    {
      label: t.dashboard.services,
      value: servicesCount.toString(),
      icon: Scissors,
      sub: t.dashboard.available,
      color: "#9ec97b",
    },
    {
      label: t.dashboard.staff,
      value: staffCount.toString(),
      icon: IdCardLanyard,
      sub: t.dashboard.teamMembers,
      color: "#c97bb5",
    },
  ];

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 4 }}>
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--foreground)" }}>
          {getGreeting(t)}
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="animate-fade-in"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "20px 22px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: stat.color + "18",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <stat.icon size={18} color={stat.color} />
              </div>
              <TrendingUp size={14} color="var(--muted-foreground)" />
            </div>
            <div style={{ fontSize: 26, fontFamily: "var(--font-display)", fontWeight: 600 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginTop: 2 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 11, color: stat.color, marginTop: 4 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Status row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        {[
          { label: t.dashboard.scheduled, value: scheduled, color: "#1a6fa0", bg: "#e8f4fd" },
          { label: t.dashboard.completed, value: completed, color: "#2d7a2d", bg: "#e8f5e8" },
          { label: t.dashboard.cancelled, value: cancelled, color: "#a01a1a", bg: "#fde8e8" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "8px 16px", borderRadius: 8,
              background: s.bg, color: s.color,
              fontSize: 13, fontWeight: 500,
            }}
          >
            {s.value} {s.label}
          </div>
        ))}
        <Link
          href="/appointments/new"
          style={{
            marginLeft: "auto", padding: "8px 20px", borderRadius: 8,
            background: "var(--primary)", color: "white",
            fontSize: 13, fontWeight: 500, textDecoration: "none",
          }}
        >
          + {t.dashboard.newAppointment}
        </Link>
      </div>

      {/* Today's Appointments */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{
          padding: "18px 22px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 500 }}>
            {t.dashboard.todaySchedule}
          </h2>
          <Link href="/appointments" style={{ fontSize: 12.5, color: "var(--primary)", textDecoration: "none" }}>
            {t.dashboard.viewAll}
          </Link>
        </div>

        {todayAppointments.length === 0 ? (
          <div style={{ padding: "48px 22px", textAlign: "center", color: "var(--muted-foreground)" }}>
            <CalendarDays size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p>{t.dashboard.noAppointments}</p>
          </div>
        ) : (
          <div>
            {todayAppointments.map((appt, i) => (
              <div
                key={appt.id}
                className="animate-fade-in"
                style={{
                  animationDelay: `${i * 40}ms`,
                  padding: "14px 22px",
                  borderBottom: i < todayAppointments.length - 1 ? "1px solid var(--border)" : "none",
                  display: "flex", alignItems: "center", gap: 16,
                }}
              >
                <div style={{ width: 64, flexShrink: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                    {format(new Date(appt.startTime), "h:mm")}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {format(new Date(appt.startTime), "a")}
                  </div>
                </div>

                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--primary-light)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 600, color: "var(--primary)", flexShrink: 0,
                }}>
                  {appt.customer.name.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13.5, marginBottom: 2 }}>
                    {appt.customer.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    {appt.service.name} · {appt.staff.name}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--muted-foreground)", fontSize: 12 }}>
                  <Clock size={12} />{appt.service.duration}{t.services.min}
                </div>

                <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--primary)", width: 60, textAlign: "right" }}>
                  ₺{appt.priceAtBooking}
                </div>

                <span
                  className={`status-${appt.status.toLowerCase()}`}
                  style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, textTransform: "capitalize" }}
                >
                  {appt.status.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting(t: ReturnType<typeof useLang>["t"]) {
  const h = new Date().getHours();
  if (h < 12) return t.dashboard.greeting_morning;
  if (h < 17) return t.dashboard.greeting_afternoon;
  return t.dashboard.greeting_evening;
}