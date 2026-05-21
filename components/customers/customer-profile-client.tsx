"use client";

import { useState } from "react";
import { Prisma } from "@/app/generated/prisma";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone, Calendar, Package, ArrowLeft,
  Pencil, Trash2, Check, X, CalendarClock, FileText,
} from "lucide-react";
import { useLang } from "@/components/providers/language-provider";
import { format } from "date-fns";
import { tr, enUS } from "date-fns/locale";
import { localizePackageName, localizeInstallmentNote } from "@/lib/package-utils";

type CustomerWithDetails = Prisma.CustomerGetPayload<{
  include: {
    appointments: { include: { service: true; staff: true; userPackage: true } };
    packages: {
      include: {
        service: true;
        installments: true;
        _count: { select: { appointments: true } };
      };
    };
  };
}>;

type Staff = { id: string; name: string; role: string };

export function CustomerProfileClient({
  customer,
  staffList,
}: {
  customer: CustomerWithDetails;
  staffList: Staff[];
}) {
  const router = useRouter();
  const { t, lang, mounted } = useLang();
  const dateLocale = lang === "tr" ? tr : enUS;

  const fmt = (date: Date | string, pattern: string) => {
    if (!mounted) return "";
    return format(new Date(date), pattern, { locale: dateLocale });
  };

  const activePackages = customer.packages.filter((p) => p.remainingSessions > 0);
  const completedPackages = customer.packages.filter((p) => p.remainingSessions === 0);

  const totalSpent = customer.packages.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalOwed = customer.packages.reduce(
    (sum, p) => sum + Math.max(0, p.totalPrice - p.paidAmount),
    0
  );

  const translateInstallmentNote = (note?: string | null) => {
    if (!note) return "";
    if (note === "Paid at booking") return t.customers.paidAtBooking;
    if (note === "Session payment") return t.customers.sessionPayment;
    if (note === "Advance payment for next session") return t.customers.advancePaymentForNextSession;
    return note;
  };

  return (
    <div className="admin-page" style={{ padding: "32px 36px", maxWidth: 820 }}>

      {/* Back */}
      <Link
        href="/customers"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", fontSize: 13, textDecoration: "none", marginBottom: 20 }}
      >
        <ArrowLeft size={14} /> {t.customers.back}
      </Link>

      {/* ── Profile Header ───────────────────────────────────────── */}
      <div className="admin-card-row" style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 14, padding: "24px 28px", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "var(--primary-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, color: "var(--primary)",
            flexShrink: 0,
          }}>
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600, margin: 0 }}>
              {customer.name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
              <Phone size={12} /> {customer.phone}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
              {t.customers.customerSince} {fmt(customer.createdAt, "MMMM yyyy")}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="admin-card-row-right" style={{ display: "flex", gap: 28, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{customer.appointments.length}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{t.appointments.appointments}</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{customer.packages.length}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{t.customers.packages}</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--primary)" }}>₺{totalSpent.toFixed(0)}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{t.customers.totalSpent}</div>
          </div>
          {totalOwed > 0 && (
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#c45c5c" }}>₺{totalOwed.toFixed(0)}</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{t.customers.totalOwed}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Staff Notes ──────────────────────────────────────────── */}
      <CustomerNotesCard customerId={customer.id} initialNotes={customer.notes ?? null} />

      {/* ── Active Packages ──────────────────────────────────────── */}
      {activePackages.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
            <Package size={15} color="var(--primary)" /> {t.customers.activePackages}
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            {activePackages.map((pkg) => {
              const usedSessions = pkg.totalSessions - pkg.remainingSessions;
              const progressPct = (usedSessions / pkg.totalSessions) * 100;
              const lowSessions = pkg.remainingSessions < 2;
              const balance = pkg.totalPrice - pkg.paidAmount;

              return (
                <div key={pkg.id} style={{
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "18px 22px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{localizePackageName(pkg.name, t)}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                        {t.customers.started} {fmt(pkg.createdAt, "d MMM yyyy")}
                        {pkg.service && (
                          <span style={{ marginLeft: 8, color: "var(--primary)" }}>
                            · {pkg.service.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {/* Schedule Next Session button */}
                      <ScheduleNextSessionDialog
                        pkg={pkg}
                        staffList={staffList}
                        onScheduled={() => router.refresh()}
                      />
                      <div style={{ textAlign: "right" }}>
                        <div style={{
                          fontSize: 15, fontWeight: 700,
                          color: lowSessions ? "#c45c5c" : "var(--foreground)",
                        }}>
                          {pkg.remainingSessions} {t.customers.sessionsLeft}
                        </div>
                        {lowSessions && (
                          <div style={{ fontSize: 11, color: "#c45c5c", marginTop: 2 }}>
                            ⚠ {t.customers.runningLow}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Session progress bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 5 }}>
                      <span>
                        {t.customers.sessionsUsed
                          .replace("{used}", String(usedSessions))
                          .replace("{total}", String(pkg.totalSessions))}
                      </span>
                      <span>{Math.round(progressPct)}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: "var(--muted)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${progressPct}%`,
                        borderRadius: 4,
                        background: lowSessions ? "#c45c5c" : "var(--primary)",
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>

                  {/* Payment info */}
                  <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
                    <div>
                      <span style={{ color: "var(--muted-foreground)" }}>{t.customers.Total}: </span>
                      <strong>₺{pkg.totalPrice.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted-foreground)" }}>{t.customers.totalSpent}: </span>
                      <strong style={{ color: "var(--primary)" }}>₺{pkg.paidAmount.toFixed(2)}</strong>
                    </div>
                    {balance > 0 && (
                      <div>
                        <span style={{ color: "var(--muted-foreground)" }}>{t.customers.totalOwed}: </span>
                        <strong style={{ color: "#c45c5c" }}>₺{balance.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>

                  {/* Installments */}
                  {pkg.installments.length > 0 && (
                    <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {t.customers.payments}
                      </div>
                      <div style={{ display: "grid", gap: 5 }}>
                        {pkg.installments.map((inst) => (
                          <div key={inst.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                            <span style={{ color: "var(--muted-foreground)" }}>
                              {fmt(inst.paidAt, "dd MMMM yyyy")}
                              {inst.note && ` · ${translateInstallmentNote(inst.note)}`}
                            </span>
                            <strong style={{ color: "var(--primary)" }}>₺{inst.amount.toFixed(2)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Appointment History ──────────────────────────────────── */}
      <section style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
          <Calendar size={15} color="var(--primary)" /> {t.customers.history}
        </h2>

        {customer.appointments.length === 0 ? (
          <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{t.customers.noHistory}</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {customer.appointments.map((appt) => {
              const statusColor =
                appt.status === "COMPLETED" ? "#2d7a2d"
                  : appt.status === "CANCELLED" ? "#c45c5c"
                    : "var(--primary)";

              const statusLabel =
                appt.status === "COMPLETED" ? t.appointments.statuses.completed
                  : appt.status === "CANCELLED" ? t.appointments.statuses.cancelled
                    : t.appointments.statuses.scheduled;

              return (
                <AppointmentHistoryRow
                  key={appt.id}
                  appt={appt}
                  statusColor={statusColor}
                  statusLabel={statusLabel}
                  fmt={fmt}
                  packageBadgeLabel={t.customers.packageBadge}
                  t={t}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ── Completed Packages ───────────────────────────────────── */}
      {completedPackages.length > 0 && (
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 7, color: "var(--muted-foreground)" }}>
            <Package size={15} /> {t.customers.completedPackages}
          </h2>
          <div style={{ display: "grid", gap: 8 }}>
            {completedPackages.map((pkg) => (
              <div key={pkg.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "13px 18px",
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 10, opacity: 0.7,
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13.5 }}>{localizePackageName(pkg.name, t)}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    {t.customers.completedSessions.replace("{total}", String(pkg.totalSessions))}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>₺{pkg.paidAmount.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{t.customers.ofTotal} ₺{pkg.totalPrice.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Appointment History Row — with inline note display + edit
// ─────────────────────────────────────────────────────────────────────────────

type ApptRow = {
  id: string;
  startTime: Date | string;
  status: string;
  priceAtBooking: number;
  notes?: string | null;
  service: { name: string };
  staff: { name: string };
  userPackage?: { id: string; name: string } | null;
};

function AppointmentHistoryRow({
  appt,
  statusColor,
  statusLabel,
  fmt,
  packageBadgeLabel,
  t,
}: {
  appt: ApptRow;
  statusColor: string;
  statusLabel: string;
  fmt: (d: Date | string, p: string) => string;
  packageBadgeLabel: string;
  t: any;
}) {
  const [notes, setNotes] = useState(appt.notes ?? "");
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(notes);
  const [savingNote, setSavingNote] = useState(false);

  async function saveNote() {
    setSavingNote(true);
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: noteDraft }),
      });
      if (res.ok) {
        setNotes(noteDraft);
        setEditingNote(false);
      }
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div style={{
      padding: "13px 18px",
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 10,
    }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 500, fontSize: 13.5 }}>{appt.service.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
              {fmt(appt.startTime, "dd MMMM yyyy")} · {fmt(appt.startTime, "HH:mm")} · {appt.staff.name}
              {appt.userPackage && (
                <span style={{ marginLeft: 8, padding: "1px 7px", background: "var(--primary-light)", color: "var(--primary)", borderRadius: 10, fontSize: 11 }}>
                  {packageBadgeLabel}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Note toggle button */}
          <button
            title={notes ? t.appointments.editNote : t.appointments.addNote}
            onClick={() => { setNoteDraft(notes); setEditingNote(true); }}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 4,
              color: notes ? "var(--primary)" : "var(--muted-foreground)",
              display: "flex", alignItems: "center",
            }}
          >
            <FileText size={14} />
          </button>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>₺{appt.priceAtBooking.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: statusColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {statusLabel}
            </div>
          </div>
        </div>
      </div>

      {/* Existing note display */}
      {notes && !editingNote && (
        <div style={{
          marginTop: 10, marginLeft: 22,
          fontSize: 12.5, color: "var(--muted-foreground)",
          fontStyle: "italic",
          background: "var(--muted)", padding: "7px 11px",
          borderRadius: 6, borderLeft: "2px solid var(--border)",
        }}>
          📝 {notes}
        </div>
      )}

      {/* Note editor */}
      {editingNote && (
        <div style={{ marginTop: 10, marginLeft: 22 }}>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder={t.appointments.noteDialogPlaceholder}
            rows={2}
            autoFocus
            style={{
              width: "100%", padding: "8px 10px",
              border: "1px solid var(--border)", borderRadius: 7,
              background: "var(--background)", fontSize: 13,
              color: "var(--foreground)", outline: "none",
              resize: "vertical", fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
            <button
              onClick={() => setEditingNote(false)}
              style={ghostBtnStyle}
              disabled={savingNote}
            >
              <X size={12} style={{ marginRight: 3 }} /> {t.common.cancel}
            </button>
            <button
              onClick={saveNote}
              disabled={savingNote}
              style={{ ...primaryBtnStyle, display: "flex", alignItems: "center", gap: 4 }}
            >
              <Check size={12} /> {savingNote ? t.appointments.saving : t.common.save}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer Notes Card
// ─────────────────────────────────────────────────────────────────────────────

function CustomerNotesCard({
  customerId,
  initialNotes,
}: {
  customerId: string;
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
      const res = await fetch(`/api/customers/${customerId}`, {
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
    if (!confirm(t.customers.removeNoteConfirm)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: editing || notes ? 12 : 0 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <FileText size={14} color="var(--primary)" /> {t.customers.staffNotes}
        </h3>
        {!editing && (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => { setDraft(notes); setEditing(true); }} style={iconBtnStyle} title={t.appointments.editNote}>
              <Pencil size={13} />
            </button>
            {notes && (
              <button onClick={clearNotes} disabled={saving} style={{ ...iconBtnStyle, color: "#c45c5c" }} title={t.customers.removeNoteConfirm}>
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
            placeholder={t.customers.staffNotePlaceholder}
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
            <button onClick={() => setEditing(false)} style={ghostBtnStyle} disabled={saving}>
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
          {t.customers.addStaffNote}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule Next Session Dialog
// ─────────────────────────────────────────────────────────────────────────────

type PackageForNextSession = {
  id: string;
  name: string;
  remainingSessions: number;
  totalSessions: number;
  totalPrice: number;
  paidAmount: number;
  service?: { id: string; name: string; price: number; duration: number } | null;
};

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00",
];

function ScheduleNextSessionDialog({
  pkg,
  staffList,
  onScheduled,
}: {
  pkg: PackageForNextSession;
  staffList: Staff[];
  onScheduled: () => void;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [dateStr, setDateStr] = useState(tomorrow.toISOString().slice(0, 10));
  const [timeStr, setTimeStr] = useState("10:00");
  const [staffId, setStaffId] = useState(staffList?.[0]?.id ?? "");

  const balance = Math.max(0, pkg.totalPrice - pkg.paidAmount);
  const isFinalSession = pkg.remainingSessions === 1;
  const [installmentAmount, setInstallmentAmount] = useState(
    isFinalSession ? balance.toFixed(2) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSchedule() {
    if (!staffId || !dateStr || !timeStr) return;
    setSaving(true);
    setError("");

    const payment = installmentAmount ? Number(installmentAmount) : 0;
    if (Number.isNaN(payment) || payment < 0) {
      setError(t.customers.invalidPaymentAmount);
      setSaving(false);
      return;
    }

    if (payment > balance) {
      setError(
        t.customers.paymentCannotExceed.replace("{amount}", balance.toFixed(2))
      );
      setSaving(false);
      return;
    }

    if (isFinalSession && Math.abs(payment - balance) > 0.009) {
      setError(
        t.customers.finalSessionMustMatch.replace("{amount}", balance.toFixed(2))
      );
      setSaving(false);
      return;
    }

    try {
      const startTime = new Date(`${dateStr}T${timeStr}`).toISOString();
      const res = await fetch(`/api/packages/${pkg.id}/next-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime,
          staffId,
          installmentAmount: payment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.customers.failedToSchedule);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        onScheduled();
      }, 1200);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 8,
          border: "1px solid var(--primary)", background: "transparent",
          color: "var(--primary)", fontSize: 12.5, fontWeight: 500, cursor: "pointer",
        }}
      >
        <CalendarClock size={13} />
        {t.customers.scheduleNext}
        <span style={{
          background: "var(--primary)", color: "white",
          borderRadius: 10, padding: "1px 6px", fontSize: 11,
        }}>
          {pkg.remainingSessions} {t.customers.sessionsLeftBadge}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={() => !saving && setOpen(false)}
        >
          <div
            className="admin-modal"
            style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 14, padding: "28px 32px",
              width: 440, maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              {t.customers.scheduleNext}
            </h3>
            <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 4 }}>
              {localizePackageName(pkg.name, t)}
            </p>
            {pkg.service && (
              <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 20 }}>
                {t.appointmentForm.service} <strong>{pkg.service.name}</strong> · {pkg.service.duration} {t.services.min}
              </p>
            )}

            {success ? (
              <div style={{ padding: "24px", textAlign: "center", color: "#2d7a2d", fontSize: 15, fontWeight: 500 }}>
                {t.customers.sessionScheduled}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>{t.appointmentForm.date}</label>
                  <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} style={fullInputStyle} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>{t.appointmentForm.timeSlot}</label>
                  <select 
                    value={timeStr} 
                    onChange={(e) => setTimeStr(e.target.value)} 
                    style={fullInputStyle}
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>{t.appointmentForm.staffMember}</label>
                  <select value={staffId} onChange={(e) => setStaffId(e.target.value)} style={fullInputStyle}>
                    {staffList?.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>{t.customers.paymentNow}</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="₺0"
                    value={installmentAmount}
                    onChange={(e) => {
                      if (!isFinalSession) {
                        setInstallmentAmount(e.target.value);
                      }
                    }}
                    disabled={isFinalSession}
                    style={fullInputStyle}
                  />
                  <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--muted-foreground)" }}>
                    {isFinalSession
                      ? `${t.customers.finalSessionPaymentNote}: ₺${balance.toFixed(2)}`
                      : `${t.customers.maximumPaymentNote}: ₺${balance.toFixed(2)}`}
                  </div>
                </div>

                {/* Package balance summary */}
                <div style={{
                  background: "var(--muted)", borderRadius: 8, padding: "10px 14px",
                  marginBottom: 16, fontSize: 12.5, color: "var(--muted-foreground)",
                  display: "flex", justifyContent: "space-between",
                }}>
                  <span>
                   {t.customers.sessionsLeftSummary
                     .replace("{remaining}", String(pkg.remainingSessions))
                     .replace("{total}", String(pkg.totalSessions))}
                 </span>
                 <span>{t.customers.paidSummary}: ₺{pkg.paidAmount} / ₺{pkg.totalPrice}</span>
                </div>

                {error && (
                  <p style={{ color: "#c0392b", fontSize: 12.5, marginBottom: 12 }}>{error}</p>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setOpen(false)} style={ghostBtnStyle} disabled={saving}>
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleSchedule}
                    disabled={saving || !staffId}
                    style={{ ...primaryBtnStyle, opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? t.appointmentForm.scheduling : t.appointmentForm.schedule}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared styles
// ─────────────────────────────────────────────────────────────────────────────

const iconBtnStyle: React.CSSProperties = {
  padding: "5px 6px", background: "var(--muted)",
  border: "1px solid var(--border)", borderRadius: 6,
  cursor: "pointer", display: "flex", alignItems: "center",
  color: "var(--muted-foreground)",
};

const ghostBtnStyle: React.CSSProperties = {
  padding: "7px 16px", borderRadius: 8,
  border: "1px solid var(--border)", background: "transparent",
  cursor: "pointer", fontSize: 13, color: "var(--foreground)",
  display: "flex", alignItems: "center",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "7px 16px", borderRadius: 8,
  border: "none", background: "var(--primary)",
  color: "white", cursor: "pointer",
  fontSize: 13, fontWeight: 500,
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "var(--muted-foreground)", marginBottom: 6,
  textTransform: "uppercase", letterSpacing: "0.04em",
};

const fullInputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--card)", fontSize: 13,
  color: "var(--foreground)", outline: "none",
  boxSizing: "border-box",
};
