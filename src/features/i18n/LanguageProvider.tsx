"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppLanguage = "vi" | "en";
type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (vietnamese: string, english: string) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "vi",
  setLanguage: () => undefined,
  t: (vietnamese) => vietnamese,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("vi");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("little-story-world-language");
      if (saved === "en" || saved === "vi") setLanguageState(saved);
    } catch {
      // Keep Vietnamese as the accessible default when storage is unavailable.
    }
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem("little-story-world-language", next);
    } catch {
      // The selection remains active for the current session.
    }
  }, []);

  const t = useCallback((vietnamese: string, english: string) => (
    language === "en" ? english : vietnamese
  ), [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
