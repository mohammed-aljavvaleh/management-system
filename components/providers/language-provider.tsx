"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";

type Language = "en" | "tr";
type Translations = typeof en;

const messages = { en, tr };

type LanguageContextType = {
  lang: Language;
  t: Translations;
  setLang: (lang: Language) => void;
  mounted: boolean;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  t: en,
  setLang: () => {},
  mounted: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("lang") as Language;
    if (saved === "en" || saved === "tr") setLangState(saved);
    setMounted(true);
  }, []);

  function setLang(l: Language) {
    setLangState(l);
    localStorage.setItem("lang", l);
  }

  return (
    <LanguageContext.Provider value={{ lang: mounted ? lang : "en", t: messages[mounted ? lang : "en"], setLang, mounted }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}