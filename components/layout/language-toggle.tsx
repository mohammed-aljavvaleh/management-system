"use client";

import { useLang } from "@/components/providers/language-provider";

export function LanguageToggle() {
  const { lang, setLang } = useLang();

  return (
    <div
      dir="ltr"
      style={{
        display: "flex",
        direction: "ltr",
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
        width: "100%",
      }}
    >
      {(["en", "tr", "ar"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            flex: 1,
            padding: "7px 0",
            border: "none",
            background: lang === l ? "var(--primary)" : "transparent",
            color: lang === l ? "white" : "var(--muted-foreground)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: lang === l ? 600 : 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          <span style={{ fontSize: 14 }}>
            {l === "en" ? "🇬🇧" : l === "tr" ? "🇹🇷" : "🇸🇦"}
          </span>
          {l === "en" ? "EN" : l === "tr" ? "TR" : "AR"}
        </button>
      ))}
    </div>
  );
}
