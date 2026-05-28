"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/providers/language-provider";
import { LanguageToggle } from "@/components/layout/language-toggle";

export default function LoginPage() {
  const { t } = useLang();
  const router = useRouter();

  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Change password state
  const [showChangePw, setShowChangePw] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Login failed");
      return;
    }

    router.push("/dashboard");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);

    if (newPw !== confirmPw) { setPwError(t.login.pwMismatch); return; }
    if (newPw.length < 6) { setPwError(t.login.pwTooShort); return; }

    // Must be logged in first to change password
    // So we login first, then change
    setPwLoading(true);
    try {
      // Step 1: login with current credentials
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: currentPw }),
      });

      if (!loginRes.ok) { setPwError(t.login.pwWrong); return; }

      // Step 2: change password
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error ?? t.login.pwFailed);
        return;
      }

      setPwSuccess(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => {
        setShowChangePw(false);
        setPwSuccess(false);
      }, 2000);
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--background)",
      gap: 16,
    }}>
      <div style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "40px 44px",
        width: 380,
        maxWidth: "calc(100vw - 28px)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
      }}>
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
            {t.login.title}
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            {showChangePw ? t.login.changeSubtitle : t.login.subtitle}
          </p>
        </div>

        {!showChangePw ? (
          /* ── Login form ── */
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>{t.login.user}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t.login.pass}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {error && (
              <p style={{ fontSize: 12.5, color: "#c0392b", margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                padding: "10px",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? t.login.loading : t.login.signIn}
            </button>

            <button
              type="button"
              onClick={() => setShowChangePw(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted-foreground)",
                fontSize: 12.5,
                cursor: "pointer",
                textAlign: "center",
                padding: "4px 0",
                textDecoration: "underline",
              }}
            >
              {t.login.changePw}
            </button>
          </form>
        ) : (
          /* ── Change password form ── */
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>{t.login.user}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t.login.currentPw}</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t.login.newPw}</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t.login.confirmPw}</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                style={{
                  ...inputStyle,
                  borderColor: confirmPw && confirmPw !== newPw ? "#c45c5c" : "var(--border)",
                }}
              />
            </div>

            {pwError && (
              <p style={{ fontSize: 12.5, color: "#c0392b", margin: 0 }}>{pwError}</p>
            )}
            {pwSuccess && (
              <p style={{ fontSize: 12.5, color: "#2d7a2d", margin: 0 }}>
                {t.login.pwSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={pwLoading}
              style={{
                marginTop: 6,
                padding: "10px",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: pwLoading ? "not-allowed" : "pointer",
                opacity: pwLoading ? 0.7 : 1,
              }}
            >
              {pwLoading ? t.login.updatingPw : t.login.updatePw}
            </button>

            <button
              type="button"
              onClick={() => { setShowChangePw(false); setPwError(""); }}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted-foreground)",
                fontSize: 12.5,
                cursor: "pointer",
                textAlign: "center",
                padding: "4px 0",
              }}
            >
              {t.login.backToLogin}
            </button>
          </form>
        )}
      </div>
      <div style={{ width: 180 }}>
        <LanguageToggle />
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--muted-foreground)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--background)",
  fontSize: "16px",
  color: "var(--foreground)",
  outline: "none",
  boxSizing: "border-box",
};
