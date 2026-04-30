"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Clock, DollarSign, X, Check, Scissors } from "lucide-react";

type Service = { id: string; name: string; price: number; duration: number };

export function ServicesClient({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState(initialServices);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");

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
      setError("All fields are required");
      return;
    }
    const priceNum = parseFloat(price);
    const durNum = parseInt(duration);
    if (isNaN(priceNum) || priceNum < 0) { setError("Invalid price"); return; }
    if (isNaN(durNum) || durNum < 5) { setError("Duration must be at least 5 minutes"); return; }

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
    if (!confirm("Delete this service? Any associated appointments will be affected.")) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Cannot delete — service may have appointments");
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoadingId(null);
    }
  }

  const totalRevenuePotential = services.reduce((s, svc) => s + svc.price, 0);
  const avgDuration = services.length
    ? Math.round(services.reduce((s, svc) => s + svc.duration, 0) / services.length)
    : 0;

  return (
    <div style={{ padding: "32px 36px", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500 }}>Services</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 2 }}>
            Manage your nail salon service menu
          </p>
        </div>
        <button onClick={openCreate} style={primaryBtnStyle}>
          <Plus size={15} /> Add Service
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Services", value: services.length.toString(), icon: Scissors, color: "#c9956b" },
          { label: "Avg Duration", value: `${avgDuration} min`, icon: Clock, color: "#7b9ec9" },
          { label: "Price Range", value: services.length ? `$${Math.min(...services.map(s => s.price))} – $${Math.max(...services.map(s => s.price))}` : "—", icon: DollarSign, color: "#9ec97b" },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: stat.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <stat.icon size={17} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontFamily: "var(--font-display)", fontWeight: 600 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Service Grid */}
      {services.length === 0 ? (
        <div style={{ background: "var(--card)", border: "2px dashed var(--border)", borderRadius: 12, padding: "60px 24px", textAlign: "center" }}>
          <Scissors size={36} style={{ margin: "0 auto 12px", color: "var(--muted-foreground)", opacity: 0.5 }} />
          <p style={{ color: "var(--muted-foreground)", marginBottom: 16 }}>No services yet</p>
          <button onClick={openCreate} style={primaryBtnStyle}>Add your first service</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {services.map((svc, i) => (
            <div
              key={svc.id}
              className="animate-fade-in"
              style={{
                animationDelay: `${i * 30}ms`,
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "20px 22px",
                opacity: loadingId === svc.id ? 0.5 : 1,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Accent bar */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--primary), var(--accent))" }} />

              <div style={{ marginTop: 4 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, marginBottom: 6 }}>
                  {svc.name}
                </h3>
                <div style={{ display: "flex", gap: 14, color: "var(--muted-foreground)", fontSize: 13, marginBottom: 16 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={13} />{svc.duration} min
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--primary)", fontWeight: 600 }}>
                    <DollarSign size={13} />{svc.price.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => openEdit(svc)}
                    style={{ ...smallBtnStyle, color: "var(--foreground)" }}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(svc.id)}
                    style={{ ...smallBtnStyle, color: "var(--destructive)" }}
                  >
                    <Trash2 size={12} /> Delete
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
        >
          <div
            className="animate-scale-in"
            style={{
              background: "var(--card)", borderRadius: 14, padding: "28px 30px",
              width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>
                {editId ? "Edit Service" : "New Service"}
              </h2>
              <button onClick={closeForm} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Service Name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Classic Manicure"
                    required
                    style={inputStyle}
                    autoFocus
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Price ($) *</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="25.00"
                      min="0"
                      step="0.50"
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Duration (min) *</label>
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
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loadingId === "form"}
                    style={{ ...btnStyle, flex: 2, background: "var(--primary)", color: "white", opacity: loadingId === "form" ? 0.7 : 1 }}
                  >
                    {loadingId === "form" ? "Saving..." : editId ? "Save Changes" : "Add Service"}
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