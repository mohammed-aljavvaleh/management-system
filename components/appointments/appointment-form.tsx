"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft, Clock, User, Phone, Calendar,
  Search, Plus, Minus, Package,
} from "lucide-react";
import Link from "next/link";
import { useLang, CurrencySymbol, Price } from "@/components/providers/language-provider";
import { localizePackageName, localizeServiceName } from "@/lib/package-utils";

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
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const { t, mounted } = useLang();

  // ── Package booking state ──────────────────────────────────────
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [fetchingCustomerDetails, setFetchingCustomerDetails] = useState(false);
  const [bookingType, setBookingType] = useState<"normal" | "package">("normal");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");

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
  const [phoneExists, setPhoneExists] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);

  useEffect(() => {
    if (newPhone.length !== 11) {
      setPhoneExists(false);
      setPhoneError("");
      return;
    }

    let active = true;
    async function checkPhoneUnique() {
      setCheckingPhone(true);
      try {
        const res = await fetch(`/api/customers?q=${newPhone}`);
        if (res.ok && active) {
          const data = await res.json();
          const match = Array.isArray(data) && data.some((c: any) => c.phone === newPhone);
          if (match) {
            setPhoneExists(true);
            setPhoneError(t.common.phoneExists ?? "Phone number is already registered");
          } else {
            setPhoneExists(false);
            setPhoneError("");
          }
        }
      } catch (err) {
        console.error("Failed to check phone number uniqueness:", err);
      } finally {
        if (active) setCheckingPhone(false);
      }
    }

    checkPhoneUnique();
    return () => {
      active = false;
    };
  }, [newPhone, t.common.phoneExists]);

  // ── Service / booking state ─────────────────────────────────────
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [staffId, setStaffId] = useState(staff[0]?.id || "");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("");
  const [sessions, setSessions] = useState(1);
  const [priceOverride, setPriceOverride] = useState<string>("");
  const [installmentAmount, setInstallmentAmount] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId);

  // Fetch available slots dynamically when staff, date, or service changes
  useEffect(() => {
    if (!staffId || !date || !selectedService) return;
    const duration = selectedService.duration;

    let active = true;
    async function fetchAvailability() {
      setFetchingSlots(true);
      try {
        const offset = new Date().getTimezoneOffset();
        const res = await fetch(
          `/api/staff/${staffId}/availability?date=${date}&duration=${duration}&offset=${offset}`
        );
        if (res.ok && active) {
          const data = await res.json();
          const slots = data.slots || [];
          setAvailableSlots(slots);

          // Clear selected time if it's no longer available on the new date/staff/service
          if (time && !slots.includes(time)) {
            setTime("");
          }
        }
      } catch (err) {
        console.error("Failed to fetch staff availability:", err);
      } finally {
        if (active) setFetchingSlots(false);
      }
    }

    fetchAvailability();

    return () => {
      active = false;
    };
  }, [staffId, date, serviceId, selectedService]);

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

  // Fetch full customer details when selectedCustomer is chosen
  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerDetails(null);
      setBookingType("normal");
      setSelectedPackageId("");
      return;
    }

    const customerId = selectedCustomer.id;
    let active = true;
    async function fetchCustomerDetails() {
      setFetchingCustomerDetails(true);
      try {
        const res = await fetch(`/api/customers/${customerId}?excludeAppointments=true`);
        if (res.ok && active) {
          const data = await res.json();
          setCustomerDetails(data);
          
          const activePkgs = data.packages?.filter((p: any) => p.remainingSessions > 0) || [];
          if (activePkgs.length > 0) {
            setBookingType("package");
            setSelectedPackageId(activePkgs[0].id);
            const bal = Math.max(0, activePkgs[0].totalPrice - activePkgs[0].paidAmount);
            setInstallmentAmount(activePkgs[0].remainingSessions === 1 ? bal.toString() : "");
          } else {
            setBookingType("normal");
            setSelectedPackageId("");
          }
        }
      } catch (err) {
        console.error("Failed to fetch customer details:", err);
      } finally {
        if (active) setFetchingCustomerDetails(false);
      }
    }
    fetchCustomerDetails();

    return () => {
      active = false;
    };
  }, [selectedCustomer]);

  // Lock service when package booking is selected
  useEffect(() => {
    if (bookingType === "package" && customerDetails) {
      const activePkgs = customerDetails.packages?.filter((p: any) => p.remainingSessions > 0) || [];
      const selectedPkg = activePkgs.find((p: any) => p.id === selectedPackageId);
      if (selectedPkg?.serviceId) {
        setServiceId(selectedPkg.serviceId);
      }
    }
  }, [bookingType, selectedPackageId, customerDetails]);

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
    setPhoneError("");
  }

  function validatePhone(): boolean {
    if (newPhone.length === 0) { setPhoneError(t.appointmentForm.errors.phoneRequired); return false; }
    if (!newPhone.startsWith("05")) { setPhoneError(t.appointmentForm.errors.phoneMustStart); return false; }
    if (newPhone.length !== 11) { setPhoneError(t.appointmentForm.errors.PhoneTooShort); return false; }
    if (phoneExists) {
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

    if (bookingType === "package") {
      if (!selectedPackageId) {
        setError(t.appointmentForm.errors.failed ?? "Please select a package");
        return;
      }
      const activePkgs = customerDetails?.packages?.filter((p: any) => p.remainingSessions > 0) || [];
      const selectedPkg = activePkgs.find((p: any) => p.id === selectedPackageId);
      if (!selectedPkg) {
        setError(t.appointmentForm.errors.failed ?? "Package not found");
        return;
      }
      if (!staffId) {
        setError(t.appointmentForm.errors.staffRequired);
        return;
      }
      if (!time) {
        setError(t.appointmentForm.errors.timeRequired ?? "Please select a time slot");
        return;
      }

      const payment = installmentAmount !== "" ? Number(installmentAmount) : 0;
      if (Number.isNaN(payment) || payment < 0) {
        setError(t.customers.invalidPaymentAmount ?? "Invalid payment amount");
        return;
      }

      const remainingBalance = Math.max(0, selectedPkg.totalPrice - selectedPkg.paidAmount);
      if (payment > remainingBalance) {
        setError(
          (t.customers.paymentCannotExceed ?? "Payment cannot exceed {amount}").replace(
            "{amount}",
            remainingBalance.toFixed(2)
          )
        );
        return;
      }

      if (selectedPkg.remainingSessions === 1 && Math.abs(payment - remainingBalance) > 0.009) {
        setError(
          (t.customers.finalSessionMustMatch ?? "Final session payment must equal {amount}").replace(
            "{amount}",
            remainingBalance.toFixed(2)
          )
        );
        return;
      }

      setLoading(true);
      try {
        const startTime = new Date(`${date}T${time}:00`);
        const res = await fetch(`/api/packages/${selectedPackageId}/next-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startTime: startTime.toISOString(),
            staffId,
            installmentAmount: payment,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create appointment");
        }

        setSuccess(true);
        setTimeout(() => {
          router.push("/appointments");
          router.refresh();
        }, 1200);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create appointment");
        setLoading(false);
      }
      return;
    }

    if (!resolvedCustomerId) { setError(t.appointmentForm.errors.customerRequired); return; }
    if (!serviceId) { setError(t.appointmentForm.errors.serviceRequired); return; }
    if (!staffId) { setError(t.appointmentForm.errors.staffRequired); return; }
    if (!time) { setError(t.appointmentForm.errors.timeRequired ?? "Please select a time slot"); return; }

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

      setSuccess(true);
      setTimeout(() => {
        router.push("/appointments");
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create appointment");
      setLoading(false);
    }
  }

  const isPackage = sessions > 1;

  if (!mounted) {
    return (
      <div className="admin-page" style={{ padding: "32px 36px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="admin-page" style={{ padding: "32px 36px", maxWidth: 1100 }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .appointment-form-grid-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 1024px) {
          .appointment-form-grid-container {
            grid-template-columns: 1fr 1.1fr;
            align-items: start;
          }
        }
      ` }} />
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link
          href="/appointments"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", fontSize: 13, textDecoration: "none", marginBottom: 16 }}
        >
          {t.appointmentForm.back}
        </Link>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500 }}>
          {t.appointmentForm.title}
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 4 }}>
          {t.appointmentForm.subtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="appointment-form-grid-container">
          {/* Left Column */}
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
                  <>
                    {/* Selected customer chip */}
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

                    {/* Booking Type selection */}
                    {fetchingCustomerDetails ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                          {t.common.searching ?? "Loading customer packages..."}
                        </span>
                      </div>
                    ) : (
                      customerDetails && (() => {
                        const activePkgs = customerDetails.packages?.filter((p: any) => p.remainingSessions > 0) || [];
                        if (activePkgs.length === 0) return null;

                        return (
                          <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                            <label style={labelStyle}>{t.appointmentForm.bookingType ?? "BOOKING TYPE"}</label>
                            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setBookingType("normal");
                                  setInstallmentAmount("");
                                }}
                                style={{
                                  ...toggleBtnStyle,
                                  flex: 1,
                                  justifyContent: "center",
                                  background: bookingType === "normal" ? "var(--primary)" : "var(--muted)",
                                  color: bookingType === "normal" ? "white" : "var(--foreground)",
                                }}
                              >
                                {t.appointmentForm.normalAppointment ?? "Normal Appointment"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBookingType("package");
                                  // Prefill installment if it is the first package's final session
                                  const firstPkg = activePkgs[0];
                                  if (firstPkg) {
                                    setSelectedPackageId(firstPkg.id);
                                    const bal = Math.max(0, firstPkg.totalPrice - firstPkg.paidAmount);
                                    setInstallmentAmount(firstPkg.remainingSessions === 1 ? bal.toString() : "");
                                  }
                                }}
                                style={{
                                  ...toggleBtnStyle,
                                  flex: 1,
                                  justifyContent: "center",
                                  background: bookingType === "package" ? "var(--primary)" : "var(--muted)",
                                  color: bookingType === "package" ? "white" : "var(--foreground)",
                                }}
                              >
                                <Package size={14} style={{ marginRight: 4 }} />
                                {t.appointmentForm.packageAppointment ?? "Package Session"}
                              </button>
                            </div>

                            {bookingType === "package" && (
                              <div>
                                <label style={labelStyle}>{t.appointmentForm.selectActivePackage ?? "SELECT ACTIVE PACKAGE"}</label>
                                <div style={{ display: "grid", gap: 10 }}>
                                  {activePkgs.map((pkg: any) => {
                                    const isSelected = selectedPackageId === pkg.id;
                                    const bal = Math.max(0, pkg.totalPrice - pkg.paidAmount);
                                    return (
                                      <button
                                        key={pkg.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedPackageId(pkg.id);
                                          setInstallmentAmount(pkg.remainingSessions === 1 ? bal.toString() : "");
                                        }}
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          width: "100%",
                                          padding: "12px 14px",
                                          border: `2px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                                          borderRadius: 10,
                                          background: isSelected ? "var(--primary-light)" : "var(--card)",
                                          cursor: "pointer",
                                          textAlign: "left",
                                          transition: "all 0.15s ease",
                                        }}
                                      >
                                        <div style={{
                                          fontWeight: 500,
                                          fontSize: 13.5,
                                          color: isSelected ? "var(--primary)" : "var(--foreground)",
                                          marginBottom: 4,
                                        }}>
                                          {localizePackageName(pkg.name, t)}
                                        </div>
                                        <div style={{
                                          fontSize: 12,
                                          color: "var(--muted-foreground)",
                                          display: "flex",
                                          gap: 12,
                                        }}>
                                          <span>
                                            {pkg.remainingSessions} / {pkg.totalSessions} {t.customers.sessionsLeftBadge ?? "left"}
                                          </span>
                                          {bal > 0 && (
                                            <span style={{ color: "#c45c5c" }}>
                                              {t.appointmentForm.remainingBalance} <Price amount={bal} size={12} />
                                            </span>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </>
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
                    placeholder={t.appointmentForm.fullNamePlaceholder}
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

                        if (newPhone.length === 11) {
                          if (checkingPhone) return "var(--border)";
                          return phoneExists ? "#c45c5c" : "#2d7a2d";
                        }
                        return "var(--border)";
                      })(),
                    }}
                  />
                  <div style={{ marginTop: 5, minHeight: 18, display: "flex", justifyContent: "space-between" }}>
                    <span style={{
                      fontSize: 12,
                      color: (() => {
                        if (newPhone.length === 0) return "var(--muted-foreground)";
                        if (!newPhone.startsWith("05")) return "#c45c5c";

                        if (newPhone.length === 11) {
                          if (checkingPhone) return "var(--muted-foreground)";
                          return phoneExists ? "#c45c5c" : "#2d7a2d";
                        }
                        return "var(--muted-foreground)";
                      })(),
                    }}>
                      {(() => {
                        if (newPhone.length === 0) return t.appointmentForm.phoneNumberRules;
                        if (!newPhone.startsWith("05")) return t.appointmentForm.errors.phoneMustStart;

                        if (newPhone.length === 11) {
                          if (checkingPhone) return t.common.searching ?? "Checking...";
                          return phoneExists
                            ? (t.common.phoneExists ?? "Phone number is already registered")
                            : t.appointmentForm.availableNumber;
                        }
                        return t.appointmentForm.phoneNumberRules;
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
              <CurrencySymbol size={15} style={{ color: "var(--primary)" }} /> {t.appointmentForm.service}
              {bookingType === "package" && (
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--primary)", background: "var(--primary-light)", padding: "2px 8px", borderRadius: 12, marginLeft: "auto" }}>
                  {t.appointmentForm.package ?? "Package"}
                </span>
              )}
            </h2>
            <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {services.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  disabled={bookingType === "package"}
                  onClick={() => selectService(svc.id)}
                  style={{
                    padding: "14px 16px",
                    border: `2px solid ${serviceId === svc.id ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: 10,
                    background: serviceId === svc.id ? "var(--primary-light)" : "var(--background)",
                    cursor: bookingType === "package" ? "not-allowed" : "pointer",
                    textAlign: "left",
                    opacity: bookingType === "package" && serviceId !== svc.id ? 0.4 : 1,
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: 13.5, color: serviceId === svc.id ? "var(--primary)" : "var(--foreground)", marginBottom: 4 }}>
                    {svc.name}
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--muted-foreground)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock size={11} /> {svc.duration}{t.services.min}
                    </span>
                    <span style={{ color: "var(--primary)", fontWeight: 500 }}><Price amount={svc.price} /></span>
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
          {selectedService && bookingType !== "package" && (
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
                    {t.appointmentForm.total} (<CurrencySymbol size={13} />)
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
                      {t.appointmentForm.downPayment} (<CurrencySymbol size={13} />)
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
                        {t.appointmentForm.remainingBalance} <Price amount={Math.max(0, totalPrice - Number(installmentAmount))} />
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Package Session Details (only in package booking mode) ───────────────── */}
          {selectedService && bookingType === "package" && (() => {
            const activePkgs = customerDetails?.packages?.filter((p: any) => p.remainingSessions > 0) || [];
            const selectedPkg = activePkgs.find((p: any) => p.id === selectedPackageId);
            if (!selectedPkg) return null;

            const remainingBalance = Math.max(0, selectedPkg.totalPrice - selectedPkg.paidAmount);
            const isFinalSession = selectedPkg.remainingSessions === 1;

            return (
              <section style={sectionStyle}>
                <h2 style={sectionTitleStyle}>
                  <Package size={15} color="var(--primary)" /> {t.appointmentForm.packagePricing}
                </h2>
                <div style={{ display: "grid", gap: 18 }}>
                  {/* Session Info */}
                  <div>
                    <label style={labelStyle}>{t.appointmentForm.appNumber}</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 16, fontWeight: 500 }}>
                        {t.customers.sessionsLeftSummary
                          .replace("{remaining}", String(selectedPkg.remainingSessions))
                          .replace("{total}", String(selectedPkg.totalSessions))}
                      </span>
                      <span style={{
                        fontSize: 12, color: "var(--primary)", background: "var(--primary-light)",
                        padding: "3px 10px", borderRadius: 20, fontWeight: 500,
                      }}>
                        {isFinalSession ? (t.customers.finalSessionPaymentNote || "Final Session") : `${t.appointmentForm.package ?? "Package"} Session`}
                      </span>
                    </div>
                  </div>

                  {/* Installment payment if there is remaining debt */}
                  {remainingBalance > 0 ? (
                    <div>
                      <label style={labelStyle}>
                        {t.customers.paymentNow ?? "Payment Now (optional)"} (<CurrencySymbol size={13} />)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        max={remainingBalance}
                        value={installmentAmount}
                        onChange={(e) => {
                          if (!isFinalSession) {
                            setInstallmentAmount(e.target.value);
                          }
                        }}
                        disabled={isFinalSession}
                        placeholder="0"
                        style={inputStyle}
                      />
                      <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--muted-foreground)" }}>
                        {isFinalSession
                          ? `${t.customers.finalSessionPaymentNote ?? "Final session payment is fixed to"}: `
                          : `${t.customers.maximumPaymentNote ?? "Maximum payment is"}: `}
                        <Price amount={remainingBalance} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: 13, color: "#2d7a2d", fontWeight: 500 }}>
                        ✓ {t.appointments.fullyPaid ?? "Fully Paid"}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            );
          })()}
          </div>

          {/* Right Column */}
          <div style={{ display: "grid", gap: 20 }}>

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
                        {(t.staff.roles as any)[s.role] || s.role}
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
              <div style={{ display: "grid", gap: 14 }}>
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
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: -2, marginBottom: 8, lineHeight: 1.4 }}>
                    {t.appointmentForm.availableSlotsExplanation}
                  </p>
                  {fetchingSlots ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{t.common.searching ?? "Loading available slots..."}</span>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div style={{ padding: "12px 14px", border: "1.5px dashed var(--border)", borderRadius: 8, background: "var(--muted)", color: "#c45c5c", fontSize: 13 }}>
                      {t.appointmentForm.errors.noAvailableSlots}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(75px, 1fr))", gap: 8, marginTop: 4 }}>
                      {availableSlots.map((slot) => {
                        const isSelected = time === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setTime(slot)}
                            style={{
                              padding: "8px 0",
                              textAlign: "center",
                              border: `1.5px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                              borderRadius: 8,
                              background: isSelected ? "var(--primary-light)" : "var(--background)",
                              color: isSelected ? "var(--primary)" : "var(--foreground)",
                              fontWeight: isSelected ? 600 : 400,
                              cursor: "pointer",
                              fontSize: 13,
                              transition: "all 0.15s ease",
                            }}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  )}
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
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <strong>{localizeServiceName(selectedService.name, t)}</strong>
                <span style={{ color: "var(--primary)", opacity: 0.5 }}>·</span>
                <span>
                  {bookingType === "package"
                    ? (t.appointmentForm.package ?? "Package")
                    : isPackage
                    ? `${sessions} ${t.appointmentForm.packages}`
                    : `${selectedService.duration} ${t.services.min}`}
                </span>
                {date && time && (() => {
                  const d = new Date(`${date}T${time}:00`);
                  const monthKeys = [
                    "january", "february", "march", "april", "may", "june",
                    "july", "august", "september", "october", "november", "december"
                  ] as const;
                  const monthName = t.months[monthKeys[d.getMonth()]];
                  return (
                    <>
                      <span style={{ color: "var(--primary)", opacity: 0.5 }}>·</span>
                      <span>{d.getDate()} {monthName}</span>
                      <span>{t.appointmentForm.at}</span>
                      <span style={{ direction: "ltr", display: "inline-block" }}>{formatTime(time)}</span>
                    </>
                  );
                })()}
              </div>
              <div style={{ textAlign: "right" }}>
                {bookingType === "package" ? (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>
                      <Price amount={installmentAmount !== "" ? Number(installmentAmount) : 0} size={16} />
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>
                      {t.appointmentForm.paidNow ?? "Paid now"}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 16 }}><Price amount={totalPrice} size={16} /></div>
                    {isPackage && installmentAmount !== "" && (
                      <div style={{ fontSize: 11, opacity: 0.8 }}>
                        <Price amount={Number(installmentAmount)} /> {t.appointmentForm.paidNow}
                      </div>
                    )}
                  </>
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
              style={{
                ...btnStyle,
                background: "var(--muted)",
                color: "var(--foreground)",
                textDecoration: "none",
                textAlign: "center",
                padding: "9px 20px",
                fontSize: 13,
                height: 38,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                transition: "all 0.2s ease",
              }}
            >
              {t.common.cancel}
            </Link>
            <button
              type="submit"
              disabled={loading || success || !services.length || !staff.length || (customerMode === "new" && !!phoneError)}
              style={{
                ...btnStyle,
                background: success ? "#2d7a2d" : "var(--primary)",
                color: "white",
                flex: 1,
                opacity: loading ? 0.7 : 1,
                cursor: (loading || success) ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.2s ease",
                height: 38,
                boxSizing: "border-box",
                padding: "9px 20px",
                fontSize: 13,
              }}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                  <span>{t.appointmentForm.scheduling}</span>
                </>
              ) : success ? (
                <span>{t.appointmentForm.successScheduled ?? "✓ Scheduled successfully!"}</span>
              ) : (
                <span>
                  {bookingType === "package"
                    ? t.appointmentForm.schedule
                    : isPackage
                    ? t.appointmentForm.createPackageAndSchedule
                    : t.appointmentForm.schedule}
                </span>
              )}
            </button>
          </div>

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
