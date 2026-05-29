"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { SaudiRiyal, TurkishLira } from "lucide-react";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";
import ar from "@/messages/ar.json";

type Language = "en" | "tr" | "ar";
type Currency = "TRY" | "SAR";
type Translations = typeof en;

const messages = { en, tr, ar };

type LanguageContextType = {
  lang: Language;
  t: Translations;
  setLang: (lang: Language) => void;
  mounted: boolean;
  currency: Currency;
  currencySymbol: string;
  formatPrice: (amount: number, showDecimals?: boolean) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  t: en,
  setLang: () => { },
  mounted: false,
  currency: "TRY",
  currencySymbol: "₺",
  formatPrice: (amount: number) => `₺${amount.toFixed(2)}`,
});

export function LanguageProvider({ children, initialCurrency }: { children: ReactNode; initialCurrency?: Currency }) {
  const [lang, setLangState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency || "TRY");

  // Load saved preference on mount
  useEffect(() => {
    window.requestAnimationFrame(() => {
      const saved = localStorage.getItem("lang") as Language;
      if (saved === "en" || saved === "tr" || saved === "ar") {
        setLangState(saved);
        document.cookie = `lang=${saved}; path=/; max-age=31536000; SameSite=Lax`;
      } else {
        document.cookie = `lang=en; path=/; max-age=31536000; SameSite=Lax`;
      }

      const offset = new Date().getTimezoneOffset().toString();
      const existingOffset = document.cookie
        .split("; ")
        .find((row) => row.startsWith("timezone-offset="))
        ?.split("=")[1];
      if (existingOffset !== offset) {
        document.cookie = `timezone-offset=${offset}; path=/; max-age=31536000; SameSite=Lax`;
      }

      setMounted(true);
    });

    const controller = new AbortController();

    // Fetch initial currency from salon details
    fetch("/api/auth/me", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const salonCurrency = data?.salon?.currency ?? data?.currency;
        if (salonCurrency === "TRY" || salonCurrency === "SAR") {
          setCurrencyState(salonCurrency);
        }
      })
      .catch(() => { });

    return () => controller.abort();
  }, []);

  // Update HTML tag dir & lang attributes on language changes
  useEffect(() => {
    if (mounted) {
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = lang;
    }
  }, [lang, mounted]);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    localStorage.setItem("lang", l);
    document.cookie = `lang=${l}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const currencySymbol = currency === "TRY" ? "₺" : (lang === "ar" ? "ر.س" : "﷼");

  const formatPrice = useCallback((amount: number, showDecimals: boolean = true) => {
    const formatted = showDecimals ? amount.toFixed(2) : amount.toFixed(0);
    if (currency === "TRY") {
      return `₺${formatted}`;
    }
    if (currency === "SAR") {
      return lang === "ar" ? `ر.س ${formatted}` : `﷼${formatted}`;
    }
    return `${formatted} ${currency}`;
  }, [currency, lang]);

  const contextValue = useMemo(() => ({
    lang: mounted ? lang : "en",
    t: messages[mounted ? lang : "en"],
    setLang,
    mounted,
    currency,
    currencySymbol,
    formatPrice,
  }), [currency, currencySymbol, formatPrice, lang, mounted, setLang]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}

export function CurrencySymbol({ className = "", size = 14, style = {} }: { className?: string; size?: number; style?: CSSProperties }) {
  const { currency } = useLang();
  if (currency === "TRY") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle", ...style }}>
        <TurkishLira className={className} size={size} />
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle", ...style }}>
      <SaudiRiyal className={className} size={size} />
    </span>
  );
}

export function Price({
  amount,
  showDecimals = true,
  className = "",
  size = 14,
  style = {},
}: {
  amount: number;
  showDecimals?: boolean;
  className?: string;
  size?: number;
  style?: CSSProperties;
}) {
  const formatted = showDecimals ? amount.toFixed(2) : amount.toFixed(0);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexDirection: "row",
        gap: 3,
        ...style,
        direction: "ltr",
        unicodeBidi: "isolate",
      }}
      className={className}
    >
      <CurrencySymbol size={size} />
      <span>{formatted}</span>
    </span>
  );
}
