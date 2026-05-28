"use client";

import { useState, useMemo, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  List,
  Search,
  Clock,
  CalendarClock,
  FileText,
  Banknote,
  CreditCard,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useLang, CurrencySymbol, Price } from "@/components/providers/language-provider";
import { ar } from "date-fns/locale/ar";
import { tr } from "date-fns/locale/tr";
import { enUS } from "date-fns/locale/en-US";
import { Avatar } from "@/components/ui/avatar";

type Service = { id: string; name: string; price: number; duration: number };
type Staff = { id: string; name: string; role: string };
type Customer = { id: string; name: string; phone?: string };
type UserPackage = {
  id: string;
  name: string;
  remainingSessions: number;
  totalSessions: number;
  totalPrice?: number;
  paidAmount?: number;
} | null;

type Appointment = {
  id: string;
  startTime: Date | string;
  customer: Customer;
  status: string;
  staffId: string;
  serviceId: string;
  service: Service;
  staff: Staff;
  priceAtBooking: number;
  notes?: string | null;
  userPackage?: UserPackage;
  paymentMethod?: string | null;
};

type Props = {
  initialAppointments: Appointment[];
  services: Service[];
  staff: Staff[];
};

type View = "calendar" | "list";

// ── Postpone Dialog ───────────────────────────────────────────────────────────

function PostponeDialog({
  appt,
  onClose,
  onSaved,
}: {
  appt: Appointment;
  onClose: () => void;
  onSaved: (updated: Appointment) => void;
}) {
  const { t, lang } = useLang();
  const current = new Date(appt.startTime);
  const [dateStr, setDateStr] = useState(format(current, "yyyy-MM-dd"));
  const [timeStr, setTimeStr] = useState(format(current, "HH:mm"));
  const [notes, setNotes] = useState(appt.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openingHour, setOpeningHour] = useState("09:00");
  const [closingHour, setClosingHour] = useState("18:00");

  useEffect(() => {
    const mainEl = document.querySelector("main");
    const originalOverflow = mainEl ? mainEl.style.overflow : "";
    const originalBodyOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    if (mainEl) mainEl.style.overflow = "hidden";

    let active = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.salon) {
          if (data.salon.openingHour) setOpeningHour(data.salon.openingHour);
          if (data.salon.closingHour) setClosingHour(data.salon.closingHour);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
      document.body.style.overflow = originalBodyOverflow;
      if (mainEl) mainEl.style.overflow = originalOverflow;
    };
  }, []);

  const TIME_SLOTS = useMemo(() => {
    const allSlots = Array.from({ length: 48 }).map((_, i) => {
      const h = String(Math.floor(i / 2)).padStart(2, "0");
      const m = i % 2 === 0 ? "00" : "30";
      return `${h}:${m}`;
    });
    return allSlots.filter((slot) => slot >= openingHour && slot <= closingHour);
  }, [openingHour, closingHour]);

  const timeOptions = useMemo(() => {
    if (timeStr && !TIME_SLOTS.includes(timeStr)) {
      return [...TIME_SLOTS, timeStr].sort();
    }
    return TIME_SLOTS;
  }, [timeStr, TIME_SLOTS]);

  async function handleSave() {
    if (!dateStr || !timeStr) return;
    setSaving(true);
    setError("");
    try {
      const startTime = new Date(`${dateStr}T${timeStr}`).toISOString();
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "POSTPONE", startTime, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.apiErrors.updateFailed);
        return;
      }
      onSaved(data);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={overlayStyle}
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="admin-modal" style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          {t.appointments.postponeAppt}
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 20 }}>
          {appt.customer.name}  |  {appt.service.name}  |  {appt.staff.name}
        </p>

        <div style={fieldGroup}>
          <label style={labelStyle}>{t.appointments.newDate}</label>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>{t.appointments.newTime}</label>
          <select
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
            style={inputStyle}
          >
            {timeOptions.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>{t.appointments.note}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.appointments.postponeNotePlaceholder}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {error && (
          <p style={{ color: "#c0392b", fontSize: 12.5, marginBottom: 12 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={ghostBtnStyle} disabled={saving}>
            {t.appointments.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dateStr || !timeStr}
            style={{
              ...primaryBtnStyle,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? t.appointments.saving : t.appointments.postpone}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Notes Dialog ──────────────────────────────────────────────────────────────

function NotesDialog({
  appt,
  onClose,
  onSaved,
}: {
  appt: Appointment;
  onClose: () => void;
  onSaved: (updated: Appointment) => void;
}) {
  const { t, lang } = useLang();
  const [notes, setNotes] = useState(appt.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const mainEl = document.querySelector("main");
    const originalOverflow = mainEl ? mainEl.style.overflow : "";
    const originalBodyOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    if (mainEl) mainEl.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      if (mainEl) mainEl.style.overflow = originalOverflow;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        const data = await res.json();
        onSaved(data);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={overlayStyle}
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="admin-modal" style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          {t.appointments.ApptNote}
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 20 }}>
          {appt.customer.name} · {format(new Date(appt.startTime), "MMM d, HH:mm", { locale: lang === "ar" ? ar : (lang === "tr" ? tr : enUS) })}
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t.appointments.noteDialogPlaceholder}
          rows={4}
          style={{ ...inputStyle, resize: "vertical", marginBottom: 16 }}
          autoFocus
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={ghostBtnStyle}> {t.common.cancel}</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...primaryBtnStyle, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? t.appointments.saving : t.appointments.saveNote}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EditPrice Dialog ──────────────────────────────────────────────────────────

function EditPriceDialog({
  appt,
  onClose,
  onSaved,
}: {
  appt: Appointment;
  onClose: () => void;
  onSaved: (updated: Appointment) => void;
}) {
  const { t, lang } = useLang();
  const [price, setPrice] = useState(String(appt.priceAtBooking ?? appt.service.price));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const mainEl = document.querySelector("main");
    const originalOverflow = mainEl ? mainEl.style.overflow : "";
    const originalBodyOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    if (mainEl) mainEl.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      if (mainEl) mainEl.style.overflow = originalOverflow;
    };
  }, []);

  async function handleSave() {
    const newPrice = Number(price);
    if (isNaN(newPrice) || newPrice < 0) {
      setError(t.appointments.invalidPrice ?? "Invalid price");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceAtBooking: newPrice }),
      });
      if (res.ok) {
        const data = await res.json();
        onSaved(data);
        onClose();
      } else {
        const data = await res.json();
        setError(data.error ?? t.apiErrors.updateFailed);
      }
    } catch (err) {
      setError(t.apiErrors.updateFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={overlayStyle}
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="admin-modal" style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          {t.appointments.editPrice ?? "Edit Price"}
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 20 }}>
          {appt.customer.name} · {appt.service.name} · {format(new Date(appt.startTime), "MMM d, HH:mm", { locale: lang === "ar" ? ar : (lang === "tr" ? tr : enUS) })}
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6, color: "var(--muted-foreground)" }}>
            {t.appointments.price}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CurrencySymbol size={16} style={{ color: "var(--primary)" }} />
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              style={{ ...inputStyle, flex: 1, fontSize: 14 }}
              autoFocus
            />
          </div>
        </div>

        {error && (
          <div style={{ padding: "10px 12px", background: "#fde8e8", border: "1px solid #f4b5b5", borderRadius: 6, fontSize: 12, color: "#a01a1a", marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={ghostBtnStyle}>{t.common.cancel}</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...primaryBtnStyle, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? t.appointments.saving : t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}

function getDateHeader(dateStr: string, t: any, lang: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const todayKey = format(today, "yyyy-MM-dd");
  const tomorrowKey = format(tomorrow, "yyyy-MM-dd");

  if (dateStr === todayKey) {
    return t.appointments.today ?? "Today";
  }
  if (dateStr === tomorrowKey) {
    return t.appointments.tomorrow ?? "Tomorrow";
  }

  return format(date, "EEEE, d MMMM yyyy", {
    locale: lang === "ar" ? ar : (lang === "tr" ? tr : enUS),
  });
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AppointmentsClient({
  initialAppointments,
  staff,
}: Props) {
  const { t, lang, mounted } = useLang();

  const MONTHS = [
    t.months.january, t.months.february, t.months.march, t.months.april,
    t.months.may, t.months.june, t.months.july, t.months.august,
    t.months.september, t.months.october, t.months.november, t.months.december,
  ];

  const [appointments, setAppointments] = useState(initialAppointments);
  const [view, setView] = useState<View>("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterStaff, setFilterStaff] = useState("ALL");
  const [filterDateRange, setFilterDateRange] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Dialog state
  const [postponeAppt, setPostponeAppt] = useState<Appointment | null>(null);
  const [notesAppt, setNotesAppt] = useState<Appointment | null>(null);
  const [priceAppt, setPriceAppt] = useState<Appointment | null>(null);
  const [paymentPromptAppt, setPaymentPromptAppt] = useState<Appointment | null>(null);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const startPad = startOfMonth(currentMonth).getDay();

  const apptsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      const key = format(new Date(a.startTime), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [appointments]);

  const selectedDayAppts = selectedDate
    ? (apptsByDay[format(selectedDate, "yyyy-MM-dd")] || [])
      .slice()
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    : [];

  const filteredList = appointments.filter((a) => {
    const matchSearch =
      !search ||
      a.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      a.customer.phone?.toLowerCase().includes(search.toLowerCase()) ||
      a.service.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "ALL" || a.status === filterStatus;
    const matchStaff = filterStaff === "ALL" || a.staffId === filterStaff;

    let matchDate = true;
    if (filterDateRange !== "ALL") {
      const apptDate = new Date(a.startTime);
      const today = new Date();

      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      if (filterDateRange === "TODAY") {
        matchDate = apptDate >= startOfToday && apptDate <= endOfToday;
      } else if (filterDateRange === "TOMORROW") {
        const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
        const endOfTomorrow = new Date(endOfToday.getTime() + 24 * 60 * 60 * 1000);
        matchDate = apptDate >= startOfTomorrow && apptDate <= endOfTomorrow;
      } else if (filterDateRange === "THIS_WEEK") {
        const dayOfWeek = today.getDay(); // 0 is Sunday
        const startOfWeek = new Date(startOfToday.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        matchDate = apptDate >= startOfWeek && apptDate <= endOfWeek;
      } else if (filterDateRange === "THIS_MONTH") {
        const startOfMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        matchDate = apptDate >= startOfMonthDate && apptDate <= endOfMonthDate;
      }
    }

    return matchSearch && matchStatus && matchStaff && matchDate;
  })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const groupedAppointments = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    for (const appt of filteredList) {
      const dateKey = format(new Date(appt.startTime), "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(appt);
    }
    return groups;
  }, [filteredList]);

  async function updateStatus(id: string, status: string, paymentMethod?: string) {
    if (status === "COMPLETED" && !paymentMethod) {
      const appt = appointments.find((a) => a.id === id);
      if (appt) {
        if (appt.userPackage) {
          // Package session: bypass cash/card prompt
        } else {
          setPaymentPromptAppt(appt);
          return;
        }
      }
    }


    setLoadingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, paymentMethod: paymentMethod || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status, paymentMethod: updated.paymentMethod } : a))
        );
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteAppt(id: string) {
    if (!confirm(t.appointments.deleteConfirm)) return;
    setLoadingId(id);
    try {
      await fetch(`/api/appointments/${id}`, { method: "DELETE" });
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setLoadingId(null);
    }
  }

  function handlePostponeSaved(updated: Appointment) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
    );
  }

  function handlePriceSaved(updated: Appointment) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
    );
  }
  function handleNotesSaved(updated: Appointment) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, notes: updated.notes } : a))
    );
  }

  const viewLabels: Record<View, string> = {
    calendar: t.appointments.calendar,
    list: t.appointments.list,
  };

  if (!mounted) {
    return (
      <div className="admin-page" style={{ padding: "32px 36px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="admin-page" style={{ padding: "32px 36px" }}>
      {/* Dialogs */}
      {postponeAppt && (
        <PostponeDialog
          appt={postponeAppt}
          onClose={() => setPostponeAppt(null)}
          onSaved={handlePostponeSaved}
        />
      )}
      {notesAppt && (
        <NotesDialog
          appt={notesAppt}
          onClose={() => setNotesAppt(null)}
          onSaved={handleNotesSaved}
        />
      )}
      {priceAppt && (
        <EditPriceDialog
          appt={priceAppt}
          onClose={() => setPriceAppt(null)}
          onSaved={handlePriceSaved}
        />
      )}
      {paymentPromptAppt && (
        <PaymentPromptDialog
          appt={paymentPromptAppt}
          onClose={() => setPaymentPromptAppt(null)}
          onConfirm={(method) => {
            updateStatus(paymentPromptAppt.id, "COMPLETED", method);
            setPaymentPromptAppt(null);
          }}
        />
      )}

      {/* Header */}
      <div className="admin-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500 }}>
            {t.appointments.title}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>
            {appointments.length} {t.appointments.totalAppointments}
          </p>
        </div>
        <div className="admin-actions" style={{ display: "flex", gap: 10 }}>
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            {(["calendar", "list"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "8px 14px",
                  background: view === v ? "var(--primary)" : "var(--card)",
                  color: view === v ? "white" : "var(--muted-foreground)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {v === "calendar" ? <Calendar size={14} /> : <List size={14} />}
                {viewLabels[v]}
              </button>
            ))}
          </div>
          <Link
            href="/appointments/new"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              background: "var(--primary)",
              color: "white",
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            <Plus size={15} /> {t.appointments.newAppointment}
          </Link>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="admin-calendar-layout" style={{ display: "grid", gridTemplateColumns: "minmax(340px, 1fr) minmax(340px, 480px)", gap: 20 }}>
          {/* Calendar grid */}
          <div className="admin-calendar-scroll" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflowX: "auto", overflowY: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={navBtnStyle}>
                  {lang === "ar" ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  style={{ ...navBtnStyle, fontSize: 12, padding: "4px 10px" }}
                >
                  {t.reports.today}
                </button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={navBtnStyle}>
                  {lang === "ar" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>
            </div>

            <div className="admin-calendar-grid" style={{ padding: 16 }}>
              {/* Weekday headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8 }}>
                {[
                  t.weekDays.sunday,
                  t.weekDays.monday,
                  t.weekDays.tuesday,
                  t.weekDays.wedensday,
                  t.weekDays.thursday,
                  t.weekDays.friday,
                  t.weekDays.saturday,
                ].map((d) => (
                  <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", padding: "4px 0" }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                {Array.from({ length: startPad }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayAppts = apptsByDay[key] || [];
                  const isSelected =
                    selectedDate && format(selectedDate, "yyyy-MM-dd") === key;
                  const isToday = format(new Date(), "yyyy-MM-dd") === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(day)}
                      style={{
                        aspectRatio: "1",
                        borderRadius: 8,
                        border: isSelected
                          ? "2px solid var(--primary)"
                          : isToday
                            ? "1px solid var(--primary)"
                            : "1px solid transparent",
                        background: isSelected ? "var(--primary)" : "transparent",
                        color: isSelected ? "white" : "var(--foreground)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        position: "relative",
                      }}
                    >
                      {day.getDate()}
                      {dayAppts.length > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: 3,
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: isSelected ? "white" : "var(--primary)",
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Day detail panel */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>
                {selectedDate && format(selectedDate, "EEEE d MMMM", { locale: lang === "ar" ? ar : (lang === "tr" ? tr : enUS) })}
              </h3>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                {selectedDayAppts.length} {selectedDayAppts.length !== 1 ? t.appointments.appointments : t.appointments.appointment}
              </p>
            </div>
            <div className="admin-day-panel" style={{ overflowY: "auto", flex: 1, maxHeight: 620 }}>
              {selectedDayAppts.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                  {t.appointments.noAppointments}
                </div>
              ) : (
                selectedDayAppts.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    onStatusChange={updateStatus}
                    onPostpone={() => setPostponeAppt(appt)}
                    onEditNotes={() => setNotesAppt(appt)}
                    onEditPrice={() => setPriceAppt(appt)}
                    loading={loadingId === appt.id}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List view */
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: showFilters ? 12 : 20, alignItems: "center" }}>
            {/* Search */}
            <div className="admin-search" style={{ position: "relative", flex: 1 }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted-foreground)",
                }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.appointments.searchPlaceholder}
                style={{ ...listInputStyle, paddingLeft: 34, paddingRight: 12, width: "100%", height: 38, boxSizing: "border-box" }}
              />
            </div>

            {/* Mobile Filters Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 38,
                padding: "0 14px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: showFilters ? "var(--primary-light)" : "var(--card)",
                color: showFilters ? "var(--primary)" : "var(--foreground)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                flexShrink: 0
              }}
              className="mobile-filter-toggle"
            >
              <SlidersHorizontal size={14} />
              <span>{t.appointments.dateFilter ?? "Filters"}</span>
            </button>
          </div>

          {/* Collapsible Dropdowns Panel */}
          <div className={`filters-dropdown-panel ${showFilters ? "show" : ""}`}>
            <div style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 20,
            }}>
              {/* Date Range Select */}
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                style={{ ...listInputStyle, height: 38, flex: "1 1 120px" }}
              >
                <option value="ALL">{t.appointments.allDates ?? "All Dates"}</option>
                <option value="TODAY">{t.appointments.today ?? "Today"}</option>
                <option value="TOMORROW">{t.appointments.tomorrow ?? "Tomorrow"}</option>
                <option value="THIS_WEEK">{t.appointments.thisWeek ?? "This Week"}</option>
                <option value="THIS_MONTH">{t.appointments.thisMonth ?? "This Month"}</option>
              </select>

              {/* Status Select */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ ...listInputStyle, height: 38, flex: "1 1 120px" }}
              >
                <option value="ALL">{t.appointments.allStatus}</option>
                <option value="SCHEDULED">{t.appointments.statuses.scheduled}</option>
                <option value="COMPLETED">{t.appointments.statuses.completed}</option>
                <option value="CANCELLED">{t.appointments.statuses.cancelled}</option>
              </select>

              {/* Staff Select */}
              <select
                value={filterStaff}
                onChange={(e) => setFilterStaff(e.target.value)}
                style={{ ...listInputStyle, height: 38, flex: "1 1 120px" }}
              >
                <option value="ALL">{t.appointments.allStaff}</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Timeline list of cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredList.length === 0 ? (
              <div style={{ padding: "60px 40px", textAlign: "center", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--muted-foreground)" }}>
                <Calendar size={32} style={{ margin: "0 auto 12px", opacity: 0.4, color: "var(--muted-foreground)" }} />
                <p>{t.appointments.noFound}</p>
              </div>
            ) : (
              Object.keys(groupedAppointments).map((dateKey) => (
                <div key={dateKey} style={{ marginBottom: 12 }}>
                  {/* Group Date Header */}
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--muted-foreground)",
                    marginTop: 20,
                    marginBottom: 12,
                    paddingBottom: 6,
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}>
                    <Calendar size={14} style={{ color: "var(--primary)" }} />
                    <span>{getDateHeader(dateKey, t, lang)}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 500,
                      background: "var(--muted)",
                      color: "var(--muted-foreground)",
                      padding: "2px 8px",
                      borderRadius: 10,
                      marginInlineStart: "auto"
                    }}>
                      {groupedAppointments[dateKey].length} {groupedAppointments[dateKey].length === 1 ? t.appointments.appointment : t.appointments.appointments}
                    </span>
                  </div>

                  {/* Appointments in this Day */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {groupedAppointments[dateKey].map((appt) => {
                      const statusLabel: Record<string, string> = {
                        SCHEDULED: t.appointments.statuses.scheduled,
                        COMPLETED: t.appointments.statuses.completed,
                        CANCELLED: t.appointments.statuses.cancelled,
                      };

                      return (
                        <div
                          key={appt.id}
                          className="appointment-timeline-card"
                          style={{
                            display: "flex",
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderInlineStart: `4px solid ${appt.status === "COMPLETED"
                                ? "#2d7a2d"
                                : appt.status === "CANCELLED"
                                  ? "#a01a1a"
                                  : "var(--primary)"
                              }`,
                            borderRadius: 10,
                            padding: "14px 18px",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.01)",
                            alignItems: "center",
                            justifyContent: "space-between",
                            position: "relative",
                            opacity: loadingId === appt.id ? 0.6 : 1,
                            flexWrap: "wrap",
                            gap: 12
                          }}
                        >
                          {/* Left section: Time and initials avatar */}
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 200px" }}>
                            {/* Time slot */}
                            <div style={{ display: "flex", flexDirection: "column", minWidth: 70 }}>
                              <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", gap: 4 }}>
                                <Clock size={12} style={{ opacity: 0.6 }} />
                                {format(new Date(appt.startTime), "HH:mm")}
                              </span>
                              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                                {appt.service.duration} {t.appointments.minutes ?? "mins"}
                              </span>
                            </div>

                            {/* Circular dynamic avatar */}
                            <Avatar name={appt.customer.name} size={36} />

                            {/* Customer details */}
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--foreground)" }}>
                                {appt.customer.name}
                              </span>
                              {appt.customer.phone && (
                                <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
                                  {appt.customer.phone}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Center section: Service & Staff */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", flex: "1 1 240px" }}>
                            {/* Service label */}
                            <span style={{
                              fontSize: 11.5,
                              fontWeight: 500,
                              background: "var(--primary-light)",
                              color: "var(--primary)",
                              padding: "3px 8px",
                              borderRadius: 6
                            }}>
                              {appt.service.name}
                            </span>
                            {/* Staff label */}
                            <span style={{
                              fontSize: 11.5,
                              color: "var(--secondary-foreground)",
                              background: "var(--secondary)",
                              padding: "3px 8px",
                              borderRadius: 6,
                              display: "flex",
                              alignItems: "center",
                              gap: 4
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)" }} />
                              {appt.staff.name}
                            </span>

                            {/* Appt note */}
                            {appt.notes && (
                              <span style={{
                                fontSize: 11,
                                color: "var(--muted-foreground)",
                                fontStyle: "italic",
                                background: "var(--background)",
                                padding: "2px 8px",
                                borderRadius: 6,
                                borderInlineStart: "2px solid var(--border)",
                                maxWidth: "200px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }} title={appt.notes}>
                                {appt.notes}
                              </span>
                            )}
                          </div>

                          {/* Right section: Price, status, and actions */}
                          <div style={{ display: "flex", alignItems: "center", justifySelf: "flex-end", gap: 14, flexWrap: "wrap", marginInlineStart: "auto" }}>
                            {/* Price and Status pill */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                              <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--primary)" }}>
                                <Price amount={appt.priceAtBooking != null ? appt.priceAtBooking : appt.service.price} />
                              </span>
                              <span
                                className={`status-${appt.status.toLowerCase()}`}
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 10,
                                  fontSize: 10.5,
                                  fontWeight: 500,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                              >
                                {appt.status === "SCHEDULED" && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#1a6fa0", display: "inline-block" }} />}
                                {appt.status === "COMPLETED" && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#2d7a2d", display: "inline-block" }} />}
                                {appt.status === "CANCELLED" && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#a01a1a", display: "inline-block" }} />}
                                {statusLabel[appt.status] ?? appt.status.toLowerCase()}
                                {appt.userPackage ? (
                                  appt.userPackage.totalPrice != null &&
                                  appt.userPackage.paidAmount != null &&
                                  appt.userPackage.paidAmount >= appt.userPackage.totalPrice ?
                                    ` (${t.customers.packageBadge} - ${t.appointments.fullyPaid})` :
                                    ` (${t.customers.packageBadge})`
                                ) : (
                                  appt.status === "COMPLETED" && appt.paymentMethod && ` (${appt.paymentMethod === "CASH" ? t.appointments.cash : t.appointments.card})`
                                )}
                              </span>
                              {appt.userPackage && (
                                <span style={{
                                  fontSize: 10,
                                  color: "var(--muted-foreground)",
                                  background: "var(--muted)",
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  marginTop: 1
                                }}>
                                  {t.customers.packageBadge ?? "Package"}
                                </span>
                              )}
                            </div>

                            {/* Actions block */}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {/* Quick status change controls */}
                              {appt.status === "SCHEDULED" ? (
                                <>
                                  <button
                                    onClick={() => updateStatus(appt.id, "COMPLETED")}
                                    disabled={loadingId === appt.id}
                                    style={{ ...smallBtnStyle, color: "#2d7a2d", background: "#e8f5e8", display: "flex", alignItems: "center", gap: 4 }}
                                    className="action-btn"
                                  >
                                    <span style={{ fontWeight: 600 }}>✓</span> {t.appointments.complete}
                                  </button>
                                  <button
                                    onClick={() => updateStatus(appt.id, "CANCELLED")}
                                    disabled={loadingId === appt.id}
                                    style={{ ...smallBtnStyle, color: "#a01a1a", background: "#fde8e8", display: "flex", alignItems: "center", gap: 4 }}
                                    className="action-btn"
                                  >
                                    <span style={{ fontSize: 14 }}>×</span> {t.common.cancel}
                                  </button>
                                  <button
                                    onClick={() => setPostponeAppt(appt)}
                                    disabled={loadingId === appt.id}
                                    style={{ ...smallBtnStyle, color: "#5a4a00", background: "#fef9e7", display: "flex", alignItems: "center", gap: 4 }}
                                    className="action-btn"
                                  >
                                    <CalendarClock size={12} /> {t.appointments.postpone}
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => updateStatus(appt.id, "SCHEDULED")}
                                  disabled={loadingId === appt.id}
                                  style={{ ...smallBtnStyle, color: "var(--muted-foreground)", background: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}
                                  className="action-btn"
                                >
                                  <Clock size={12} /> {t.appointments.statuses.scheduled}
                                </button>
                              )}

                              {/* Price Edit button */}
                              {appt.status === "SCHEDULED" && !appt.userPackage && (
                                <button
                                  onClick={() => setPriceAppt(appt)}
                                  disabled={loadingId === appt.id}
                                  style={{ ...smallBtnStyle, color: "var(--primary)", background: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}
                                  className="action-btn"
                                >
                                  <CurrencySymbol size={12} /> {t.appointments.editPrice ?? "Edit Price"}
                                </button>
                              )}

                              {/* Notes button */}
                              <button
                                onClick={() => setNotesAppt(appt)}
                                disabled={loadingId === appt.id}
                                style={{
                                  ...smallBtnStyle,
                                  color: appt.notes ? "var(--primary)" : "var(--muted-foreground)",
                                  background: appt.notes ? "var(--primary-light)" : "var(--muted)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4
                                }}
                                className="action-btn"
                              >
                                <FileText size={12} /> {appt.notes ? t.appointments.editNote : t.appointments.addNote}
                              </button>

                              {/* Delete button */}
                              <button
                                onClick={() => deleteAppt(appt.id)}
                                disabled={loadingId === appt.id}
                                style={{ ...smallBtnStyle, color: "var(--destructive)", background: "#fde8e8", display: "flex", alignItems: "center", gap: 4 }}
                                className="action-btn-danger"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                {t.common.delete}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── AppointmentCard (calendar day panel) ──────────────────────────────────────

function AppointmentCard({
  appt,
  onStatusChange,
  onPostpone,
  onEditNotes,
  onEditPrice,
  loading,
  compact = false,
}: {
  appt: Appointment;
  onStatusChange: (id: string, status: string) => void;
  onPostpone: () => void;
  onEditNotes: () => void;
  onEditPrice: () => void;
  loading: boolean;
  compact?: boolean;
}) {
  const { t } = useLang();

  const statusLabel: Record<string, string> = {
    SCHEDULED: t.appointments.statuses.scheduled,
    COMPLETED: t.appointments.statuses.completed,
    CANCELLED: t.appointments.statuses.cancelled,
  };

  return (
    <div
      style={{
        padding: compact ? "12px 18px" : "16px 22px",
        borderBottom: "1px solid var(--border)",
        opacity: loading ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div>
          <div style={{ fontWeight: 500, fontSize: 13.5 }}>{appt.customer.name}</div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {format(new Date(appt.startTime), "HH:mm")}–{format(new Date(new Date(appt.startTime).getTime() + appt.service.duration * 60000), "HH:mm")} · {appt.service.name}
          </div>
          {appt.notes && (
            <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontStyle: "italic", marginTop: 3 }}>
              {appt.notes}
            </div>
          )}
        </div>
        <span
          className={`status-${appt.status.toLowerCase()}`}
          style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500 }}
        >
          {statusLabel[appt.status] ?? appt.status.toLowerCase()}
          {appt.userPackage ? (
            appt.userPackage.totalPrice != null &&
            appt.userPackage.paidAmount != null &&
            appt.userPackage.paidAmount >= appt.userPackage.totalPrice ?
              ` (${t.customers.packageBadge} - ${t.appointments.fullyPaid})` :
              ` (${t.customers.packageBadge})`
          ) : (
            appt.status === "COMPLETED" && appt.paymentMethod && (
              ` (${appt.paymentMethod === "CASH" ? t.appointments.cash : t.appointments.card})`
            )
          )}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {appt.status === "SCHEDULED" && (
            <>
              <button
                onClick={() => onStatusChange(appt.id, "COMPLETED")}
                style={{ ...smallBtnStyle, color: "#2d7a2d", background: "#e8f5e8" }}
              >
                {t.appointments.complete}
              </button>
              <button
                onClick={() => onStatusChange(appt.id, "CANCELLED")}
                style={{ ...smallBtnStyle, color: "#a01a1a", background: "#fde8e8" }}
              >
                {t.common.cancel}
              </button>
              <button
                onClick={onPostpone}
                style={{ ...smallBtnStyle, color: "#5a4a00", background: "#fef9e7", display: "flex", alignItems: "center", gap: 4 }}
              >
                <CalendarClock size={11} /> {t.appointments.postpone}
              </button>
            </>
          )}
          <button
            onClick={onEditNotes}
            style={{
              ...smallBtnStyle,
              color: appt.notes ? "var(--primary)" : "var(--muted-foreground)",
              background: "var(--muted)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <FileText size={11} /> {appt.notes ? t.appointments.editNote : t.appointments.addNote}
          </button>
          {appt.status === "SCHEDULED" && !appt.userPackage && (
            <button
              onClick={onEditPrice}
              style={{
                ...smallBtnStyle,
                color: "var(--primary)",
                background: "var(--muted)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <CurrencySymbol size={12} /> {t.appointments.editPrice ?? "Edit Price"}
            </button>
          )}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--primary)" }}>
          <Price amount={appt.priceAtBooking != null ? appt.priceAtBooking : appt.service.price} />
        </div>
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  padding: "5px 8px",
  background: "var(--muted)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  color: "var(--foreground)",
};

const listInputStyle: React.CSSProperties = {
  padding: "8px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--card)",
  fontSize: 13,
  color: "var(--foreground)",
  outline: "none",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--card)",
  fontSize: 13,
  color: "var(--foreground)",
  outline: "none",
  boxSizing: "border-box",
};

const smallBtnStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "28px 32px",
  width: 420,
  maxWidth: "90vw",
  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
};

const fieldGroup: React.CSSProperties = {
  marginBottom: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--muted-foreground)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  cursor: "pointer",
  fontSize: 13,
  color: "var(--foreground)",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: 8,
  border: "none",
  background: "var(--primary)",
  color: "white",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
};

// ── PaymentPrompt Dialog ──────────────────────────────────────────────────────

function PaymentPromptDialog({
  appt,
  onClose,
  onConfirm,
}: {
  appt: Appointment;
  onClose: () => void;
  onConfirm: (method: string) => void;
}) {
  const { t, lang } = useLang();

  useEffect(() => {
    const mainEl = document.querySelector("main");
    const originalOverflow = mainEl ? mainEl.style.overflow : "";
    const originalBodyOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    if (mainEl) mainEl.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      if (mainEl) mainEl.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 1000,
      }}
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div
        className="animate-scale-in admin-modal"
        style={{
          background: "var(--card)", borderRadius: 14, padding: "28px 30px",
          width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hover translation styling */}
        <style dangerouslySetInnerHTML={{
          __html: `
          .payment-opt-btn:hover {
            transform: translateY(-2px);
            filter: brightness(0.96);
          }
        `}} />

        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: "0 0 8px 0", textAlign: lang === "ar" ? "right" : "left" }}>
          {t.appointments.selectPaymentMethod}
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 24, textAlign: lang === "ar" ? "right" : "left" }}>
          {appt.customer.name} · {appt.service.name} · <Price amount={appt.priceAtBooking} />
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {/* Cash Option */}
          <button
            onClick={() => onConfirm("CASH")}
            style={{
              padding: "20px 16px",
              background: "var(--primary-light)",
              border: "1px solid var(--primary)",
              borderRadius: 10,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              transition: "transform 0.15s, background 0.15s",
            }}
            className="payment-opt-btn"
          >
            <Banknote size={24} color="var(--primary)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>
              {t.appointments.cash}
            </span>
          </button>

          {/* Card Option */}
          <button
            onClick={() => onConfirm("CARD")}
            style={{
              padding: "20px 16px",
              background: "var(--primary-light)",
              border: "1px solid var(--primary)",
              borderRadius: 10,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              transition: "transform 0.15s, background 0.15s",
            }}
            className="payment-opt-btn"
          >
            <CreditCard size={24} color="var(--primary)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>
              {t.appointments.card}
            </span>
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: lang === "ar" ? "flex-start" : "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px", background: "var(--muted)",
              border: "1px solid var(--border)", borderRadius: 8,
              cursor: "pointer", fontSize: 13, color: "var(--foreground)",
            }}
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
