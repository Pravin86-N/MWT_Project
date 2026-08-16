import React, { useState, useEffect, useRef } from "react";
import { Sun, Moon, Check, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useSettings } from "../context/SettingsContext";
import { useOrders } from "../context/OrdersContext";
import { LANGUAGES } from "../i18n/translations";

export default function Settings() {
  const { state } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { prefs, togglePref } = useSettings();
  const { resetToSeed } = useOrders();

  const [savedFlash, setSavedFlash] = useState(false);
  // useRef: holds the pending timeout id across renders so a rapid
  // sequence of toggles doesn't leave several timers racing each
  // other — a value that survives renders but shouldn't trigger one.
  const flashTimer = useRef(null);

  const flashSaved = () => {
    setSavedFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1800);
  };

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const onToggleTheme = () => {
    toggleTheme();
    flashSaved();
  };
  const onChangeLanguage = (e) => {
    setLanguage(e.target.value);
    flashSaved();
  };
  const onTogglePref = (key) => {
    togglePref(key);
    flashSaved();
  };

  const clearLocalData = () => {
    if (!window.confirm(t("clearLocalDataDesc"))) return;
    localStorage.removeItem("fdms-orders");
    localStorage.removeItem("fdms-drivers");
    localStorage.removeItem("fdms-prefs");
    resetToSeed();
    flashSaved();
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t("settingsTitle")}</h1>
          <p className="page-sub">{t("settingsSubtitle")}</p>
        </div>
        {savedFlash && (
          <div className="save-flash">
            <Check size={14} /> {t("savedChanges")}
          </div>
        )}
      </div>

      <section className="panel settings-panel">
        <h3>{t("profile")}</h3>
        <dl className="detail-list">
          <div><dt>{t("name")}</dt><dd>{state.user?.name}</dd></div>
          <div><dt>{t("email")}</dt><dd>{state.user?.email}</dd></div>
          <div><dt>{t("role")}</dt><dd>{state.user?.role}</dd></div>
        </dl>
      </section>

      <section className="panel settings-panel">
        <h3>{t("appearance")}</h3>
        <div className="settings-row">
          <span>{t("theme")}</span>
          <button className="btn-ghost" onClick={onToggleTheme}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "dark" ? t("light") : t("dark")}
          </button>
        </div>
        <div className="settings-row">
          <span>{t("language")}</span>
          <select value={language} onChange={onChangeLanguage}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="panel settings-panel">
        <h3>{t("notifications")}</h3>
        {[
          { key: "notifyOrderUpdates", label: t("notifyOrderUpdates") },
          { key: "notifyLowStock", label: t("notifyLowStock") },
          { key: "notifyDailySummary", label: t("notifyDailySummary") },
        ].map((row) => (
          <label className="settings-row toggle-row" key={row.key}>
            <span>{row.label}</span>
            <input type="checkbox" checked={prefs[row.key]} onChange={() => onTogglePref(row.key)} />
          </label>
        ))}
      </section>

      <section className="panel settings-panel danger">
        <h3>{t("dangerZone")}</h3>
        <div className="settings-row">
          <div>
            <div>{t("clearLocalData")}</div>
            <div className="cell-dim">{t("clearLocalDataDesc")}</div>
          </div>
          <button className="btn-ghost danger" onClick={clearLocalData}>
            <Trash2 size={14} /> {t("clearData")}
          </button>
        </div>
      </section>
    </div>
  );
}
