"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft, Clock, TurkishLira, User, Phone, Calendar,
  Search, Plus, Minus, Package,
} from "lucide-react";
import Link from "next/link";

type Service = { id: string; name: string; price: number; duration: number };
type Staff = { id: string; name: string; role: string };
type Customer = { id: string; name: string; phone: string };

type Props = {
  services: Service[];
  staff: Staff[];
};

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00",
];

export function AppointmentForm({ services, staff }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Customer state ──────────────────────────────────────────────
  const [customerMode, setCustomerMode] = useState<"search" | "new">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New customer fields
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // ── Service / booking state ─────────────────────────────────────
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [staffId, setStaffId] = useState(staff[0]?.id || "");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("10:00");
  const [sessions, setSessions] = useState(1);
  const [priceOverride, setPriceOverride] = useState<string>("");
  const [installmentAmount, setInstallmentAmount] = useState<string>("");

  const selectedService = services.find((s) => s.id === serviceId);

  // When service changes, reset price override and sessions
  useEffect(() => {
    setPriceOverride("");
    setSessions(1);
    setInstallmentAmount("");
  }, [serviceId]);

  const defaultTotalPrice = selectedService
    ? selectedService.price * sessions
    : 0;
  const totalPrice =
    priceOverride !== "" ? Number(priceOverride) : defaultTotalPrice;

  // ── Customer search ─────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/customers?q=${encodeURIComponent(searchQuery)}`
        );
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [searchQuery]);

  // ── Phone validation helpers ────────────────────────────────────
  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    setNewPhone(digits);
    if (digits.length === 0) {
      setPhoneError("Phone number is required");
    } else if (!digits.startsWith("05")) {
      setPhoneError("Must start with 05");
    } else if (digits.length < 11) {
      setPhoneError(`${digits.length}/11 — too short`);
    } else {
      setPhoneError("");
    }
  }

  function validatePhone(): boolean {
    if (newPhone.length === 0) { setPhoneError("Phone number is required"); return false; }
    if (!newPhone.startsWith("05")) { setPhoneError("Must start with 05"); return false; }
    if (newPhone.length !== 11) { setPhoneError("Must be exactly 11 digits"); return false; }
    return true;
  }

  // ── Session counter ─────────────────────────────────────────────
  function incrementSessions() { setSessions((s) => s + 1); setInstallmentAmount(""); }
  function decrementSessions() { setSessions((s) => Math.max(1, s - 1)); setInstallmentAmount(""); }

  // ── Submit ──────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    let resolvedCustomerId = selectedCustomer?.id;

    // Create new customer first if in "new" mode
    if (customerMode === "new") {
      if (!newName.trim()) { setError("Customer name is required"); return; }
      if (!validatePhone()) return;

      try {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim(), phone: newPhone }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create customer");
        resolvedCustomerId = data.id;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create customer");
        return;
      }
    }

    if (!resolvedCustomerId) { setError("Please select or create a customer"); return; }
    if (!serviceId) { setError("Please select a service"); return; }
    if (!staffId) { setError("Please select a staff member"); return; }

    setLoading(true);
    try {
      const startTime = new Date(`${date}T${time}:00`);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: resolvedCustomerId,
          startTime: startTime.toISOString(),
          serviceId,
          staffId,
          sessions,
          price: totalPrice,
          installmentAmount: installmentAmount !== "" ? Number(installmentAmount) : 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create appointment");
      }

      router.push("/appointments");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create appointment");
    } finally {
      setLoading(false);
    }
  }

  const isPackage = sessions > 1;

  return (
    <div style={{ padding: "32px 36px", maxWidth: 680 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link
          href="/appointments"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", fontSize: 13, textDecoration: "none", marginBottom: 16 }}
        >
          <ArrowLeft size={14} /> Back to Appointments
        </Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500 }}>
          New Appointment
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>
          Fill in the details below to schedule an appointment.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: 20 }}>

          {/* ── Customer Section ───────────────────────────────── */}
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              <User size={15} color="var(--primary)" /> Customer
            </h2>

            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => { setCustomerMode("search"); setSelectedCustomer(null); }}
                style={{
                  ...toggleBtnStyle,
                  background: customerMode === "search" ? "var(--primary)" : "var(--muted)",
                  color: customerMode === "search" ? "white" : "var(--foreground)",
                }}
              >
                <Search size={12} /> Search existing
              </button>
              <button
                type="button"
                onClick={() => { setCustomerMode("new"); setSelectedCustomer(null); setSearchQuery(""); }}
                style={{
                  ...toggleBtnStyle,
                  background: customerMode === "new" ? "var(--primary)" : "var(--muted)",
                  color: customerMode === "new" ? "white" : "var(--foreground)",
                }}
              >
                <Plus size={12} /> New customer
              </button>
            </div>

            {customerMode === "search" && (
              <div>
                {selectedCustomer ? (
                  /* Selected customer chip */
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 14px", border: "2px solid var(--primary)",
                    borderRadius: 10, background: "var(--primary-light)",
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14, color: "var(--primary)" }}>
                        {selectedCustomer.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                        {selectedCustomer.phone}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      style={{ fontSize: 12, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or phone..."
                      style={inputStyle}
                    />
                    {searching && (
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6 }}>
                        Searching...
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <div style={{
                        marginTop: 6, border: "1px solid var(--border)", borderRadius: 8,
                        overflow: "hidden", background: "var(--card)",
                      }}>
                        {searchResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setSelectedCustomer(c); setSearchQuery(""); setSearchResults([]); }}
                            style={{
                              display: "flex", flexDirection: "column", width: "100%",
                              padding: "10px 14px", background: "none", border: "none",
                              borderBottom: "1px solid var(--border)", cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <span style={{ fontWeight: 500, fontSize: 13.5 }}>{c.name}</span>
                            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{c.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6 }}>
                        No customers found. Switch to "New customer" to add them.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {customerMode === "new" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Customer full name"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Phone size={11} /> Phone Number
                    </span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={newPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="05XXXXXXXXX"
                    maxLength={11}
                    style={{
                      ...inputStyle,
                      borderColor: phoneError
                        ? "#c45c5c"
                        : newPhone.length === 11 && !phoneError
                        ? "#2d7a2d"
                        : "var(--border)",
                    }}
                  />
                  <div style={{ marginTop: 5, minHeight: 18, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: phoneError ? "#c45c5c" : newPhone.length === 11 ? "#2d7a2d" : "var(--muted-foreground)" }}>
                      {phoneError ? phoneError : newPhone.length === 11 ? "Valid number ✓" : "11 digits, must start with 05"}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
                      {newPhone.length}/11
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Service Selection ──────────────────────────────── */}
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              <TurkishLira size={15} color="var(--primary)" /> Service
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {services.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setServiceId(svc.id)}
                  style={{
                    padding: "14px 16px",
                    border: `2px solid ${serviceId === svc.id ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: 10,
                    background: serviceId === svc.id ? "var(--primary-light)" : "var(--background)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: 13.5, color: serviceId === svc.id ? "var(--primary)" : "var(--foreground)", marginBottom: 4 }}>
                    {svc.name}
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--muted-foreground)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock size={11} /> {svc.duration} min
                    </span>
                    <span style={{ color: "var(--primary)", fontWeight: 500 }}>₺{svc.price}</span>
                  </div>
                </button>
              ))}
            </div>
            {services.length === 0 && (
              <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
                No services found.{" "}
                <Link href="/services" style={{ color: "var(--primary)" }}>Add services →</Link>
              </p>
            )}
          </section>

          {/* ── Sessions & Price ───────────────────────────────── */}
          {selectedService && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                <Package size={15} color="var(--primary)" /> Sessions & Pricing
              </h2>
              <div style={{ display: "grid", gap: 18 }}>

                {/* Sessions stepper */}
                <div>
                  <label style={labelStyle}>Number of Sessions</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      type="button"
                      onClick={decrementSessions}
                      disabled={sessions <= 1}
                      style={{
                        ...stepperBtnStyle,
                        opacity: sessions <= 1 ? 0.35 : 1,
                        cursor: sessions <= 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ fontSize: 22, fontWeight: 600, minWidth: 32, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                      {sessions}
                    </span>
                    <button
                      type="button"
                      onClick={incrementSessions}
                      style={{ ...stepperBtnStyle, cursor: "pointer" }}
                    >
                      <Plus size={14} />
                    </button>
                    {sessions > 1 && (
                      <span style={{
                        fontSize: 12, color: "var(--primary)", background: "var(--primary-light)",
                        padding: "3px 10px", borderRadius: 20, fontWeight: 500,
                      }}>
                        Package
                      </span>
                    )}
                  </div>
                  {sessions === 1 && (
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6 }}>
                      Increase sessions to create a multi-session package.
                    </p>
                  )}
                </div>

                {/* Total price override */}
                <div>
                  <label style={labelStyle}>
                    Total Price (₺)
                    <span style={{ fontWeight: 400, marginLeft: 6, textTransform: "none", letterSpacing: 0 }}>
                      — default: ₺{defaultTotalPrice}
                    </span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={priceOverride}
                    onChange={(e) => setPriceOverride(e.target.value)}
                    placeholder={`${defaultTotalPrice}`}
                    style={inputStyle}
                  />
                </div>

                {/* Installment paid at booking (packages only) */}
                {isPackage && (
                  <div>
                    <label style={labelStyle}>
                      Payment at Booking (₺)
                      <span style={{ fontWeight: 400, marginLeft: 6, textTransform: "none", letterSpacing: 0 }}>
                        — installment amount paid now
                      </span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      max={totalPrice}
                      value={installmentAmount}
                      onChange={(e) => setInstallmentAmount(e.target.value)}
                      placeholder="0"
                      style={inputStyle}
                    />
                    {installmentAmount !== "" && (
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 5 }}>
                        Remaining balance: ₺{Math.max(0, totalPrice - Number(installmentAmount)).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Staff & Time ───────────────────────────────────── */}
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              <Calendar size={15} color="var(--primary)" /> Date & Time
            </h2>
            <div style={{ display: "grid", gap: 14 }}>
              {/* Staff picker */}
              <div>
                <label style={labelStyle}>Staff Member</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {staff.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStaffId(s.id)}
                      style={{
                        padding: "8px 14px",
                        border: `2px solid ${staffId === s.id ? "var(--primary)" : "var(--border)"}`,
                        borderRadius: 8,
                        background: staffId === s.id ? "var(--primary-light)" : "var(--background)",
                        cursor: "pointer",
                        fontSize: 13,
                        color: staffId === s.id ? "var(--primary)" : "var(--foreground)",
                        fontWeight: staffId === s.id ? 500 : 400,
                      }}
                    >
                      {s.name}
                      <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: 6 }}>
                        {s.role}
                      </span>
                    </button>
                  ))}
                </div>
                {staff.length === 0 && (
                  <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
                    No staff found.{" "}
                    <Link href="/staff" style={{ color: "var(--primary)" }}>Add staff →</Link>
                  </p>
                )}
              </div>

              {/* Date & Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input
                    type="date"
                    value={date}
                    min={format(new Date(), "yyyy-MM-dd")}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Time Slot</label>
                  <select value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle}>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>{formatTime(slot)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* ── Summary bar ───────────────────────────────────── */}
          {selectedService && (
            <div style={{
              padding: "14px 18px",
              background: "var(--primary-light)",
              border: "1px solid var(--primary)",
              borderRadius: 10,
              fontSize: 13.5,
              color: "var(--primary)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span>
                <strong>{selectedService.name}</strong>
                {isPackage ? ` · ${sessions} sessions` : ` · ${selectedService.duration} min`}
                {date && time && (() => {
                  const d = new Date(`${date}T${time}:00`);
                  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                  return ` · ${d.getDate()} ${months[d.getMonth()]} at ${formatTime(time)}`;
                })()}
              </span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>₺{totalPrice.toFixed(2)}</div>
                {isPackage && installmentAmount !== "" && (
                  <div style={{ fontSize: 11, opacity: 0.8 }}>
                    ₺{Number(installmentAmount).toFixed(2)} paid now
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: "12px 16px", background: "#fde8e8", borderRadius: 8, color: "#a01a1a", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <Link
              href="/appointments"
              style={{ ...btnStyle, background: "var(--muted)", color: "var(--foreground)", textDecoration: "none", textAlign: "center" }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !services.length || !staff.length || (customerMode === "new" && !!phoneError)}
              style={{
                ...btnStyle,
                background: "var(--primary)",
                color: "white",
                flex: 1,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Scheduling..." : isPackage ? "Create Package & Schedule" : "Schedule Appointment"}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}

function formatTime(slot: string) {
  const [h, m] = slot.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

const sectionStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "22px 24px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 17,
  marginBottom: 16,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--muted-foreground)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--background)",
  fontSize: 13.5,
  color: "var(--foreground)",
  outline: "none",
  boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  padding: "11px 24px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
};

const toggleBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 14px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
};

const stepperBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--background)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--foreground)",
};