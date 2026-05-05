import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Package, Calendar, TurkishLira, Clock } from "lucide-react";
import { format } from "date-fns";

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      appointments: {
        include: { service: true, staff: true, userPackage: true },
        orderBy: { startTime: "desc" },
      },
      packages: {
        include: {
          installments: { orderBy: { paidAt: "desc" } },
          _count: { select: { appointments: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) notFound();

  const activePackages = customer.packages.filter((p) => p.remainingSessions > 0);
  const completedPackages = customer.packages.filter((p) => p.remainingSessions === 0);

  const totalSpent = customer.packages.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalOwed = customer.packages.reduce(
    (sum, p) => sum + Math.max(0, p.totalPrice - p.paidAmount),
    0
  );

  return (
    <div style={{ padding: "32px 36px", maxWidth: 820 }}>

      {/* Back */}
      <Link
        href="/customers"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", fontSize: 13, textDecoration: "none", marginBottom: 20 }}
      >
        <ArrowLeft size={14} /> All Customers
      </Link>

      {/* ── Profile Header ───────────────────────────────────────── */}
      <div style={{
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
              Customer since {format(new Date(customer.createdAt), "MMMM yyyy")}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 28, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{customer.appointments.length}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Appointments</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{customer.packages.length}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Packages</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--primary)" }}>₺{totalSpent.toFixed(0)}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Paid</div>
          </div>
          {totalOwed > 0 && (
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#c45c5c" }}>₺{totalOwed.toFixed(0)}</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Owed</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Active Packages ──────────────────────────────────────── */}
      {activePackages.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
            <Package size={15} color="var(--primary)" /> Active Packages
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
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{pkg.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                        Started {format(new Date(pkg.createdAt), "d MMM yyyy")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{
                        fontSize: 15, fontWeight: 700,
                        color: lowSessions ? "#c45c5c" : "var(--foreground)",
                      }}>
                        {pkg.remainingSessions} session{pkg.remainingSessions !== 1 ? "s" : ""} left
                      </div>
                      {lowSessions && (
                        <div style={{ fontSize: 11, color: "#c45c5c", marginTop: 2 }}>
                          ⚠ Running low
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Session progress bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 5 }}>
                      <span>{usedSessions} of {pkg.totalSessions} sessions used</span>
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
                      <span style={{ color: "var(--muted-foreground)" }}>Total: </span>
                      <strong>₺{pkg.totalPrice.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted-foreground)" }}>Paid: </span>
                      <strong style={{ color: "var(--primary)" }}>₺{pkg.paidAmount.toFixed(2)}</strong>
                    </div>
                    {balance > 0 && (
                      <div>
                        <span style={{ color: "var(--muted-foreground)" }}>Balance: </span>
                        <strong style={{ color: "#c45c5c" }}>₺{balance.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>

                  {/* Installments */}
                  {pkg.installments.length > 0 && (
                    <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Payments
                      </div>
                      <div style={{ display: "grid", gap: 5 }}>
                        {pkg.installments.map((inst) => (
                          <div key={inst.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                            <span style={{ color: "var(--muted-foreground)" }}>
                              {format(new Date(inst.paidAt), "d MMM yyyy")}
                              {inst.note && ` · ${inst.note}`}
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
          <Calendar size={15} color="var(--primary)" /> Appointment History
        </h2>

        {customer.appointments.length === 0 ? (
          <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>No appointments yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {customer.appointments.map((appt) => {
              const statusColor =
                appt.status === "COMPLETED" ? "#2d7a2d"
                : appt.status === "CANCELLED" ? "#c45c5c"
                : "var(--primary)";

              return (
                <div key={appt.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 18px",
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: 10,
                }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: statusColor, flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13.5 }}>{appt.service.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                        {format(new Date(appt.startTime), "d MMM yyyy · h:mm a")} · {appt.staff.name}
                        {appt.userPackage && (
                          <span style={{ marginLeft: 8, padding: "1px 7px", background: "var(--primary-light)", color: "var(--primary)", borderRadius: 10, fontSize: 11 }}>
                            Package
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>₺{appt.priceAtBooking.toFixed(2)}</div>
                    <div style={{ fontSize: 11, color: statusColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {appt.status.toLowerCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Completed Packages ───────────────────────────────────── */}
      {completedPackages.length > 0 && (
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 7, color: "var(--muted-foreground)" }}>
            <Package size={15} /> Completed Packages
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
                  <div style={{ fontWeight: 500, fontSize: 13.5 }}>{pkg.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    {pkg.totalSessions} sessions · Completed
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>₺{pkg.paidAmount.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>of ₺{pkg.totalPrice.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}