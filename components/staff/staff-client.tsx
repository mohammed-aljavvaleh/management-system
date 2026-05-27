"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, X, IdCardLanyard, CalendarDays, TurkishLira, SaudiRiyal, User, Phone } from "lucide-react";
import { useLang, Price } from "@/components/providers/language-provider";
import { Avatar } from "@/components/ui/avatar";

type StaffMember = {
  id: string;
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  appointmentCount: number;
  totalRevenue: number;
};

const ROLES = [
  "Owner",
  "Manager",
  "Receptionist",
  "Hairdresser",
  "Hair Stylist",
  "Colorist",
  "Nail Artist",
  "Nail Technician",
  "Manicurist",
  "Aesthetician",
  "Laser Technician",
  "Makeup Artist",
  "Brow & Lash Artist",
  "Masseuse",
  "Masseur",
  "Technician",
  "Senior Technician",
  "Junior Technician"
];



export function StaffClient({ initialStaff }: { initialStaff: StaffMember[] }) {
  const { t, currency } = useLang();
  const [staff, setStaff] = useState(initialStaff);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [role, setRole] = useState("Technician");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    setPhone(digits);
    if (digits.length === 0) {
      setPhoneError("");
      return;
    }
    if (!digits.startsWith("05")) {
      setPhoneError(t.appointmentForm.errors.phoneMustStart);
      return;
    }
    setPhoneError("");
  }

  function validatePhone(): boolean {
    if (phone.length === 0) return true;
    if (!phone.startsWith("05")) {
      setPhoneError(t.appointmentForm.errors.phoneMustStart);
      return false;
    }
    if (phone.length !== 11) {
      setPhoneError(t.appointmentForm.errors.PhoneTooShort || "Phone number must be 11 digits");
      return false;
    }
    return true;
  }

  function openCreate() {
    setEditId(null);
    setName("");
    setRole("Technician");
    setEmail("");
    setPhone("");
    setPhoneError("");
    setError("");
    setShowForm(true);
  }

  function openEdit(s: StaffMember) {
    setEditId(s.id);
    setName(s.name);
    setRole(s.role);
    setEmail(s.email || "");
    setPhone(s.phone || "");
    setPhoneError("");
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setPhoneError("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError(t.apiErrors.nameRequired); return; }
    if (!validatePhone()) return;

    setLoadingId("form");
    setError("");

    try {
      if (editId) {
        const res = await fetch(`/api/staff/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), role, email: email.trim() || null, phone: phone.trim() || null }),
        });
        if (!res.ok) throw new Error(t.apiErrors.updateFailed);
        const updated = await res.json();
        setStaff((prev) =>
          prev.map((s) => (s.id === editId ? { ...s, ...updated } : s))
        );
      } else {
        const res = await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), role, email: email.trim() || null, phone: phone.trim() || null }),
        });
        if (!res.ok) throw new Error(t.apiErrors.createFailed);
        const created = await res.json();
        setStaff((prev) =>
          [...prev, { ...created, appointmentCount: 0, totalRevenue: 0 }].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.staff.deleteConfirm)) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t.apiErrors.deleteFailed);
      }
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoadingId(null);
    }
  }

  const totalAppointments = staff.reduce((s, m) => s + m.appointmentCount, 0);
  const totalRevenue = staff.reduce((s, m) => s + m.totalRevenue, 0);
  const topStaff = [...staff].sort((a, b) => b.appointmentCount - a.appointmentCount)[0];

  return (
    <div className="admin-page" style={{ padding: "32px 36px", maxWidth: 900 }}>
      {/* Header */}
      <div className="admin-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500 }}>{t.staff.title}</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>
            {t.staff.subtitle}
          </p>
        </div>
        <button onClick={openCreate} style={primaryBtnStyle}>
          <Plus size={15} /> {t.staff.addMember}
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: t.staff.totalTeam, value: staff.length.toString(), icon: IdCardLanyard, color: "#c9956b" },
          { label: t.appointments.totalAppointments, value: totalAppointments.toString(), icon: CalendarDays, color: "#7b9ec9" },
          { label: t.staff.revenueGenerated, value: <Price amount={totalRevenue} showDecimals={false} size={20} style={{ fontWeight: 600 }} />, icon: currency === "TRY" ? TurkishLira : SaudiRiyal, color: "#9ec97b" },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: stat.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <stat.icon size={17} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontFamily: "var(--font-display)", fontWeight: 600 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Staff List */}
      {staff.length === 0 ? (
        <div style={{ background: "var(--card)", border: "2px dashed var(--border)", borderRadius: 12, padding: "60px 24px", textAlign: "center" }}>
          <IdCardLanyard size={36} style={{ margin: "0 auto 12px", color: "var(--muted-foreground)", opacity: 0.5 }} />
          <p style={{ color: "var(--muted-foreground)", marginBottom: 16 }}>{t.staff.noStaff}</p>
          <button onClick={openCreate} style={primaryBtnStyle}>{t.staff.addFirst}</button>
        </div>
      ) : (
        <div className="admin-scroll-x" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflowX: "auto", overflowY: "hidden" }}>
          {/* Table header */}
          <div className="admin-table" style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px 140px 140px", padding: "10px 20px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span>{t.staff.name}</span>
            <span>{t.staff.role}</span>
            <span>{t.appointments.appointments}</span>
            <span>{t.staff.revenue}</span>
            <span>{t.common.actions}</span>
          </div>

          {staff.map((member, i) => {
            const pct = totalAppointments > 0 ? (member.appointmentCount / totalAppointments) * 100 : 0;

            return (
              <div
                key={member.id}
                className="animate-fade-in admin-table"
                style={{
                  animationDelay: `${i * 40}ms`,
                  display: "grid",
                  gridTemplateColumns: "1fr 160px 120px 140px 140px",
                  padding: "14px 20px",
                  borderBottom: i < staff.length - 1 ? "1px solid var(--border)" : "none",
                  alignItems: "center",
                  opacity: loadingId === member.id ? 0.5 : 1,
                }}
              >
                {/* Name + avatar */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={member.name} size={40} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{member.name}</div>
                    {topStaff?.id === member.id && member.appointmentCount > 0 && (
                      <div style={{ fontSize: 10, color: "#c9956b", fontWeight: 500 }}>{t.staff.topPerformer}</div>
                    )}
                  </div>
                </div>

                {/* Role */}
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                  {(t.staff.roles as any)[member.role] || member.role}
                </div>

                {/* Appointments with mini bar */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{member.appointmentCount}</div>
                  <div style={{ height: 3, background: "var(--muted)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--primary)", borderRadius: 2 }} />
                  </div>
                </div>

                {/* Revenue */}
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--primary)" }}>
                  <Price amount={member.totalRevenue} />
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Link
                    href={`/staff/${member.id}`}
                    style={{ ...iconBtnStyle, color: "var(--primary)", textDecoration: "none" }}
                    title={t.staff.viewProfile}
                  >
                    <User size={13} />
                  </Link>
                  <button onClick={() => openEdit(member)} style={iconBtnStyle} title={t.common.edit}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(member.id)} style={{ ...iconBtnStyle, color: "var(--destructive)" }} title={t.common.delete}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={(e) => e.target === e.currentTarget && closeForm()}
        >
          <div className="animate-scale-in admin-modal" style={{ background: "var(--card)", borderRadius: 14, padding: "28px 30px", width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>
                {editId ? t.staff.editMember : t.staff.addMember}
              </h2>
              <button onClick={closeForm} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <label style={labelStyle}>{t.staff.name}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.staff.namePlaceholder}
                    required
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t.staff.role}</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {(t.staff.roles as any)[r] || r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t.staff.email}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.staff.emailPlaceholder}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Phone size={11} /> {t.appointmentForm.phoneNumber}
                    </span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="05XXXXXXXXX"
                    maxLength={11}
                    style={{
                      ...inputStyle,
                      borderColor: (() => {
                        if (phone.length === 0) return "var(--border)";
                        if (!phone.startsWith("05")) return "#c45c5c";
                        if (phone.length === 11) return "#2d7a2d";
                        return "var(--border)";
                      })(),
                    }}
                  />
                  <div style={{ marginTop: 5, minHeight: 18, display: "flex", justifyContent: "space-between" }}>
                    <span style={{
                      fontSize: 12,
                      color: (() => {
                        if (phone.length === 0) return "var(--muted-foreground)";
                        if (!phone.startsWith("05")) return "#c45c5c";
                        if (phone.length === 11) return "#2d7a2d";
                        return "var(--muted-foreground)";
                      })()
                    }}>
                      {(() => {
                        if (phone.length === 0) return t.appointmentForm.phoneNumberRules;
                        if (!phone.startsWith("05")) return t.appointmentForm.errors.phoneMustStart;
                        if (phone.length === 11) return t.appointmentForm.availableNumber;
                        return t.appointmentForm.phoneNumberRules;
                      })()}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
                      {phone.length}/11
                    </span>
                  </div>
                </div>

                {error && (
                  <div style={{ padding: "10px 14px", background: "#fde8e8", borderRadius: 8, color: "var(--destructive)", fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={closeForm} style={{ ...btnStyle, flex: 1, background: "var(--muted)", color: "var(--foreground)" }}>
                    {t.staff.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={loadingId === "form" || (phone.length > 0 && (phone.length !== 11 || !phone.startsWith("05")))}
                    style={{
                      ...btnStyle,
                      flex: 2,
                      background: (loadingId === "form" || (phone.length > 0 && (phone.length !== 11 || !phone.startsWith("05")))) ? "var(--muted)" : "var(--primary)",
                      color: (loadingId === "form" || (phone.length > 0 && (phone.length !== 11 || !phone.startsWith("05")))) ? "var(--muted-foreground)" : "white",
                      opacity: loadingId === "form" ? 0.7 : 1,
                      cursor: (loadingId === "form" || (phone.length > 0 && (phone.length !== 11 || !phone.startsWith("05")))) ? "default" : "pointer",
                    }}
                  >
                    {loadingId === "form" ? t.staff.saving : editId ? t.staff.save : t.staff.addMember}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 18px", background: "var(--primary)", color: "white",
  border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13.5, fontWeight: 500,
};

const iconBtnStyle: React.CSSProperties = {
  padding: "6px", background: "var(--muted)", border: "1px solid var(--border)",
  borderRadius: 6, cursor: "pointer", color: "var(--muted-foreground)",
  display: "flex", alignItems: "center",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 500,
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11.5, fontWeight: 500,
  color: "var(--muted-foreground)", marginBottom: 6,
  textTransform: "uppercase", letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--background)", fontSize: 13.5,
  color: "var(--foreground)", outline: "none",
};
