"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, TurkishLira, Clock, IdCardLanyard, Scissors, TrendingUp, SaudiRiyal } from "lucide-react";
import Link from "next/link";
import { useLang, Price } from "@/components/providers/language-provider";
import { ar } from "date-fns/locale/ar";
import { tr } from "date-fns/locale/tr";
import { enUS } from "date-fns/locale/en-US";
import { Avatar } from "@/components/ui/avatar";

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
  username: string;
  salon: { id: string; name: string; currency: string; openingHour: string; closingHour: string } | null;
};

export function DashboardClient({
  todayAppointments,
  todayRevenue,
  upcomingCount,
  servicesCount,
  staffCount,
  username,
  salon: initialSalon,
}: Props) {
  const { t, lang, currency, mounted } = useLang();
  const [adminName] = useState<string | null>(
    username ? username.charAt(0).toUpperCase() + username.slice(1).toLowerCase() : null
  );

  // Salon working hours configuration state
  const [salon, setSalon] = useState(initialSalon);
  const [openingHour, setOpeningHour] = useState(initialSalon?.openingHour || "09:00");
  const [closingHour, setClosingHour] = useState(initialSalon?.closingHour || "18:00");
  const [updating, setUpdating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function handleSaveSettings() {
    if (openingHour >= closingHour) {
      setSaveError(t.dashboard.errorOpeningBeforeClosing);
      return;
    }

    setUpdating(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/salon", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingHour, closingHour }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save settings");
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save settings");
    } finally {
      setUpdating(false);
    }
  }

  function capitalize(text: string) {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  const completed = todayAppointments.filter((a) => a.status === "COMPLETED").length;
  const cancelled = todayAppointments.filter((a) => a.status === "CANCELLED").length;
  const scheduled = todayAppointments.filter((a) => a.status === "SCHEDULED").length;

  const stats = [
    {
      label: t.dashboard.todayRevenue,
      value: <Price amount={todayRevenue} size={20} style={{ fontWeight: 600 }} />,
      icon: currency === "TRY" ? TurkishLira : SaudiRiyal,
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

  if (!mounted) {
    return (
      <div className="admin-page" style={{ padding: "32px 36px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="admin-page" style={{ padding: "32px 36px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 4 }}>
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: lang === "ar" ? ar : (lang === "tr" ? tr : enUS) })}
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--foreground)" }}>
          {`${getGreeting(t)}${adminName ? ` ${adminName}` : ""}`}
        </h1>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="animate-fade-in admin-stat-card"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div 
                className="admin-stat-icon-box"
                style={{ background: stat.color + "18" }}
              >
                <stat.icon size={18} color={stat.color} />
              </div>
              <TrendingUp size={14} color="var(--muted-foreground)" />
            </div>
            <div className="admin-stat-value">
              {stat.value}
            </div>
            <div className="admin-stat-label">
              {stat.label}
            </div>
            <div className="admin-stat-sub" style={{ color: stat.color }}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>


      {/* Working Hours Settings Card */}
      {salon && (
        <div 
          className="animate-fade-in"
          style={{ 
            marginBottom: 28, 
            background: "var(--card)", 
            border: "1px solid var(--border)", 
            borderRadius: 12, 
            padding: "20px 24px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ 
              width: 32, height: 32, borderRadius: 8, 
              background: "rgba(212, 136, 74, 0.1)", 
              display: "flex", alignItems: "center", justifyContent: "center" 
            }}>
              <Clock size={16} color="#d4884a" />
            </div>
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, margin: 0 }}>
                {t.dashboard.workingHours}
              </h2>
            </div>
          </div>


          <div style={{ 
            display: "flex", 
            gap: 16, 
            marginTop: 20, 
            alignItems: "flex-end", 
            flexWrap: "wrap" 
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)" }}>
                {t.dashboard.openingHour}
              </label>
              <select
                value={openingHour}
                onChange={(e) => setOpeningHour(e.target.value)}
                style={selectStyle}
              >
                {HOUR_OPTIONS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)" }}>
                {t.dashboard.closingHour}
              </label>
              <select
                value={closingHour}
                onChange={(e) => setClosingHour(e.target.value)}
                style={selectStyle}
              >
                {HOUR_OPTIONS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={updating}
              style={{
                padding: "9px 20px",
                background: saveSuccess ? "#2d7a2d" : "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: updating ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s ease",
                height: 38,
                boxSizing: "border-box"
              }}
            >
              {updating ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                  <span>{t.dashboard.savingSettings}</span>
                </>
              ) : saveSuccess ? (
                <span>{t.dashboard.settingsSaved}</span>
              ) : (
                <span>{t.dashboard.saveSettings}</span>
              )}
            </button>
          </div>

          {saveError && (
            <div style={{ 
              marginTop: 12, 
              padding: "8px 12px", 
              background: "#fde8e8", 
              borderRadius: 6, 
              color: "#a01a1a", 
              fontSize: 12.5,
              display: "inline-block"
            }}>
              {saveError}
            </div>
          )}
        </div>
      )}

      {/* Status row */}
      <div className="admin-status-row" style={{ display: "flex", gap: 12, marginBottom: 28 }}>
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
                className="animate-fade-in dashboard-appt-row"
                style={{
                  animationDelay: `${i * 40}ms`,
                  borderBottom: i < todayAppointments.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div className="dashboard-appt-time">
                  {format(new Date(appt.startTime), "HH:mm")}
                </div>

                <div className="dashboard-appt-avatar">
                  <Avatar name={appt.customer.name} size={36} />
                </div>

                <div className="dashboard-appt-info">
                  <div className="dashboard-appt-customer">
                    {appt.customer.name}
                  </div>
                  <div className="dashboard-appt-meta">
                    {appt.service.name} · {appt.staff.name}
                    <span className="dashboard-appt-duration-inline"> · {appt.service.duration}{t.services.min}</span>
                  </div>
                </div>

                <div className="dashboard-appt-duration">
                  <Clock size={12} />
                  <span>{appt.service.duration}{t.services.min}</span>
                </div>

                <div className="dashboard-appt-price">
                  <Price amount={appt.priceAtBooking} />
                </div>

                <div className="dashboard-appt-status">
                  <span className={`status-${appt.status.toLowerCase()}`}>
                    {appt.status === "SCHEDULED" ? t.appointments.statuses.scheduled
                    : appt.status === "COMPLETED" ? t.appointments.statuses.completed
                    : t.appointments.statuses.cancelled}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

const HOUR_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--background)",
  fontSize: 13.5,
  color: "var(--foreground)",
  outline: "none",
  minWidth: 100,
  height: 38,
  boxSizing: "border-box"
};

function getGreeting(t: ReturnType<typeof useLang>["t"]) {
  const h = new Date().getHours();
  if (h < 12) return t.dashboard.greeting_morning;
  if (h < 17) return t.dashboard.greeting_afternoon;
  return t.dashboard.greeting_evening;
}
