import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  Navigation,
  Database,
  Truck,
  Users,
  UserCheck,
  BarChart3,
  Settings as SettingsIcon,
  Fuel,
  Building2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  FileCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function Sidebar({ isCollapsed, toggleSidebar }) {
  const { t } = useLanguage();
  const { state } = useAuth();
  const user = state.user;

  const isCustomer = user?.role === "Customer";
  const isDriver = user?.role === "Driver";

  const mainLinks = isCustomer
    ? [{ to: "/customer-portal", label: "My Fuel Portal", icon: Building2 }]
    : isDriver
    ? [
        { to: "/driver-portal", label: "My Deliveries", icon: Truck },
        { to: "/fleet-map", label: "Fleet Radar", icon: Navigation },
      ]
    : [
        { to: "/dashboard", key: "nav_dashboard", icon: LayoutDashboard },
        { to: "/pending-requests", label: "Pending Requests", icon: Clock },
        { to: "/applications", label: "Customer Approvals", icon: FileCheck },
        { to: "/orders", key: "nav_orders", icon: ClipboardList },
        { to: "/fleet-map", key: "nav_fleetMap", icon: Navigation },
        { to: "/inventory", key: "nav_inventory", icon: Database },
        { to: "/drivers", key: "nav_drivers", label: "Drivers", icon: UserCheck },
        { to: "/vehicles", label: "Fleet Vehicles", icon: Truck },
        { to: "/customers", key: "nav_customers", icon: Users },
        { to: "/reports", key: "nav_reports", icon: BarChart3 },
      ];

  const secondaryLinks = [
    ...(!isCustomer && !isDriver ? [{ to: "/customer-portal", label: "Customer View", icon: Building2 }] : []),
    { to: "/settings", key: "nav_settings", icon: SettingsIcon },
  ];

  const brandLink = isCustomer ? "/customer-portal" : isDriver ? "/driver-portal" : "/dashboard";

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <NavLink to={brandLink} className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Fuel size={22} />
          </div>
          <div className="sidebar-brand-text">
            <span className="brand-name">FDMS SAAS</span>
            <span className="brand-badge">LIVE FLEET TELEMETRY</span>
          </div>
        </NavLink>

        <button
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-title">Operations Control</div>
        {mainLinks.map(({ to, key, label, icon: Icon }) => {
          const itemText = label || t(key);
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
            >
              <div className="sidebar-link-icon">
                <Icon size={18} />
              </div>
              <span>{itemText}</span>
              {isCollapsed && <div className="sidebar-tooltip">{itemText}</div>}
            </NavLink>
          );
        })}

        <div className="sidebar-section-title" style={{ marginTop: "14px" }}>
          System & Settings
        </div>
        {secondaryLinks.map(({ to, key, label, icon: Icon }) => {
          const itemText = label || t(key);
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
            >
              <div className="sidebar-link-icon">
                <Icon size={18} />
              </div>
              <span>{itemText}</span>
              {isCollapsed && <div className="sidebar-tooltip">{itemText}</div>}
            </NavLink>
          );
        })}
      </nav>

      {!isCollapsed && (
        <div className="sidebar-footer">
          <div
            style={{
              padding: "12px 14px",
              background: "var(--grad-dark-panel)",
              borderRadius: "14px",
              border: "1px solid color-mix(in srgb, var(--orange) 30%, var(--line))",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "var(--grad-flame)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 0 12px var(--orange-glow)",
              }}
            >
              <Sparkles size={16} />
            </div>
            <div style={{ lineHeight: "1.3" }}>
              <strong style={{ display: "block", color: "var(--text)", fontWeight: "700" }}>
                Interactive Engine
              </strong>
              <span style={{ color: "var(--orange)", fontWeight: "700" }}>V2.5 Vibrant Active</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
