"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft, Clock, TurkishLira, User, Phone, Calendar,
  Search, Plus, Minus, Package,
} from "lucide-react";
import Link from "next/link";
import { useLang } from "@/components/providers/language-provider";

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
  const { t } = useLang();

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
  const [existingPhones, setExistingPhones] = useState<string[]>([]);

  useEffect(() => {
    async function loadPhones() {
      try {
        const res = await fetch("/api/customers");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setExistingPhones(data.map((c: any) => c.phone));
          }
        }
      } catch (err) {
        console.error("Failed to load customer phone numbers:", err);
      }
    }
    loadPhones();
  }, []);

  // ── Service / booking state ─────────────────────────────────────
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [staffId, setStaffId] = useState(staff[0]?.id || "");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("10:00");
  const [sessions, setSessions] = useState(1);
  const [priceOverride, setPriceOverride] = useState<string>("");
  const [installmentAmount, setInstallmentAmount] = useState<string>("");

  const selectedService = services.find((s) => s.id === serviceId);

  function selectService(id: string) {
    setServiceId(id);
    setPriceOverride("");
    setSessions(1);
    setInstallmentAmount("");
  }

  const defaultTotalPrice = selectedService
    ? selectedService.price * sessions
    : 0;
  const totalPrice =
    priceOverride !== "" ? Number(priceOverride) : defaultTotalPrice;
  const visibleSearchResults = searchQuery.length >= 2 ? searchResults : [];

  // ── Customer search ─────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length < 2) {
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
      setPhoneError(t.appointmentForm.errors.phoneRequired);
      return;
    }
    if (!digits.startsWith("05")) {
      setPhoneError(t.appointmentForm.errors.phoneMustStart);
      return;
    }

    const hasMatchingPrefix = existingPhones.some((phone) => phone.startsWith(digits));
    if (digits.length < 11) {
      setPhoneError(""); // Clear any blocking errors while typing
    } else {
      // Exactly 11 digits
      const isExactMatch = existingPhones.some((phone) => phone === digits);
      if (isExactMatch) {
        setPhoneError(t.common.phoneExists ?? "Phone number is already registered");
      } else {
        setPhoneError("");
      }
    }
  }

  function validatePhone(): boolean {
    if (newPhone.length === 0) { setPhoneError(t.appointmentForm.errors.phoneRequired); return false; }
    if (!newPhone.startsWith("05")) { setPhoneError(t.appointmentForm.errors.phoneMustStart); return false; }
    if (newPhone.length !== 11) { setPhoneError(t.appointmentForm.errors.PhoneTooShort); return false; }
    const isExactMatch = existingPhones.some((phone) => phone === newPhone);
    if (isExactMatch) {
      setPhoneError(t.common.phoneExists ?? "Phone number is already registered");
      return false;
    }
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
      if (!newName.trim()) { setError(t.appointmentForm.errors.nameRequired); return; }
      if (!validatePhone()) return;

      try {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim(), phone: newPhone }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === "Phone number is already registered") {
            throw new Error(t.common.phoneExists ?? "Phone number is already registered");
          }
          throw new Error(data.error || "Failed to create customer");
        }
        resolvedCustomerId = data.id;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create customer");
        return;
      }
    }

    if (!resolvedCustomerId) { setError(t.appointmentForm.errors.customerRequired); return; }
    if (!serviceId) { setError(t.appointmentForm.errors.serviceRequired); return; }
    if (!staffId) { setError(t.appointmentForm.errors.staffRequired); return; }

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
    <div className="admin-page" style={{ padding: "32px 36px", maxWidth: 680 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link
          href="/appointments"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", fontSize: 13, textDecoration: "none", marginBottom: 16 }}
        >
          <ArrowLeft size={14} /> {t.appointmentForm.back}
        </Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500 }}>
          {t.appointmentForm.title}
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>
          {t.appointmentForm.subtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: 20 }}>

          {/* ── Customer Section ───────────────────────────────── */}
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>
              <User size={15} color="var(--primary)" /> {t.appointmentForm.customerInfo}
            </h2>

            {/* Mode toggle */}
            <div className="admin-actions" style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => { setCustomerMode("search"); setSelectedCustomer(null); }}
                style={{
                  ...toggleBtnStyle,
                  background: customerMode === "search" ? "var(--primary)" : "var(--muted)",
                  color: customerMode === "search" ? "white" : "var(--foreground)",
                }}
              >
                <Search size={12} /> {t.appointmentForm.searchCustomer}
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
                <Plus size={12} /> {t.appointmentForm.newCustomer}
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
                      {t.appointmentForm.change}
                    </button>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.appointmentForm.searchPlaceholder}
                      style={inputStyle}
                    />
                    {searching && (
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6 }}>
                        {t.common.searching}
                      </div>
                    )}
                    {visibleSearchResults.length > 0 && (
                      <div style={{
                        marginTop: 6, border: "1px solid var(--border)", borderRadius: 8,
                        overflow: "hidden", background: "var(--card)",
                      }}>
                        {visibleSearchResults.map((c) => (
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
                    {searchQuery.length >= 2 && !searching && visibleSearchResults.length === 0 && (
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6 }}>
                        {t.appointmentForm.errors.customerNotFound}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {customerMode === "new" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={labelStyle}>{t.appointmentForm.fullName}</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder= {t.appointmentForm.fullNamePlaceholder}
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
                    value={newPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="05XXXXXXXXX"
                    maxLength={11}
                    style={{
                      ...inputStyle,
                      borderColor: (() => {
                        if (newPhone.length === 0) return "var(--border)";
                        if (!newPhone.startsWith("05")) return "#c45c5c";

                        const hasMatchingPrefix = existingPhones.some((p) => p.startsWith(newPhone));
                        if (newPhone.length === 11) {
                          return hasMatchingPrefix ? "#c45c5c" : "#2d7a2d";
                        }
                        return !hasMatchingPrefix ? "#2d7a2d" : "var(--border)";
                      })(),
                    }}
                  />
                  <div style={{ marginTop: 5, minHeight: 18, display: "flex", justifyContent: "space-between" }}>
                    <span style={{
                      fontSize: 12,
                      color: (() => {
                        if (newPhone.length === 0) return "var(--muted-foreground)";
                        if (!newPhone.startsWith("05")) return "#c45c5c";

                        const hasMatchingPrefix = existingPhones.some((p) => p.startsWith(newPhone));
                        if (newPhone.length === 11) {
                          return hasMatchingPrefix ? "#c45c5c" : "#2d7a2d";
                        }
                        return !hasMatchingPrefix ? "#2d7a2d" : "var(--muted-foreground)";
                      })(),
                    }}>
                      {(() => {
                        if (newPhone.length === 0) return t.appointmentForm.phoneNumberRules;
                        if (!newPhone.startsWith("05")) return t.appointmentForm.errors.phoneMustStart;

                        const hasMatchingPrefix = existingPhones.some((p) => p.startsWith(newPhone));
                        if (newPhone.length === 11) {
                          return hasMatchingPrefix
                            ? (t.common.phoneExists ?? "Phone number is already registered")
                            : t.appointmentForm.validNumber;
                        }
                        return !hasMatchingPrefix
                          ? (t.appointmentForm.availableNumber ?? "✓ Phone number is available")
                          : t.appointmentForm.phoneNumberRules;
                      })()}
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
              <TurkishLira size={15} color="var(--primary)" /> {t.appointmentForm.service}
            </h2>
            <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {services.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => selectService(svc.id)}
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
                      <Clock size={11} /> {svc.duration}{t.services.min}
                    </span>
                    <span style={{ color: "var(--primary)", fontWeight: 500 }}>₺{svc.price}</span>
                  </div>
                </button>
              ))}
            </div>
            {services.length === 0 && (
              <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
                {t.appointmentForm.noServices}{" "}
                <Link href="/services" style={{ color: "var(--primary)" }}>{t.appointmentForm.addServices}</Link>
              </p>
            )}
          </section>

          {/* ── Sessions & Price ───────────────────────────────── */}
          {selectedService && (
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                <Package size={15} color="var(--primary)" /> {t.appointmentForm.packagePricing}
              </h2>
              <div style={{ display: "grid", gap: 18 }}>

                {/* Sessions stepper */}
                <div>
                  <label style={labelStyle}>{t.appointmentForm.appNumber}</label>
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
                        {t.appointmentForm.package}
                      </span>
                    )}
                  </div>
                  {sessions === 1 && (
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6 }}>
                      {t.appointmentForm.packetSubtitle}
                    </p>
                  )}
                </div>

                {/* Total price override */}
                <div>
                  <label style={labelStyle}>
                    {t.appointmentForm.total} (₺)
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
                      {t.appointmentForm.downPayment} (₺)
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
                        {t.appointmentForm.remainingBalance} ₺{Math.max(0, totalPrice - Number(installmentAmount)).toFixed(2)}
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
              <Calendar size={15} color="var(--primary)" /> {t.appointmentForm.dateTime}
            </h2>
            <div style={{ display: "grid", gap: 14 }}>
              {/* Staff picker */}
              <div>
                <label style={labelStyle}>{t.appointmentForm.staffMember}</label>
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
                    {t.appointmentForm.noStaff}
                    <Link href="/staff" style={{ color: "var(--primary)" }}>{t.appointmentForm.addStaff}</Link>
                  </p>
                )}
              </div>

              {/* Date & Time */}
              <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>{t.appointmentForm.date}</label>
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
                  <label style={labelStyle}>{t.appointmentForm.timeSlot}</label>
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
                {isPackage ? ` · ${sessions} ${t.appointmentForm.packages}` : ` · ${selectedService.duration} ${t.services.min}`}
                {date && time && (() => {
                  const d = new Date(`${date}T${time}:00`);
                  const monthKeys = [
                    "january", "february", "march", "april", "may", "june",
                    "july", "august", "september", "october", "november", "december"
                  ] as const;
                  const monthName = t.months[monthKeys[d.getMonth()]];
                  return ` · ${d.getDate()} ${monthName} ${t.appointmentForm.at} ${formatTime(time)}`;
                })()}
              </span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>₺{totalPrice.toFixed(2)}</div>
                {isPackage && installmentAmount !== "" && (
                  <div style={{ fontSize: 11, opacity: 0.8 }}>
                    ₺{Number(installmentAmount).toFixed(2)} {t.appointmentForm.paidNow}
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
              {t.common.cancel}
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
              {loading ? t.appointmentForm.scheduling : isPackage ? t.appointmentForm.createPackageAndSchedule : t.appointmentForm.schedule}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}

function formatTime(slot: string) {
  return slot;
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
