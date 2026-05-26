"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Phone, Calendar, Package, Search, X, Plus } from "lucide-react";
import { useLang } from "@/components/providers/language-provider";

type Customer = {
  id: string;
  name: string;
  phone: string;
  _count: { appointments: number; packages: number };
  packages: { remainingSessions: number; totalSessions: number }[];
};

// ── Create Customer Dialog ───────────────────────────────────────────────────

function CreateCustomerDialog({
  onClose,
  onSaved,
  customers,
}: {
  onClose: () => void;
  onSaved: (customer: Customer) => void;
  customers: Customer[];
}) {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    setPhone(digits);
    if (digits.length === 0) {
      setPhoneError(t.appointmentForm.errors.phoneRequired);
      return;
    }
    if (!digits.startsWith("05")) {
      setPhoneError(t.appointmentForm.errors.phoneMustStart);
      return;
    }

    if (digits.length < 11) {
      setPhoneError(""); // Clear any blocking errors while typing
    } else {
      // Exactly 11 digits
      const isExactMatch = customers.some((c) => c.phone === digits);
      if (isExactMatch) {
        setPhoneError(t.common.phoneExists ?? "Phone number is already registered");
      } else {
        setPhoneError("");
      }
    }
  }

  function validatePhone(): boolean {
    if (phone.length === 0) {
      setPhoneError(t.appointmentForm.errors.phoneRequired);
      return false;
    }
    if (!phone.startsWith("05")) {
      setPhoneError(t.appointmentForm.errors.phoneMustStart);
      return false;
    }
    if (phone.length !== 11) {
      setPhoneError(t.appointmentForm.errors.PhoneTooShort);
      return false;
    }
    const isExactMatch = customers.some((c) => c.phone === phone);
    if (isExactMatch) {
      setPhoneError(t.common.phoneExists ?? "Phone number is already registered");
      return false;
    }
    return true;
  }

  async function handleCreate() {
    setError("");
    if (!name.trim()) {
      setError(t.common.requiredFields ?? "All fields are required");
      return;
    }
    if (!validatePhone()) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "Phone number is already registered") {
          setError(t.common.phoneExists ?? "Phone number is already registered");
        } else {
          setError(data.error ?? "Failed to create customer");
        }
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
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "24px",
          width: "90%",
          maxWidth: 400,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          {t.customers.newCustomer ?? "New Customer"}
        </h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6, color: "var(--muted-foreground)" }}>
            {t.common.name ?? "Name"}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.appointmentForm.fullNamePlaceholder}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 13.5,
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--background)",
              color: "var(--foreground)",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6, color: "var(--muted-foreground)" }}>
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
              width: "100%",
              padding: "8px 12px",
              fontSize: 13.5,
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--background)",
              color: "var(--foreground)",
              outline: "none",
              boxSizing: "border-box",
              borderColor: (() => {
                if (phone.length === 0) return "var(--border)";
                if (!phone.startsWith("05")) return "#c45c5c";

                const hasMatchingPrefix = customers.some((c) => c.phone.startsWith(phone));
                if (phone.length === 11) {
                  return hasMatchingPrefix ? "#c45c5c" : "#2d7a2d";
                }
                return "var(--border)";
              })(),
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "")}
          />
          <div style={{ marginTop: 5, minHeight: 18, display: "flex", justifyContent: "space-between" }}>
            <span style={{
              fontSize: 12,
              color: (() => {
                if (phone.length === 0) return "var(--muted-foreground)";
                if (!phone.startsWith("05")) return "#c45c5c";

                const hasMatchingPrefix = customers.some((c) => c.phone.startsWith(phone));
                if (phone.length === 11) {
                  return hasMatchingPrefix ? "#c45c5c" : "#2d7a2d";
                }
                return "var(--muted-foreground)";
              })()
            }}>
              {(() => {
                if (phone.length === 0) return t.appointmentForm.phoneNumberRules;
                if (!phone.startsWith("05")) return t.appointmentForm.errors.phoneMustStart;

                const hasMatchingPrefix = customers.some((c) => c.phone.startsWith(phone));
                if (phone.length === 11) {
                  return hasMatchingPrefix
                    ? (t.common.phoneExists ?? "Phone number is already registered")
                    : t.appointmentForm.availableNumber;
                }
                return t.appointmentForm.phoneNumberRules;
              })()}
            </span>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
              {phone.length}/11
            </span>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 12px",
              background: "#fde8e8",
              border: "1px solid #f4b5b5",
              borderRadius: 6,
              fontSize: 12,
              color: "#a01a1a",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "var(--muted)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              color: "var(--foreground)",
            }}
          >
            {t.common.cancel ?? "Cancel"}
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim() || !!phoneError || phone.length !== 11}
            style={{
              padding: "8px 16px",
              background: (saving || !name.trim() || !!phoneError || phone.length !== 11) ? "var(--muted)" : "var(--primary)",
              color: (saving || !name.trim() || !!phoneError || phone.length !== 11) ? "var(--muted-foreground)" : "white",
              border: "none",
              borderRadius: 6,
              cursor: (saving || !name.trim() || !!phoneError || phone.length !== 11) ? "default" : "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {saving ? (t.common.creating ?? "Creating...") : (t.common.create ?? "Create")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomersClient({ customers: initialCustomers }: { customers: Customer[] }) {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [customers, setCustomers] = useState(initialCustomers);

  const filtered = query.trim()
    ? customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.phone.includes(query.trim())
    )
    : customers;

  return (
    <div className="admin-page" style={{ padding: "32px 36px", maxWidth: 860 }}>
      {/* Header */}
      <div className="admin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500 }}>
            {t.customers.title}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>
            {customers.length} {customers.length === 1 ? t.customers.subtitle1 : t.customers.subtitle2}
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <Plus size={16} /> {t.customers.newCustomer ?? "New Customer"}
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search
          size={15}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--muted-foreground)",
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.customers.searchPlaceholder}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "9px 36px 9px 36px",
            fontSize: 13.5,
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "var(--card)",
            color: "var(--foreground)",
            outline: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted-foreground)",
              display: "flex",
              alignItems: "center",
              padding: 2,
            }}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results count when searching */}
      {query.trim() && (
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>
          {filtered.length === 1
            ? t.customers.searchResultOne.replace("{query}", query.trim())
            : t.customers.searchResults.replace("{count}", String(filtered.length)).replace("{query}", query.trim())}
        </p>
      )}

      {filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "64px 0",
          color: "var(--muted-foreground)", fontSize: 14,
        }}>
          <User size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>{query.trim() ? (t.customers.noResults ?? "No customers match your search.") : t.customers.noCustomers}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((c) => {
            const activePackages = c.packages.filter((p) => p.remainingSessions > 0);
            const lowSessions = activePackages.some((p) => p.remainingSessions < 2);

            return (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="admin-card-row" style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 20px",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  transition: "border-color 0.15s",
                  cursor: "pointer",
                }}>
                  {/* Left: avatar + name + phone */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: "50%",
                      background: "var(--primary-light)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 600, color: "var(--primary)",
                      flexShrink: 0,
                    }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14.5 }}>
                        <HighlightMatch text={c.name} query={query} />
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <Phone size={10} /> <HighlightMatch text={c.phone} query={query} />
                      </div>
                    </div>
                  </div>

                  {/* Right: stats */}
                  <div className="admin-card-row-right" style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted-foreground)" }}>
                        <Calendar size={11} /> {t.appointments.appointments}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 15, textAlign: "center" }}>
                        {c._count.appointments}
                      </div>
                    </div>

                    {activePackages.length > 0 && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted-foreground)" }}>
                          <Package size={11} /> {t.customers.sessionsLeft}
                        </div>
                        <div style={{
                          fontWeight: 600, fontSize: 15, textAlign: "center",
                          color: lowSessions ? "#c45c5c" : "var(--foreground)",
                        }}>
                          {activePackages.reduce((sum, p) => sum + p.remainingSessions, 0)}
                        </div>
                      </div>
                    )}

                    <div style={{
                      fontSize: 12, color: "var(--muted-foreground)",
                      padding: "4px 10px", background: "var(--muted)",
                      borderRadius: 20,
                    }}>
                      {t.customers.ViewDetails}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Customer Dialog */}
      {showCreateDialog && (
        <CreateCustomerDialog
          onClose={() => setShowCreateDialog(false)}
          onSaved={(newCustomer) => {
            setCustomers([...customers, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));
            setShowCreateDialog(false);
          }}
          customers={customers}
        />
      )}
    </div>
  );
}

/** Highlights the matching portion of text in yellow */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "var(--primary-light)", color: "var(--primary)", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + query.trim().length)}
      </mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}
