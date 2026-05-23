"use client";

import { useTransition, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, CalendarDays, CheckCircle, BarChart2, TurkishLira, Target } from "lucide-react";
import { useLang } from "@/components/providers/language-provider";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

type DayData = { date: string; count: number; revenue: number; cancelled: number; completed: number };
type ServiceStat = { name: string; count: number; revenue: number };
type StaffStat = { name: string; count: number; revenue: number; bookedCount: number };

type Props = {
  dailyData: DayData[];
  topServices: ServiceStat[];
  staffPerformance: StaffStat[];
  totalRevenue: number;
  totalCount: number;
  cancelledCount: number;
  completedCount: number;
  activeRange: string;
  startDate: string;
  endDate: string;
  // Comparison data
  prevRevenue: number;
  prevCount: number;
  prevCancelledCount: number;
  prevCompletedCount: number;
  // Goal and Heatmap
  currentMonthRevenue: number;
  heatmapData: number[][];
};

const SERVICE_COLORS = ["#c9956b", "#7b9ec9", "#9ec97b", "#c97bb5", "#c9b56b", "#7bc9c9"];

// ----------------------------------------------------
// Revenue Chart Component (Chart.js Bar + Smooth Line)
// ----------------------------------------------------
interface RevenueChartProps {
  data: DayData[];
  t: any;
  lang: string;
}

function RevenueChart({ data, t, lang }: RevenueChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const isDark = document.documentElement.classList.contains("dark");
    const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
    const textColor = isDark ? "#a3a3a3" : "#737373";

    const labels = data.map((d) => {
      const date = new Date(d.date + "T12:00:00");
      const day = date.getDate();
      const monthIdx = date.getMonth();
      if (lang === "tr") {
        const trMonths = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
        return `${day} ${trMonths[monthIdx]}`;
      } else {
        const enMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${enMonths[monthIdx]} ${day}`;
      }
    });

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const primaryGrad = ctx.createLinearGradient(0, 0, 0, 200);
    primaryGrad.addColorStop(0, "rgba(212, 136, 74, 0.85)");
    primaryGrad.addColorStop(1, "rgba(212, 136, 74, 0.1)");

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            type: "line",
            label: lang === "tr" ? "Trend" : "Trend",
            data: data.map((d) => d.revenue),
            borderColor: "#f472b6", // pink/rose trend line
            borderWidth: 2.5,
            tension: 0.4, // smooth line
            pointRadius: 2,
            pointHoverRadius: 5,
            fill: false,
          },
          {
            type: "bar",
            label: t.reports.revenue,
            data: data.map((d) => d.revenue),
            backgroundColor: primaryGrad,
            borderRadius: 4, // rounded corners
            barPercentage: 0.5, // custom spacing
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: isDark ? "#1f1f1f" : "#ffffff",
            titleColor: isDark ? "#ffffff" : "#1f1f1f",
            bodyColor: isDark ? "#e5e5e5" : "#4b5563",
            borderColor: "var(--border)",
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                let label = context.dataset.label || "";
                if (label) label += ": ";
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-US", { style: "currency", currency: "TRY" }).format(context.parsed.y);
                }
                return label;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              font: { size: 10, family: "Inter, sans-serif" },
            },
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 10, family: "Inter, sans-serif" },
              callback: (value) => "₺" + value.toLocaleString(lang === "tr" ? "tr-TR" : "en-US"),
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, lang, t.reports.revenue]);

  return (
    <div className="reports-card" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 280 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#d4884a" }}>●</span> {t.reports.dailyRevenue}
        </h2>
      </div>
      <div style={{ flex: 1, position: "relative", minHeight: 200 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Reservations Chart Component (Chart.js Stacked Bar)
// ----------------------------------------------------
interface ReservationsChartProps {
  data: DayData[];
  t: any;
  lang: string;
}

function ReservationsChart({ data, t, lang }: ReservationsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const isDark = document.documentElement.classList.contains("dark");
    const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
    const textColor = isDark ? "#a3a3a3" : "#737373";

    const labels = data.map((d) => {
      const date = new Date(d.date + "T12:00:00");
      const day = date.getDate();
      const monthIdx = date.getMonth();
      if (lang === "tr") {
        const trMonths = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
        return `${day} ${trMonths[monthIdx]}`;
      } else {
        const enMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${enMonths[monthIdx]} ${day}`;
      }
    });

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: t.reports.completed || "Completed",
            data: data.map((d) => d.completed),
            backgroundColor: "#378add", // blue
            borderRadius: 4,
            barPercentage: 0.5,
          },
          {
            label: t.reports.cancelled || "Cancelled",
            data: data.map((d) => d.cancelled),
            backgroundColor: "#f09595", // soft red
            borderRadius: 4,
            barPercentage: 0.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: textColor,
              boxWidth: 10,
              boxHeight: 10,
              padding: 15,
              font: { size: 11, family: "Inter, sans-serif" },
            },
          },
          tooltip: {
            backgroundColor: isDark ? "#1f1f1f" : "#ffffff",
            titleColor: isDark ? "#ffffff" : "#1f1f1f",
            bodyColor: isDark ? "#e5e5e5" : "#4b5563",
            borderColor: "var(--border)",
            borderWidth: 1,
            padding: 10,
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: {
              color: textColor,
              font: { size: 10, family: "Inter, sans-serif" },
            },
          },
          y: {
            stacked: true,
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { size: 10, family: "Inter, sans-serif" },
              stepSize: 1,
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, lang, t.reports.completed, t.reports.cancelled]);

  return (
    <div className="reports-card" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 280 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#378add" }}>●</span> {t.reports.dailyBookings}
        </h2>
      </div>
      <div style={{ flex: 1, position: "relative", minHeight: 200 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Main ReportsClient View
// ----------------------------------------------------
export function ReportsClient({
  dailyData,
  topServices,
  staffPerformance,
  totalRevenue,
  totalCount,
  cancelledCount,
  completedCount,
  activeRange,
  startDate,
  endDate,
  prevRevenue,
  prevCount,
  prevCancelledCount,
  prevCompletedCount,
  currentMonthRevenue,
  heatmapData,
}: Props) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedRangeKey, setSelectedRangeKey] = useState(activeRange);
  const [customStart, setCustomStart] = useState(startDate.slice(0, 10));
  const [customEnd, setCustomEnd] = useState(endDate.slice(0, 10));

  const [mounted, setMounted] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(5000);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("reports_monthly_goal");
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) {
        setMonthlyGoal(parsed);
      }
    }
  }, []);

  useEffect(() => {
    setSelectedRangeKey(activeRange);
    setCustomStart(startDate.slice(0, 10));
    setCustomEnd(endDate.slice(0, 10));
  }, [activeRange, startDate, endDate]);

  const maxService = Math.max(...topServices.map((s) => s.count), 1);
  const maxStaff = Math.max(...staffPerformance.map((s) => s.count), 1);

  // Calculations for Stats
  const avgRevenue = completedCount > 0 ? totalRevenue / completedCount : 0;
  const prevAvgRevenue = prevCompletedCount > 0 ? prevRevenue / prevCompletedCount : 0;

  const completionRate = (completedCount + cancelledCount) > 0
    ? Math.round((completedCount / (completedCount + cancelledCount)) * 100)
    : 0;
  const prevCompletionRate = (prevCompletedCount + prevCancelledCount) > 0
    ? Math.round((prevCompletedCount / (prevCompletedCount + prevCancelledCount)) * 100)
    : 0;

  // Days Count Calculation for Staff Slots
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = Math.abs(end.getTime() - start.getTime());
  const daysCount = Math.max(Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1, 1);

  const handleRangeChange = (rangeKey: string) => {
    if (rangeKey === "custom") {
      setSelectedRangeKey("custom");
    } else {
      setSelectedRangeKey(rangeKey);
      startTransition(() => {
        router.push(`/reports?range=${rangeKey}`);
      });
    }
  };

  const handleGoalChange = (val: string) => {
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      setMonthlyGoal(parsed);
      localStorage.setItem("reports_monthly_goal", parsed.toString());
    } else if (val === "") {
      setMonthlyGoal(0);
      localStorage.setItem("reports_monthly_goal", "0");
    }
  };

  const ranges = [
    { key: "today", label: t.reports.today },
    { key: "7days", label: t.reports.last7days },
    { key: "thisMonth", label: t.reports.thisMonth },
    { key: "thisYear", label: t.reports.thisYear },
    { key: "custom", label: t.reports.customRange },
  ];

  // Helper for trend labels
  const getComparisonText = (range: string) => {
    switch (range) {
      case "today":
        return t.reports.trendToday;
      case "7days":
        return t.reports.trend7days;
      case "thisMonth":
        return t.reports.trendMonth;
      case "thisYear":
        return t.reports.trendYear;
      case "custom":
      default:
        return t.reports.trendCustom;
    }
  };

  const getNeutralText = (range: string) => {
    switch (range) {
      case "today":
        return t.reports.trendTodaySame;
      case "7days":
        return t.reports.trend7daysSame;
      case "thisMonth":
        return t.reports.trendMonthSame;
      case "thisYear":
        return t.reports.trendYearSame;
      case "custom":
      default:
        return t.reports.trendCustomSame;
    }
  };

  const renderTrend = (current: number, previous: number, isPercentage: boolean = false) => {
    let diff = current - previous;
    let pct = 0;
    if (previous > 0) {
      pct = Math.round((diff / previous) * 100);
    } else if (current > 0) {
      pct = 100;
    }

    const valToDisplay = isPercentage ? Math.round(diff) : pct;
    const compText = getComparisonText(activeRange);

    if (diff > 0) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#22c55e", fontSize: 11, marginTop: 6, fontWeight: 500 }}>
          <span style={{ fontSize: 12 }}>↑</span>
          <span>+{valToDisplay}% {compText}</span>
        </div>
      );
    } else if (diff < 0) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#ef4444", fontSize: 11, marginTop: 6, fontWeight: 500 }}>
          <span style={{ fontSize: 12 }}>↓</span>
          <span>{valToDisplay}% {compText}</span>
        </div>
      );
    } else {
      const neutralText = getNeutralText(activeRange);
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--muted-foreground)", fontSize: 11, marginTop: 6 }}>
          <span>—</span>
          <span>{neutralText}</span>
        </div>
      );
    }
  };

  const stats = [
    {
      label: t.reports.totalRevenue,
      value: `₺${totalRevenue.toFixed(0)}`,
      sub: `${lang === "tr" ? "Önceki" : "Previous"}: ₺${prevRevenue.toFixed(0)}`,
      icon: TurkishLira,
      color: "#d4884a",
      trend: renderTrend(totalRevenue, prevRevenue),
    },
    {
      label: t.reports.totalBookings,
      value: completedCount.toString(),
      sub: `${cancelledCount} ${t.reports.cancelled}`,
      icon: CalendarDays,
      color: "#378add",
      trend: renderTrend(completedCount, prevCompletedCount),
    },
    {
      label: t.reports.AvgTicket,
      value: `₺${avgRevenue.toFixed(0)}`,
      sub: `${lang === "tr" ? "Önceki" : "Previous"}: ₺${prevAvgRevenue.toFixed(0)}`,
      icon: TurkishLira,
      color: "#9ec97b",
      trend: renderTrend(avgRevenue, prevAvgRevenue),
    },
    {
      label: t.reports.completionRate,
      value: `${completionRate}%`,
      sub: `${completedCount} ${t.appointments.statuses.completed}`,
      icon: CheckCircle,
      color: "#c97bb5",
      trend: renderTrend(completionRate, prevCompletionRate, true),
    },
  ];

  const goalProgress = monthlyGoal > 0 ? Math.round((currentMonthRevenue / monthlyGoal) * 100) : 0;

  // Heatmap Labels and Matrix helpers
  const daysOfWeek = lang === "tr" 
    ? ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"] 
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const hourLabels = ["09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"];
  const maxDensity = Math.max(...heatmapData.flat(), 1);

  return (
    <div className="admin-page" style={{ padding: "24px 20px", maxWidth: 1100, opacity: isPending ? 0.6 : 1, transition: "opacity 0.15s ease", margin: "0 auto" }}>

      {/* Header Section */}
      <div className="admin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500 }}>
            {t.reports.title}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>
            {t.reports.subtitle}
          </p>
        </div>

        {/* Range Selection Pills */}
        <div 
          className="reports-range-container"
          style={{
            display: "flex",
            background: "var(--muted)",
            padding: 3,
            borderRadius: 8,
            border: "1px solid var(--border)",
            gap: 2,
            width: "100%",
            maxWidth: 460,
          }}
        >
          {ranges.map((r) => {
            const isActive = selectedRangeKey === r.key;
            return (
              <button
                key={r.key}
                onClick={() => handleRangeChange(r.key)}
                className="reports-range-btn"
                style={{
                  flex: 1,
                  padding: "6px 4px",
                  fontSize: 11,
                  fontWeight: 500,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: isActive ? "#d4884a" : "transparent",
                  color: isActive ? "#ffffff" : "var(--muted-foreground)",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  transition: "all 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Picker Collapse */}
      {selectedRangeKey === "custom" && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          padding: 16,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          flexWrap: "wrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)" }}>{t.reports.startDate}</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--background)",
                color: "var(--foreground)",
                fontSize: 13,
                outline: "none"
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)" }}>{t.reports.endDate}</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--background)",
                color: "var(--foreground)",
                fontSize: 13,
                outline: "none"
              }}
            />
          </div>
          <button
            onClick={() => {
              startTransition(() => {
                router.push(`/reports?range=custom&start=${customStart}&end=${customEnd}`);
              });
            }}
            disabled={isPending}
            style={{
              alignSelf: "flex-end",
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: "#d4884a",
              color: "white",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "opacity 0.2s",
              opacity: isPending ? 0.7 : 1
            }}
          >
            {t.reports.filter}
          </button>
        </div>
      )}

      {/* Metric Cards Row */}
      <div 
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
          gap: 14, 
          marginBottom: 24 
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "16px 18px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.01)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>{stat.label}</span>
                <div style={{ width: 30, height: 30, borderRadius: 6, background: stat.color + "12", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <stat.icon size={14} color={stat.color} />
                </div>
              </div>
              <div style={{ fontSize: 22, fontFamily: "var(--font-display)", fontWeight: 600 }}>{stat.value}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>{stat.sub}</div>
              {stat.trend}
            </div>
          </div>
        ))}

        {/* 5th Metric Card - Monthly Goal Progress */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "16px 18px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.01)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>{t.reports.monthlyGoalProgress}</span>
              <div style={{ width: 30, height: 30, borderRadius: 6, background: "rgba(212, 136, 74, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Target size={14} color="#d4884a" />
              </div>
            </div>
            <div style={{ fontSize: 22, fontFamily: "var(--font-display)", fontWeight: 600 }}>
              {goalProgress}%
            </div>
          </div>
          
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{t.reports.goal}: ₺</span>
              <input
                type="number"
                value={mounted ? (monthlyGoal === 0 ? "" : monthlyGoal) : 5000}
                onChange={(e) => handleGoalChange(e.target.value)}
                style={{
                  width: 60,
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px dashed var(--border)",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--foreground)",
                  outline: "none",
                  padding: "0 2px"
                }}
              />
            </div>
            
            <div style={{ width: "100%", height: 4, background: "var(--muted)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
              <div 
                style={{ 
                  height: "100%", 
                  width: `${Math.min(goalProgress, 100)}%`, 
                  background: "#d4884a", 
                  borderRadius: 2, 
                  transition: "width 0.3s ease" 
                }} 
              />
            </div>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 6 }}>
              ₺{currentMonthRevenue.toFixed(0)} / ₺{monthlyGoal.toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div 
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 480px), 1fr))", 
          gap: 16, 
          marginBottom: 16 
        }}
      >
        <RevenueChart data={dailyData} t={t} lang={lang} />
        <ReservationsChart data={dailyData} t={t} lang={lang} />
      </div>

      {/* Bottom Section - 3 Equal Columns */}
      <div 
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: 16,
          marginTop: 16
        }}
      >

        {/* 1. Popular Services */}
        <div 
          style={{
            background: "var(--card)",
            border: "0.5px solid var(--border)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 1px 2px rgba(0,0,0,0.01)"
          }}
        >
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, marginBottom: 14, fontWeight: 500, color: "var(--foreground)" }}>
            {t.reports.topServices}
          </h2>
          {topServices.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {t.reports.noData}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {topServices.slice(0, 5).map((svc, i) => {
                const pct = (svc.count / maxService) * 100;
                return (
                  <div key={svc.name} style={{
                    padding: "6px 8px",
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.01)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13, gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: SERVICE_COLORS[i % SERVICE_COLORS.length], display: "inline-block", flexShrink: 0 }} />
                        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{svc.name}</span>
                      </div>
                      <div style={{ display: "flex", gap: 14, flexShrink: 0 }}>
                        <span style={{ color: "var(--muted-foreground)" }}>{svc.count}x</span>
                        <span style={{ color: "var(--primary)", fontWeight: 600 }}>₺{svc.revenue.toFixed(0)}</span>
                      </div>
                    </div>
                    <div style={{ height: 4, background: "var(--muted)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: SERVICE_COLORS[i % SERVICE_COLORS.length], borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Staff Performance */}
        <div 
          style={{
            background: "var(--card)",
            border: "0.5px solid var(--border)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 1px 2px rgba(0,0,0,0.01)"
          }}
        >
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, marginBottom: 14, fontWeight: 500, color: "var(--foreground)" }}>
            {t.reports.staffPerformance}
          </h2>
          {staffPerformance.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {t.reports.noData}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {staffPerformance.map((s, i) => {
                const pct = (s.count / maxStaff) * 100;
                const totalSlots = daysCount * 5;
                const utilizationPct = totalSlots > 0 ? Math.min(Math.round((s.bookedCount / totalSlots) * 100), 100) : 0;

                return (
                  <div key={s.name} style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.01)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: "50%",
                          background: "rgba(212, 136, 74, 0.1)", 
                          color: "#d4884a",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 600,
                          flexShrink: 0
                        }}>
                          {s.name.charAt(0)}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{s.name}</span>
                        {i === 0 && <span style={{ fontSize: 11, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>#1</span>}
                      </div>
                      <div style={{ display: "flex", gap: 10, fontSize: 13, alignItems: "center", flexShrink: 0 }}>
                        <span style={{ color: "var(--muted-foreground)" }}>{s.count} {t.staff.appointments}</span>
                        <span style={{ color: "var(--primary)", fontWeight: 600 }}>₺{s.revenue.toFixed(0)}</span>
                      </div>
                    </div>
                    
                    <div style={{ height: 4, background: "var(--muted)", borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "var(--primary)", borderRadius: 2 }} />
                    </div>

                    {/* Staff Utilization Progress Bar */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--muted-foreground)" }}>
                        <span>{t.reports.staffUtilization}</span>
                        <span style={{ fontWeight: 500 }}>
                          {utilizationPct}% — {s.bookedCount}/{totalSlots} {s.bookedCount === 1 ? t.reports.slotFilled : t.reports.slotsFilled}
                        </span>
                      </div>
                      <div style={{ height: 4, background: "var(--muted)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${utilizationPct}%`, background: "#d4884a", borderRadius: 2 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Heatmap Grid */}
        <div 
          style={{
            background: "var(--card)",
            border: "0.5px solid var(--border)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 1px 2px rgba(0,0,0,0.01)"
          }}
        >
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 15, marginBottom: 4, fontWeight: 500, color: "var(--foreground)" }}>
            {t.reports.densityHeatmap}
          </h2>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>
            {t.reports.heatmapSubtitle}
          </p>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {/* Hours Header */}
            <div style={{ display: "grid", gridTemplateColumns: "32px repeat(12, 1fr)", gap: 4, marginBottom: 6, textAlign: "center" }}>
              <div />
              {hourLabels.map((h) => (
                <span key={h} style={{ fontSize: 9, fontWeight: 500, color: "var(--muted-foreground)" }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Matrix Rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {daysOfWeek.map((dayName, rIdx) => (
                <div key={dayName} style={{ display: "grid", gridTemplateColumns: "32px repeat(12, 1fr)", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted-foreground)" }}>
                    {dayName}
                  </span>
                  {heatmapData[rIdx].map((val, cIdx) => {
                    const opacity = val > 0 ? 0.15 + (val / maxDensity) * 0.85 : 0;
                    const bg = val > 0 ? `rgba(212, 136, 74, ${opacity})` : "var(--muted)";
                    
                    const fullDayName = lang === "tr"
                      ? ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"][rIdx]
                      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][rIdx];
                    
                    const appointmentsWord = lang === "tr" ? "randevu" : (val === 1 ? "booking" : "bookings");
                    const timeLabel = `${hourLabels[cIdx]}:00`;
                    const tooltipText = lang === "tr"
                      ? `${fullDayName} saat ${timeLabel} — ${val} ${appointmentsWord}`
                      : `${fullDayName} at ${timeLabel} — ${val} ${appointmentsWord}`;

                    return (
                      <div
                        key={cIdx}
                        title={tooltipText}
                        style={{
                          aspectRatio: "1/1",
                          background: bg,
                          borderRadius: 3,
                          cursor: "help",
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 14, fontSize: 11, color: "var(--muted-foreground)" }}>
            <span>{t.reports.low}</span>
            <div style={{ display: "flex", gap: 2 }}>
              <div style={{ width: 10, height: 10, borderRadius: 1.5, background: "var(--muted)" }} />
              <div style={{ width: 10, height: 10, borderRadius: 1.5, background: "rgba(212, 136, 74, 0.25)" }} />
              <div style={{ width: 10, height: 10, borderRadius: 1.5, background: "rgba(212, 136, 74, 0.55)" }} />
              <div style={{ width: 10, height: 10, borderRadius: 1.5, background: "rgba(212, 136, 74, 0.85)" }} />
            </div>
            <span>{t.reports.high}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
