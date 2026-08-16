import React from "react";
import { Link } from "react-router-dom";
import { Truck, Sun, Moon, LogOut, Clock, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

export default function Navbar({ now }) {
  const { state, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <header className="topbar">
      <div className="brand">
        <Truck size={22} />
        <div>
          <div className="brand-title">{t("appName")}</div>
          <div className="brand-sub">{t("appSub")}</div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="clock">
          <Clock size={14} />
          {now.toLocaleTimeString("en-IN", { hour12: false })}
        </div>

        {/* Theme toggle — the canonical useContext example: flipping
            this button changes the whole app's look instantly. */}
        <button className="icon-btn" onClick={toggleTheme} title={t("toggleTheme")}>
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <Link className="icon-btn" to="/settings" title={t("nav_settings")}>
          <SettingsIcon size={18} />
        </Link>

        <div className="user">
          <div className="user-name">{state.user?.name}</div>
          <div className="user-role">{state.user?.role}</div>
        </div>

        <button className="btn-ghost" onClick={logout}>
          <LogOut size={14} /> {t("logout")}
        </button>
      </div>
    </header>
  );
}
