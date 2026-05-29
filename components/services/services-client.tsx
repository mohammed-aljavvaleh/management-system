"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Clock, X, Scissors, TurkishLira, SaudiRiyal, Award } from "lucide-react";
import { useLang, CurrencySymbol, Price } from "@/components/providers/language-provider";

type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;
  _count?: { appointments: number };
};

export function ServicesClient({ initialServices }: { initialServices: Service[] }) {
  const { t, currency } = useLang();
  const [services, setServices] = useState(initialServices);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");

  useEffect(() => {
    const mainEl = document.querySelector("main");
    const originalOverflow = mainEl ? mainEl.style.overflow : "";
    const originalBodyOverflow = document.body.style.overflow;

    if (showForm) {
      document.body.style.overflow = "hidden";
      if (mainEl) mainEl.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      if (mainEl) mainEl.style.overflow = originalOverflow;
    };
  }, [showForm]);

  function openCreate() {
    setEditId(null);
    setName("");
    setPrice("");
    setDuration("");
    setError("");
    setShowForm(true);
  }

  function openEdit(svc: Service) {
    setEditId(svc.id);
    setName(svc.name);
    setPrice(svc.price.toString());
    setDuration(svc.duration.toString());
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
    if (!name.trim() || !price || !duration) {
      setError(t.common.requiredFields);
      return;
    }
    const priceNum = parseFloat(price);
    const durNum = parseInt(duration);
    if (isNaN(priceNum) || priceNum < 0) { setError(t.appointments.invalidPrice); return; }
    if (isNaN(durNum) || durNum < 5) { setError(t.apiErrors.durationRange); return; }

    setLoadingId("form");
    setError("");

    try {
      if (editId) {
        const res = await fetch(`/api/services/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), price: priceNum, duration: durNum }),
        });
        if (!res.ok) throw new Error("Failed to update");
        const updated = await res.json();
        setServices((prev) => prev.map((s) => (s.id === editId ? updated : s)));
      } else {
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), price: priceNum, duration: durNum }),
        });
        if (!res.ok) throw new Error("Failed to create");
        const created = await res.json();
        setServices((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t.services.deleteConfirm)) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t.services.cannotDelete);
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : t.apiErrors.deleteFailed);
    } finally {
      setLoadingId(null);
    }
  }

  const topService = [...services].sort((a, b) => {
    const aCount = a._count?.appointments || 0;
    const bCount = b._count?.appointments || 0;
    return bCount - aCount;
  })[0];

  const avgPrice = services.length
    ? Math.round(services.reduce((s, svc) => s + svc.price, 0) / services.length)
    : 0;

  return (
    <div className="admin-page" style={{ padding: "32px 36px", maxWidth: 900 }}>
      {/* Header */}
      <div className="admin-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500 }}>{t.services.title}</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>
            {t.services.subtitle}
          </p>
        </div>
        <button onClick={openCreate} style={primaryBtnStyle}>
          <Plus size={15} /> {t.services.addService}
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: t.services.total, value: services.length.toString(), icon: Scissors, color: "#c9956b" },
          { label: t.services.averagePrice, value: services.length ? <Price amount={avgPrice} showDecimals={false} /> : "—", icon: currency === "TRY" ? TurkishLira : SaudiRiyal, color: "#7b9ec9" },
          { label: t.services.priceRange, value: services.length ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><CurrencySymbol /><span>{Math.min(...services.map(s => s.price)).toFixed(0)} – {Math.max(...services.map(s => s.price)).toFixed(0)}</span></span> : "—", icon: currency === "TRY" ? TurkishLira : SaudiRiyal, color: "#9ec97b" },
          { label: t.services.mostPopular, value: topService && (topService._count?.appointments || 0) > 0 ? topService.name : "—", icon: Award, color: "#c97bb5" },
        ].map((stat) => (
          <div key={stat.label} className="horizontal-stat-card">
            <div className="horizontal-stat-icon-box" style={{ background: stat.color + "18" }}>
              <stat.icon size={17} color={stat.color} />
            </div>
            <div className="horizontal-stat-info">
              <div className="horizontal-stat-value">{stat.value}</div>
              <div className="horizontal-stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Service Grid */}
      {services.length === 0 ? (
        <div style={{ background: "var(--card)", border: "2px dashed var(--border)", borderRadius: 12, padding: "60px 24px", textAlign: "center" }}>
          <Scissors size={36} style={{ margin: "0 auto 12px", color: "var(--muted-foreground)", opacity: 0.5 }} />
          <p style={{ color: "var(--muted-foreground)", marginBottom: 16 }}>{t.services.noServices}</p>
          <button onClick={openCreate} style={primaryBtnStyle}>{t.services.noServicesDesc}</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {services.map((svc, i) => (
            <div
              key={svc.id}
              className="animate-fade-in service-item-card"
              style={{
                animationDelay: `${i * 30}ms`,
                opacity: loadingId === svc.id ? 0.5 : 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Accent bar */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--primary), var(--accent))" }} />

              <div style={{ marginTop: 4, display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, margin: 0, wordBreak: "break-word" }}>
                      {svc.name}
                    </h3>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--primary)", fontWeight: 600, fontSize: 15, whiteSpace: "nowrap" }}>
                      <Price amount={svc.price} />
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--muted-foreground)", fontSize: 13, marginTop: 6, marginBottom: 16 }}>
                    <Clock size={13} />{svc.duration} {t.services.min}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <button
                    onClick={() => openEdit(svc)}
                    style={{ ...smallBtnStyle, color: "var(--foreground)", flex: 1, justifyContent: "center" }}
                  >
                    <Pencil size={12} /> {t.common.edit}
                  </button>
                  <button
                    onClick={() => handleDelete(svc.id)}
                    style={{ ...smallBtnStyle, color: "var(--destructive)", flex: 1, justifyContent: "center" }}
                  >
                    <Trash2 size={12} /> {t.common.delete}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          }}
          onClick={(e) => e.target === e.currentTarget && closeForm()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
            <div
              className="animate-scale-in admin-modal"
            style={{
              background: "var(--card)", borderRadius: 14, padding: "28px 30px",
              width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>
                {editId ? t.services.editService : t.services.newService}
              </h2>
              <button onClick={closeForm} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <label style={labelStyle}>{t.services.name}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="örn. Classic Manicure"
                    required
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>{t.services.price} (<CurrencySymbol size={13} />)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="10"
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.services.duration}</label>
                    <input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="30"
                      min="5"
                      step="5"
                      required
                      style={inputStyle}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{ padding: "10px 14px", background: "#fde8e8", borderRadius: 8, color: "var(--destructive)", fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={closeForm} style={{ ...btnStyle, flex: 1, background: "var(--muted)", color: "var(--foreground)" }}>
                    {t.services.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={loadingId === "form"}
                    style={{ ...btnStyle, flex: 2, background: "var(--primary)", color: "white", opacity: loadingId === "form" ? 0.7 : 1 }}
                  >
                    {loadingId === "form" ? t.services.saving : editId ? t.services.save : t.services.addService}
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

const smallBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  padding: "5px 12px", background: "var(--muted)",
  border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontSize: 12.5,
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
