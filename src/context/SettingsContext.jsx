import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const DEFAULT_PREFS = {
  notifyOrderUpdates: true,
  notifyLowStock: true,
  notifyDailySummary: false,
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    const saved = localStorage.getItem("fdms-prefs");
    return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
  });

  useEffect(() => {
    localStorage.setItem("fdms-prefs", JSON.stringify(prefs));
  }, [prefs]);

  const togglePref = useCallback((key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const value = useMemo(() => ({ prefs, togglePref }), [prefs, togglePref]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
