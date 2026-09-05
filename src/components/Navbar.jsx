import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sun,
  Moon,
  LogOut,
  Clock,
  Settings as SettingsIcon,
  Bell,
  Zap,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  Truck,
  ShieldAlert,
  Fuel,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useSimulation } from "../context/SimulationContext";
import { useNotifications } from "../context/NotificationContext";

export default function Navbar({ now }) {
  const { state, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const { isSimulating, toggleSimulation } = useSimulation();
  const { markAsRead, markAllAsRead, getUnreadCount, getNotificationsForRole } = useNotifications();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const user = state.user;
  const userRole = user?.role === "Customer" ? "Customer" : "Manager";
  const unreadCount = getUnreadCount(userRole);
  const roleNotifications = getNotificationsForRole(userRole);

  const filteredNotifications = useMemo(() => {
    if (activeCategory === "All") return roleNotifications;
    if (activeCategory === "Requests") return roleNotifications.filter((n) => n.category === "request");
    if (activeCategory === "Dispatch") return roleNotifications.filter((n) => n.category === "dispatch" || n.category === "delivery");
    if (activeCategory === "Alerts") return roleNotifications.filter((n) => n.category === "inventory" || n.category === "sos" || n.type === "warning" || n.type === "danger");
    return roleNotifications;
  }, [roleNotifications, activeCategory]);

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "FD";

  return (
    <header className="topbar">
      {/* Global Interactive Search Bar */}
      <div className="topbar-left">
        <div className="search-bar">
          <Search size={18} style={{ color: "var(--orange)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search orders, telemetry, drivers, fleet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="kbd-badge">Ctrl+K</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Live Simulation Engine Toggle Button */}
        <button
          className={`sim-toggle-btn ${isSimulating ? "sim-active" : ""}`}
          onClick={toggleSimulation}
          title="Toggle live dispatch simulation engine"
        >
          <Zap size={16} className={isSimulating ? "zap-pulse" : ""} />
          <span>{isSimulating ? "SIMULATING LIVE DISPATCH" : "START LIVE SIM"}</span>
        </button>

        {/* Live Clock & Telemetry Status Indicator */}
        <div className="clock-indicator" title="Live Telemetry Clock">
          <span className="live-dot-pulse" title="System Operational & Live"></span>
          <Clock size={15} style={{ color: "var(--orange)" }} />
          <span>{now.toLocaleTimeString("en-IN", { hour12: false })}</span>
        </div>

        {/* Notification Bell & Dropdown */}
        <div className="notif-wrapper">
          <button
            className="icon-btn"
            onClick={() => {
              setShowNotifMenu((prev) => !prev);
            }}
            title="Notification & Activity Feed"
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>

          {showNotifMenu && (
            <div className="notif-dropdown" style={{ width: "380px" }}>
              <div className="notif-header">
                <div>
                  <h4 style={{ fontWeight: "700", margin: 0 }}>Notification Center</h4>
                  <small style={{ color: "var(--orange)", fontSize: "10px", fontWeight: "700" }}>
                    {userRole === "Customer" ? "CUSTOMER REAL-TIME FEED" : "DEPOT OPERATIONS STREAM"}
                  </small>
                </div>
                {unreadCount > 0 && (
                  <button className="text-btn-sm" onClick={() => markAllAsRead(userRole)}>
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification Category Tabs */}
              <div style={{ display: "flex", gap: "6px", padding: "8px 12px", borderBottom: "1px solid var(--line)", background: "var(--panel-alt)" }}>
                {["All", "Requests", "Dispatch", "Alerts"].map((cat) => (
                  <button
                    key={cat}
                    className={`btn-ghost btn-sm ${activeCategory === cat ? "active" : ""}`}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      fontSize: "11px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontWeight: activeCategory === cat ? "700" : "500",
                      background: activeCategory === cat ? "var(--orange)" : "transparent",
                      color: activeCategory === cat ? "#FFF" : "var(--text-dim)",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="notif-list" style={{ maxHeight: "320px", overflowY: "auto" }}>
                {filteredNotifications.length === 0 ? (
                  <div className="notif-empty" style={{ padding: "20px", textAlign: "center", color: "var(--text-dim)", fontSize: "13px" }}>
                    No notifications in this category.
                  </div>
                ) : (
                  filteredNotifications.map((n) => {
                    const getIcon = () => {
                      if (n.category === "sos" || n.type === "danger") return <ShieldAlert size={18} style={{ color: "var(--red)", flexShrink: 0 }} />;
                      if (n.category === "inventory" || n.type === "warning") return <AlertTriangle size={18} style={{ color: "var(--amber)", flexShrink: 0 }} />;
                      if (n.category === "dispatch" || n.category === "delivery" || n.type === "success") return <CheckCircle2 size={18} style={{ color: "var(--green-neon)", flexShrink: 0 }} />;
                      return <Info size={18} style={{ color: "var(--blue)", flexShrink: 0 }} />;
                    };

                    const timeStr = n.timestamp
                      ? new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Just now";

                    return (
                      <div
                        key={n.id}
                        className={`notif-item ${!n.read ? "unread" : ""}`}
                        onClick={() => markAsRead(n.id)}
                        style={{
                          display: "flex",
                          gap: "10px",
                          padding: "12px",
                          borderBottom: "1px solid var(--line)",
                          cursor: "pointer",
                          background: !n.read ? "rgba(255, 94, 0, 0.05)" : "transparent",
                        }}
                      >
                        {getIcon()}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong style={{ fontSize: "13px", color: "var(--text)" }}>{n.title}</strong>
                            <small style={{ fontSize: "10px", color: "var(--text-dim)" }}>{timeStr}</small>
                          </div>
                          <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-dim)", lineHeight: "1.3" }}>
                            {n.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Switcher Toggle */}
        <button
          className="icon-btn"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <Sun size={20} style={{ color: "var(--amber)" }} /> : <Moon size={20} style={{ color: "var(--blue)" }} />}
        </button>

        {/* Quick Settings Link */}
        <Link className="icon-btn" to="/settings" title={t("nav_settings")}>
          <SettingsIcon size={20} />
        </Link>

        {/* User Profile Badge */}
        <div className="user-profile-badge">
          <div className="user-avatar">
            {userInitials}
            <span className="user-online-dot"></span>
          </div>
          <div className="user-details">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role}</span>
          </div>
        </div>

        {/* Logout Button */}
        <button className="btn-ghost danger" onClick={logout} title={t("logout")}>
          <LogOut size={15} />
          <span>{t("logout")}</span>
        </button>
      </div>
    </header>
  );
}
