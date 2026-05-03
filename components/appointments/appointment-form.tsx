"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import { ArrowLeft, Clock, TurkishLira, User, Phone, Calendar } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/components/providers/language-provider";

type Service = { id: string; name: string; price: number; duration: number };
type Staff = { id: string; name: string; role: string };

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
  const { t } = useLang();

  // Translated month names (index 0–11)
  const MONTHS = [
    t.months.january, t.months.february, t.months.march, t.months.april,
    t.months.may, t.months.june, t.months.july, t.months.august,
    t.months.september, t.months.october, t.months.november, t.months.december,
  ];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [staffId, setStaffId] = useState(staff[0]?.id || "");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("10:00");

  const selectedService = services.find((s) => s.id === serviceId);

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    setCustomerPhone(digits);
 
    if (digits.length === 0) {
      setPhoneError(t.appointmentForm.errors.phoneRequired);
    } else if (!digits.startsWith("05")) {
      setPhoneError(t.appointmentForm.errors.phoneMustStart);
    } else if (digits.length < 11) {
      setPhoneError(`${digits.length}/11 — ${t.appointmentForm.errors.PhoneTooShort}`);
    } else {
      setPhoneError("");
    }
  }
 
  function validatePhone(): boolean {
    if (customerPhone.length === 0) {
      setPhoneError(t.appointmentForm.errors.phoneRequired);
      return false;
    }
    if (!customerPhone.startsWith("05")) {
      setPhoneError(t.appointmentForm.errors.phoneMustStart);
      return false;
    }
    if (customerPhone.length !== 11) {
      setPhoneError(t.appointmentForm.errors.PhoneTooShort);
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) { setError(t.appointmentForm.errors.nameRequired); return; }
    if (!validatePhone()) return;
    if (!serviceId) { setError(t.appointmentForm.errors.serviceRequired); return; }
    if (!staffId) { setError(t.appointmentForm.errors.staffRequired); return; }

    setLoading(true);
    setError("");

    try {
      const startTime = new Date(`${date}T${time}:00`);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          customerName, 
          customerPhone: customerPhone || undefined, 
          startTime: startTime.toISOString(), 
          serviceId, 
          staffId, 
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create appointment");
      }

      router.push("/appointments");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.appointmentForm.errors.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "32px 36px", maxWidth: 680 }}>
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

          {/* Customer Info */}
          <section style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "22px 24px" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <User size={15} color="var(--primary)" /> {t.appointmentForm.customerInfo}
            </h2>
            <div style={{ display: "grid", gap: 14 }}>

              {/* Name */}
              <div>
                <label style={labelStyle}>{t.appointmentForm.fullName}</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t.appointmentForm.fullNamePlaceholder}
                  required
                  style={inputStyle}
                />
              </div>

              {/* phone */}
              <div>
                <label style={labelStyle}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Phone size={11} /> {t.appointmentForm.phoneNumber}
                  </span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={customerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="05XXXXXXXXX"
                  maxLength={11}
                  style={{
                    ...inputStyle,
                    borderColor: phoneError ? "#c45c5c" : customerPhone.length === 11 && !phoneError ? "#2d7a2d" : "var(--border)",
                  }}
                />
                {/* Live counter + validation feedback */}
                <div style={{ marginTop: 5, minHeight: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: phoneError ? "#c45c5c" : customerPhone.length === 11 ? "#2d7a2d" : "var(--muted-foreground)" }}>
                    {phoneError
                      ? phoneError
                      : customerPhone.length === 11
                      ? t.appointmentForm.validNumber
                      : t.appointmentForm.phoneNumberRules}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
                    {customerPhone.length}/11
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Service Selection */}
          <section style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "22px 24px" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <TurkishLira size={15} color="var(--primary)" /> {t.appointmentForm.service}
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
                <Link href="/services" style={{ color: "var(--primary)" }}>Add services →</Link>
              </p>
            )}
          </section>

          {/* Staff & Time */}
          <section style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "22px 24px" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 17, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
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
                    {t.appointmentForm.noStaff}{" "}
                    <Link href="/staff" style={{ color: "var(--primary)" }}>Add staff →</Link>
                  </p>
                )}
              </div>
 
              {/* Date & Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
 
          {/* Summary bar */}
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
                <strong>{selectedService.name}</strong> · {selectedService.duration}{t.services.min}
                {date && time && (() => {
                  const d = new Date(`${date}T${time}:00`);
                  const hhmm = formatTime(time);
                  return ` · ${MONTHS[d.getMonth()]} ${d.getDate()} ${t.appointmentForm.at} ${hhmm}`;
                })()}
              </span>
              <span style={{ fontWeight: 600, fontSize: 16 }}>₺{selectedService.price}</span>
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
              disabled={loading || !services.length || !staff.length || !!phoneError}
              style={{
                ...btnStyle,
                background: "var(--primary)",
                color: "white",
                flex: 1,
                opacity: (loading || !!phoneError) ? 0.7 : 1,
                cursor: (loading || !!phoneError) ? "not-allowed" : "pointer",
              }}
            >
              {loading ? t.appointmentForm.scheduling : t.appointmentForm.schedule}
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
};
 
const btnStyle: React.CSSProperties = {
  padding: "11px 24px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
};