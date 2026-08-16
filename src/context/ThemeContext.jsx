import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

/**
 * ThemeContext
 * -------------------------------------------------------------
 * PURPOSE OF useContext HERE:
 * The theme (dark/light) is needed by components that are not
 * directly related to each other in the tree — the login page,
 * the navbar, the dashboard, modals, etc. Instead of passing a
 * `theme` + `toggleTheme` prop down through every layer
 * ("prop drilling"), we put it in a Context and let any
 * component call `useTheme()` to read or change it directly.
 * This is the textbook use case for useContext: global,
 * cross-cutting UI state like theme, language, or auth.
 */
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // useState: holds the actual theme value, initialised lazily
  // from localStorage so a refresh doesn't flash the wrong theme.
  const [theme, setTheme] = useState(() => localStorage.getItem("fdms-theme") || "dark");

  // useEffect: whenever `theme` changes, sync it to the <html>
  // element (so CSS variables switch) and persist it to
  // localStorage (so it survives a page reload).
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("fdms-theme", theme);
  }, [theme]);

  // useCallback: toggleTheme is handed out to many consumers
  // (Navbar, Login page, etc). Wrapping it in useCallback gives
  // it a stable identity across renders, so components that
  // received it as a prop don't re-render just because the
  // provider re-rendered.
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  // useMemo: the object passed to Provider `value` is recreated
  // on every render by default, which would force every consumer
  // to re-render even when nothing changed. Memoizing it means
  // consumers only re-render when `theme` itself actually changes.
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
