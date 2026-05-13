"use client";

import { TrendingUp, CalendarDays, CheckCircle, BarChart2, TurkishLira} from "lucide-react";
import { useLang } from "@/components/providers/language-provider";

type DayData = { date: string; count: number; revenue: number; cancelled: number; completed: number };
type ServiceStat = { name: string; count: number; revenue: number };
type StaffStat = { name: string; count: number; revenue: number };

type Props = {
  dailyData: DayData[];
  topServices: ServiceStat[];
  staffPerformance: StaffStat[];
  totalRevenue: number;
  totalCount: number;
  cancelledCount: number;
  completedCount: number;
};

const SERVICE_COLORS = ["#c9956b", "#7b9ec9", "#9ec97b", "#c97bb5", "#c9b56b", "#7bc9c9"];

export function ReportsClient({
  dailyData,
  topServices,
  staffPerformance,
  totalRevenue,
  totalCount,
  cancelledCount,
  completedCount,
}: Props) {
  const { t } = useLang();
  const maxRevenue = Math.max(...dailyData.map((d) => d.revenue), 1);
  const maxCount = Math.max(...dailyData.map((d) => d.count + d.cancelled), 1);
  const maxService = Math.max(...topServices.map((s) => s.count), 1);
  const maxStaff = Math.max(...staffPerformance.map((s) => s.count), 1);

  const avgRevenue = totalCount > 0 ? totalRevenue / totalCount : 0;
  const completionRate = (totalCount + cancelledCount) > 0
    ? Math.round((completedCount / (totalCount + cancelledCount)) * 100)
    : 0;

  const stats = [
    {
      label: t.reports.totalRevenue,
      value: `₺${totalRevenue.toFixed(2)}`,
      sub: t.reports.last7days,
      icon: TurkishLira,
      color: "#c9956b",
    },
    {
      label: t.reports.totalBookings,
      value: totalCount.toString(),
      sub: `${cancelledCount} ${t.reports.cancelled}`,
      icon: CalendarDays,
      color: "#7b9ec9",
    },
    {
      label: t.reports.AvgTicket,
      value: `₺${avgRevenue.toFixed(2)}`,
      sub: t.reports.perAppt,
      icon: TrendingUp,
      color: "#9ec97b",
    },
    {
      label: t.reports.completionRate,
      value: `${completionRate}%`,
      sub: `${completedCount} ${t.appointments.statuses.completed}`,
      icon: CheckCircle,
      color: "#c97bb5",
    },
  ];

  return (
    <div className="admin-page" style={{ padding: "32px 36px", maxWidth: 1100 }}>
      {/* Header */}
      <div className="admin-header" style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500 }}>{t.reports.title}</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>
          {t.reports.subtitle}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="admin-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="animate-fade-in"
            style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: stat.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <stat.icon size={16} color={stat.color} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontFamily: "var(--font-display)", fontWeight: 600 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>{stat.label}</div>
            <div style={{ fontSize: 11, color: stat.color, marginTop: 3 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="admin-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Revenue Bar Chart */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 22px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart2 size={15} color="var(--primary)" /> {t.reports.dailyRevenue}
          </h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
            {dailyData.map((day) => {
              const pct = (day.revenue / maxRevenue) * 100;
              const dayIndex = new Date(day.date + "T12:00:00").getDay();
              const dayLabel = [t.weekDays.sunday, t.weekDays.monday, t.weekDays.tuesday, t.weekDays.wedensday, t.weekDays.thursday, t.weekDays.friday, t.weekDays.saturday][dayIndex];
              return (
                <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", height: 16 }}>
                    {day.revenue > 0 ? `₺${day.revenue.toFixed(0)}` : ""}
                  </div>
                  <div
                    title={`${day.date}: ₺${day.revenue.toFixed(2)}`}
                    style={{
                      width: "100%",
                      height: `${Math.max(pct, 2)}%`,
                      background: "linear-gradient(to top, var(--primary), var(--accent))",
                      borderRadius: "4px 4px 0 0",
                      minHeight: 4,
                      transition: "height 0.3s ease",
                    }}
                  />
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", textAlign: "center" }}>
                    {dayLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bookings chart */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 22px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarDays size={15} color="var(--primary)" /> {t.reports.dailyBookings}
          </h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
            {dailyData.map((day) => {
              const totalBookings = day.count + day.cancelled;
              const completedPct = (day.count / maxCount) * 100;
              const cancelPct = (day.cancelled / maxCount) * 100;
              const dayIndex = new Date(day.date + "T12:00:00").getDay();
              const dayLabel = [t.weekDays.sunday, t.weekDays.monday, t.weekDays.tuesday, t.weekDays.wedensday, t.weekDays.thursday, t.weekDays.friday, t.weekDays.saturday][dayIndex];
              return (
                <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", height: 16 }}>
                    {totalBookings > 0 ? totalBookings : ""}
                  </div>
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", minHeight: 4 }}>
                    {day.cancelled > 0 && (
                      <div style={{ width: "100%", height: `${Math.max(cancelPct, 2)}%`, background: "#fde8e8", borderRadius: day.count > 0 ? "2px 2px 0 0" : "4px 4px 0 0", minHeight: 3 }} />
                    )}
                    <div
                      style={{
                        width: "100%",
                        height: `${Math.max(completedPct, 2)}%`,
                        background: "linear-gradient(to top, #7b9ec9, #a8c4e0)",
                        borderRadius: day.cancelled > 0 ? "0" : "4px 4px 0 0",
                        minHeight: 4,
                        flex: 1,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)", textAlign: "center" }}>
                    {dayLabel}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 11, color: "var(--muted-foreground)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#7b9ec9", display: "inline-block" }} />
              {t.appointments.statuses.completed}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "#fde8e8", display: "inline-block", border: "1px solid #fca5a5" }} />
              {t.reports.cancelled}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="admin-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Top Services */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 22px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, marginBottom: 18 }}>{t.reports.topServices}</h2>
          {topServices.length === 0 ? (
            <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{t.reports.noData}</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {topServices.map((svc, i) => {
                const pct = (svc.count / maxService) * 100;
                return (
                  <div key={svc.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: SERVICE_COLORS[i % SERVICE_COLORS.length], display: "inline-block", flexShrink: 0 }} />
                        {svc.name}
                      </div>
                      <div style={{ display: "flex", gap: 14 }}>
                        <span style={{ color: "var(--muted-foreground)" }}>{svc.count}x</span>
                        <span style={{ color: "var(--primary)", fontWeight: 500 }}>₺{svc.revenue.toFixed(0)}</span>
                      </div>
                    </div>
                    <div style={{ height: 5, background: "var(--muted)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: SERVICE_COLORS[i % SERVICE_COLORS.length], borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Staff Performance */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 22px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, marginBottom: 18 }}>{t.reports.staffPerformance}</h2>
          {staffPerformance.length === 0 ? (
            <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{t.reports.noData}</p>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {staffPerformance.map((s, i) => {
                const pct = (s.count / maxStaff) * 100;
                return (
                  <div key={s.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: "var(--primary-light)", color: "var(--primary)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 600,
                        }}>
                          {s.name.charAt(0)}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                        {i === 0 && <span style={{ fontSize: 11, color: "#c9956b" }}>⭐</span>}
                      </div>
                      <div style={{ display: "flex", gap: 14, fontSize: 13 }}>
                        <span style={{ color: "var(--muted-foreground)" }}>{s.count} {t.staff.appointments}</span>
                        <span style={{ color: "var(--primary)", fontWeight: 500 }}>₺{s.revenue.toFixed(0)}</span>
                      </div>
                    </div>
                    <div style={{ height: 5, background: "var(--muted)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, var(--primary), var(--accent))", borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
