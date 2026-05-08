"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/providers/language-provider";

type Service = { id: string; name: string; price: number; duration: number };
type Staff = { id: string; name: string; role: string };
type Customer = { id: string; name: string; phone?: string };
type UserPackage = {
  id: string;
  name: string;
  remainingSessions: number;
  totalSessions: number;
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
  notes?: string | null;
  userPackage?: UserPackage;
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
  const current = new Date(appt.startTime);
  const [dateStr, setDateStr] = useState(format(current, "yyyy-MM-dd"));
  const [timeStr, setTimeStr] = useState(format(current, "HH:mm"));
  const [notes, setNotes] = useState(appt.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        setError(data.error ?? "Failed to postpone");
        return;
      }
      onSaved(data);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Postpone Appointment
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 20 }}>
          {appt.customer.name} · {appt.service.name}
        </p>

        <div style={fieldGroup}>
          <label style={labelStyle}>New Date</label>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>New Time</label>
          <input
            type="time"
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={fieldGroup}>
          <label style={labelStyle}>Note (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Client postponed twice — charge extra ₺150"
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {error && (
          <p style={{ color: "#c0392b", fontSize: 12.5, marginBottom: 12 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={ghostBtnStyle} disabled={saving}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dateStr || !timeStr}
            style={{
              ...primaryBtnStyle,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Postpone"}
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
  const [notes, setNotes] = useState(appt.notes ?? "");
  const [saving, setSaving] = useState(false);

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
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
          Appointment Note
        </h3>
        <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 20 }}>
          {appt.customer.name} · {format(new Date(appt.startTime), "MMM d, h:mm a")}
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note about this appointment…"
          rows={4}
          style={{ ...inputStyle, resize: "vertical", marginBottom: 16 }}
          autoFocus
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={ghostBtnStyle}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ ...primaryBtnStyle, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving…" : "Save Note"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AppointmentsClient({
  initialAppointments,
  services,
  staff,
}: Props) {
  const router = useRouter();
  const { t } = useLang();

  const MONTHS = [
    t.months.january, t.months.february, t.months.march, t.months.april,
    t.months.may, t.months.june, t.months.july, t.months.august,
    t.months.september, t.months.october, t.months.november, t.months.december,
  ];

  const FULL_DAYS = [
    t.fullDays.sunday, t.fullDays.monday, t.fullDays.tuesday, t.fullDays.wednesday,
    t.fullDays.thursday, t.fullDays.friday, t.fullDays.saturday,
  ];

  const [appointments, setAppointments] = useState(initialAppointments);
  const [view, setView] = useState<View>("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterStaff, setFilterStaff] = useState("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Dialog state
  const [postponeAppt, setPostponeAppt] = useState<Appointment | null>(null);
  const [notesAppt, setNotesAppt] = useState<Appointment | null>(null);

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
    ? apptsByDay[format(selectedDate, "yyyy-MM-dd")] || []
    : [];

  const filteredList = appointments.filter((a) => {
    const matchSearch =
      !search ||
      a.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      a.customer.phone?.toLowerCase().includes(search.toLowerCase()) ||
      a.service.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "ALL" || a.status === filterStatus;
    const matchStaff = filterStaff === "ALL" || a.staffId === filterStaff;
    return matchSearch && matchStatus && matchStaff;
  });

  async function updateStatus(id: string, status: string) {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
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

  function handleNotesSaved(updated: Appointment) {
    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, notes: updated.notes } : a))
    );
  }

  const viewLabels: Record<View, string> = {
    calendar: t.appointments.calendar,
    list: t.appointments.list,
  };

  return (
    <div style={{ padding: "32px 36px" }}>
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

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500 }}>
            {t.appointments.title}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>
            {appointments.length} {t.appointments.totalAppointments}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
          {/* Calendar grid */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={navBtnStyle}>
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  style={{ ...navBtnStyle, fontSize: 12, padding: "4px 10px" }}
                >
                  {t.reports.today}
                </button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={navBtnStyle}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div style={{ padding: 16 }}>
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
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>
                {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a day"}
              </h3>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                {selectedDayAppts.length} appointment{selectedDayAppts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div style={{ overflowY: "auto", maxHeight: 500 }}>
              {selectedDayAppts.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
                  No appointments
                </div>
              ) : (
                selectedDayAppts.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    onStatusChange={updateStatus}
                    onDelete={deleteAppt}
                    onPostpone={() => setPostponeAppt(appt)}
                    onEditNotes={() => setNotesAppt(appt)}
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
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--muted-foreground)",
                }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.appointments.searchPlaceholder}
                style={{ ...listInputStyle, paddingLeft: 32, width: "100%" }}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={listInputStyle}
            >
              <option value="ALL">{t.appointments.allStatus}</option>
              <option value="SCHEDULED">{t.appointments.statuses.scheduled}</option>
              <option value="COMPLETED">{t.appointments.statuses.completed}</option>
              <option value="CANCELLED">{t.appointments.statuses.cancelled}</option>
            </select>
            <select
              value={filterStaff}
              onChange={(e) => setFilterStaff(e.target.value)}
              style={listInputStyle}
            >
              <option value="ALL">{t.appointments.allStaff}</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 140px 140px 90px 100px 180px",
                padding: "10px 18px",
                borderBottom: "1px solid var(--border)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted-foreground)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <span>{t.appointments.time}</span>
              <span>{t.appointments.customer}</span>
              <span>{t.appointments.service}</span>
              <span>{t.appointments.staffCol}</span>
              <span>{t.appointments.duration}</span>
              <span>{t.appointments.price}</span>
              <span>Actions</span>
            </div>
            {filteredList.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>
                {t.appointments.noFound}
              </div>
            ) : (
              filteredList.map((appt, i) => (
                <div
                  key={appt.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr 140px 140px 90px 100px 180px",
                    padding: "12px 18px",
                    borderBottom: i < filteredList.length - 1 ? "1px solid var(--border)" : "none",
                    alignItems: "center",
                    fontSize: 13.5,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>
                    {format(new Date(appt.startTime), "MMM d, h:mm a")}
                  </span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{appt.customer.name}</div>
                    {appt.customer.phone && (
                      <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
                        {appt.customer.phone}
                      </div>
                    )}
                    {appt.notes && (
                      <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontStyle: "italic", marginTop: 2 }}>
                        📝 {appt.notes}
                      </div>
                    )}
                  </div>
                  <span>{appt.service.name}</span>
                  <span>{appt.staff.name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--muted-foreground)", fontSize: 12.5 }}>
                    <Clock size={12} />
                    {appt.service.duration}
                    {t.services.min}
                  </span>
                  <span style={{ color: "var(--primary)", fontWeight: 500 }}>
                    ₺{appt.service.price}
                  </span>
                  <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                    {/* Status select */}
                    <select
                      value={appt.status}
                      onChange={(e) => updateStatus(appt.id, e.target.value)}
                      disabled={loadingId === appt.id}
                      style={{
                        padding: "3px 6px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                        background: "var(--muted)",
                        cursor: "pointer",
                      }}
                    >
                      <option value="SCHEDULED">{t.appointments.statuses.scheduled}</option>
                      <option value="COMPLETED">{t.appointments.statuses.completed}</option>
                      <option value="CANCELLED">{t.appointments.statuses.cancelled}</option>
                    </select>

                    {/* Postpone button — only for SCHEDULED */}
                    {appt.status === "SCHEDULED" && (
                      <button
                        title="Postpone"
                        onClick={() => setPostponeAppt(appt)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--muted-foreground)",
                          display: "flex",
                          alignItems: "center",
                          padding: 2,
                        }}
                      >
                        <CalendarClock size={15} />
                      </button>
                    )}

                    {/* Notes button */}
                    <button
                      title={appt.notes ? "Edit note" : "Add note"}
                      onClick={() => setNotesAppt(appt)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: appt.notes ? "var(--primary)" : "var(--muted-foreground)",
                        display: "flex",
                        alignItems: "center",
                        padding: 2,
                      }}
                    >
                      <FileText size={15} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteAppt(appt.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--muted-foreground)",
                        fontSize: 16,
                        lineHeight: 1,
                        padding: 2,
                      }}
                    >
                      ×
                    </button>
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
  onDelete,
  onPostpone,
  onEditNotes,
  loading,
  compact = false,
}: {
  appt: Appointment;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onPostpone: () => void;
  onEditNotes: () => void;
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
            {format(new Date(appt.startTime), "h:mm a")} · {appt.service.name}
          </div>
          {appt.notes && (
            <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", fontStyle: "italic", marginTop: 3 }}>
              📝 {appt.notes}
            </div>
          )}
        </div>
        <span
          className={`status-${appt.status.toLowerCase()}`}
          style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 500 }}
        >
          {statusLabel[appt.status] ?? appt.status.toLowerCase()}
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
                <CalendarClock size={11} /> Postpone
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
            <FileText size={11} /> {appt.notes ? "Note" : "Add note"}
          </button>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--primary)" }}>
          ₺{appt.service.price}
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