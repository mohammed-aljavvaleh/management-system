"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, IdCardLanyard, CalendarDays, TurkishLira } from "lucide-react";
import { useLang } from "@/components/providers/language-provider";

type StaffMember = {
  id: string;
  name: string;
  role: string;
  appointmentCount: number;
  totalRevenue: number;
};

const ROLES = ["Technician", "Senior Technician", "Nail Artist", "Manager", "Receptionist"];

const AVATAR_COLORS = [
  { bg: "#f5ede5", color: "#c9956b" },
  { bg: "#e5eff5", color: "#6b9ec9" },
  { bg: "#e5f5e5", color: "#6bc97b" },
  { bg: "#f5e5f5", color: "#c96bb5" },
  { bg: "#f5f5e5", color: "#c9b56b" },
];

export function StaffClient({ initialStaff }: { initialStaff: StaffMember[] }) {
  const { t } = useLang();
  const [staff, setStaff] = useState(initialStaff);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [role, setRole] = useState("Technician");

  function openCreate() {
    setEditId(null);
    setName("");
    setRole("Technician");
    setError("");
    setShowForm(true);
  }

  function openEdit(s: StaffMember) {
    setEditId(s.id);
    setName(s.name);
    setRole(s.role);
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }

    setLoadingId("form");
    setError("");

    try {
      if (editId) {
        const res = await fetch(`/api/staff/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), role }),
        });
        if (!res.ok) throw new Error("Failed to update");
        const updated = await res.json();
        setStaff((prev) =>
          prev.map((s) => (s.id === editId ? { ...s, ...updated } : s))
        );
      } else {
        const res = await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), role }),
        });
        if (!res.ok) throw new Error("Failed to create");
        const created = await res.json();
        setStaff((prev) =>
          [...prev, { ...created, appointmentCount: 0, totalRevenue: 0 }].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this staff member? This will fail if they have appointments.")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Cannot delete — staff member has appointments");
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
    <div style={{ padding: "32px 36px", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: t.staff.totalTeam, value: staff.length.toString(), icon: IdCardLanyard, color: "#c9956b" },
          { label: t.appointments.totalAppointments, value: totalAppointments.toString(), icon: CalendarDays, color: "#7b9ec9" },
          { label: t.staff.revenueGenerated, value: `₺${totalRevenue.toFixed(0)}`, icon: TurkishLira, color: "#9ec97b" },
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
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px 140px 100px", padding: "10px 20px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <span>{t.staff.name}</span>
            <span>{t.staff.role}</span>
            <span>{t.appointments.appointments}</span>
            <span>{t.staff.revenue}</span>
            <span>{t.common.actions}</span>
          </div>

          {staff.map((member, i) => {
            const avatarStyle = AVATAR_COLORS[i % AVATAR_COLORS.length];
            const pct = totalAppointments > 0 ? (member.appointmentCount / totalAppointments) * 100 : 0;

            return (
              <div
                key={member.id}
                className="animate-fade-in"
                style={{
                  animationDelay: `${i * 40}ms`,
                  display: "grid",
                  gridTemplateColumns: "1fr 160px 120px 140px 100px",
                  padding: "14px 20px",
                  borderBottom: i < staff.length - 1 ? "1px solid var(--border)" : "none",
                  alignItems: "center",
                  opacity: loadingId === member.id ? 0.5 : 1,
                }}
              >
                {/* Name + avatar */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: avatarStyle.bg, color: avatarStyle.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 600, fontFamily: "var(--font-display)", flexShrink: 0,
                  }}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{member.name}</div>
                    {topStaff?.id === member.id && member.appointmentCount > 0 && (
                      <div style={{ fontSize: 10, color: "#c9956b", fontWeight: 500 }}>⭐ Top performer</div>
                    )}
                  </div>
                </div>

                {/* Role */}
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{member.role}</div>

                {/* Appointments with mini bar */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{member.appointmentCount}</div>
                  <div style={{ height: 3, background: "var(--muted)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--primary)", borderRadius: 2 }} />
                  </div>
                </div>

                {/* Revenue */}
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--primary)" }}>
                  ₺{member.totalRevenue.toFixed(2)}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => openEdit(member)} style={iconBtnStyle} title="Edit">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(member.id)} style={{ ...iconBtnStyle, color: "var(--destructive)" }} title="Delete">
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
          <div className="animate-scale-in" style={{ background: "var(--card)", borderRadius: 14, padding: "28px 30px", width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
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
                    placeholder="örn. Lamees Bahaa"
                    required
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t.staff.role}</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
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
                  <button type="submit" disabled={loadingId === "form"} style={{ ...btnStyle, flex: 2, background: "var(--primary)", color: "white", opacity: loadingId === "form" ? 0.7 : 1 }}>
                    {loadingId === "form" ? "Saving..." : editId ? "Save Changes" : t.staff.addMember}
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