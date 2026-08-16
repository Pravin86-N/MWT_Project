import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { translate, DEFAULT_LANGUAGE } from "../i18n/translations";

/**
 * LanguageContext
 * -------------------------------------------------------------
 * Same shape as ThemeContext on purpose: a small piece of global,
 * cross-cutting UI state (the active language) read by components
 * scattered all over the tree (Navbar, Sidebar, every page). A
 * `t(key)` translator function is exposed through context instead
 * of importing the dictionary directly in every component, so
 * switching languages in Settings re-renders the whole app at once.
 */

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(
    () => localStorage.getItem("fdms-lang") || DEFAULT_LANGUAGE
  );

  useEffect(() => {
    localStorage.setItem("fdms-lang", language);
    document.documentElement.setAttribute("lang", language);
  }, [language]);

  const setLanguage = useCallback((lang) => setLanguageState(lang), []);

  // t() is recreated only when `language` changes, and is the one
  // function every page calls, so memoizing it avoids re-creating
  // a fresh closure identity on every unrelated render.
  const t = useCallback((key) => translate(language, key), [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
