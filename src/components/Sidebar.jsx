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
  ShieldCheck,
  DollarSign,
  UserCog,
  MapPin,
  Lock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { ROLES } from "../utils/permissions";

export default function Sidebar({ isCollapsed, toggleSidebar }) {
  const { t } = useLanguage();
  const { state } = useAuth();
  const user = state.user;
  const role = user?.role || "";

  const isCustomer = role === ROLES.CUSTOMER;
  const isDriver = role === ROLES.DRIVER;
  const isAdmin = role === ROLES.ADMIN;
  const isDepotManager = role === ROLES.DEPOT_MANAGER;
  const isSupport = role === ROLES.SUPPORT_EXECUTIVE;
  const isAuditor = role === ROLES.AUDITOR;

  // Role-differentiated navigation configurations
  let mainLinks = [];
  let secondaryLinks = [];
  let sectionTitle = "Operations Control";

  if (isCustomer) {
    sectionTitle = "Customer Portal";
    mainLinks = [
      { to: "/customer-portal", label: "My Fuel Portal", icon: Building2 },
      { to: "/fleet-map", label: "Delivery Tracking Map", icon: Navigation },
      { to: "/pricing", label: "Current Fuel Rates", icon: DollarSign },
    ];
    secondaryLinks = [
      { to: "/settings", key: "nav_settings", icon: SettingsIcon },
    ];
  } else if (isDriver) {
    sectionTitle = "Driver Console";
    mainLinks = [
      { to: "/driver-portal", label: "My Deliveries", icon: Truck },
      { to: "/fleet-map", label: "Fleet Radar", icon: Navigation },
    ];
    secondaryLinks = [
      { to: "/settings", key: "nav_settings", icon: SettingsIcon },
    ];
  } else if (isAdmin) {
    sectionTitle = "Platform Governance";
    mainLinks = [
      { to: "/dashboard", key: "nav_dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
      { to: "/users", label: "Users & Staff Roles", icon: UserCog },
      { to: "/applications", label: "Customer Approvals", icon: FileCheck },
      { to: "/pricing", label: "Fuel Pricing & Tariffs", icon: DollarSign },
      { to: "/orders", key: "nav_orders", label: "Orders Overview", icon: ClipboardList },
      { to: "/fleet-map", key: "nav_fleetMap", label: "Fleet Telemetry Map", icon: Navigation },
      { to: "/customers", key: "nav_customers", label: "Customer Directory", icon: Users },
      { to: "/reports", key: "nav_reports", label: "All Depots Analytics", icon: BarChart3 },
    ];
    secondaryLinks = [
      { to: "/audit-logs", label: "Audit Trail & Logs", icon: ShieldCheck },
      { to: "/customer-portal", label: "Customer View (Preview)", icon: Building2 },
      { to: "/settings", key: "nav_settings", icon: SettingsIcon },
    ];
  } else if (isDepotManager) {
    sectionTitle = `Depot Ops (${user?.depot || "Assigned"})`;
    mainLinks = [
      { to: "/dashboard", key: "nav_dashboard", label: "Depot Dashboard", icon: LayoutDashboard },
      { to: "/pending-requests", label: "Pending Approvals", icon: Clock },
      { to: "/orders", key: "nav_orders", label: "Depot Orders", icon: ClipboardList },
      { to: "/inventory", key: "nav_inventory", label: "Tanks & Refills", icon: Database },
      { to: "/drivers", key: "nav_drivers", label: "Drivers Fleet", icon: UserCheck },
      { to: "/vehicles", label: "Tanker Vehicles", icon: Truck },
      { to: "/fleet-map", key: "nav_fleetMap", label: "Depot Radar", icon: Navigation },
      { to: "/reports", key: "nav_reports", label: "Depot Reports", icon: BarChart3 },
    ];
    secondaryLinks = [
      { to: "/customers", key: "nav_customers", label: "Customer Directory", icon: Users },
      { to: "/pricing", label: "Fuel Rates (View)", icon: DollarSign },
      { to: "/settings", key: "nav_settings", icon: SettingsIcon },
    ];
  } else if (isAuditor) {
    sectionTitle = "Compliance & Audit";
    mainLinks = [
      { to: "/audit-logs", label: "Audit Trail & Logs", icon: ShieldCheck },
      { to: "/reports", key: "nav_reports", label: "Compliance Reports", icon: BarChart3 },
      { to: "/orders", key: "nav_orders", label: "Orders Audit Log", icon: ClipboardList },
      { to: "/inventory", key: "nav_inventory", label: "Inventory Audit", icon: Database },
      { to: "/fleet-map", key: "nav_fleetMap", label: "Fleet Map Audit", icon: Navigation },
      { to: "/pricing", label: "Tariff Rates", icon: DollarSign },
    ];
    secondaryLinks = [
      { to: "/settings", key: "nav_settings", icon: SettingsIcon },
    ];
  } else {
    // Support Executive or general staff
    sectionTitle = "Support Console";
    mainLinks = [
      { to: "/orders", key: "nav_orders", label: "Customer Orders", icon: ClipboardList },
      { to: "/customers", key: "nav_customers", label: "Customer Directory", icon: Users },
      { to: "/applications", label: "Registrations (View)", icon: FileCheck },
      { to: "/fleet-map", key: "nav_fleetMap", label: "Fleet Map", icon: Navigation },
      { to: "/pricing", label: "Fuel Rates", icon: DollarSign },
    ];
    secondaryLinks = [
      { to: "/settings", key: "nav_settings", icon: SettingsIcon },
    ];
  }

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
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Operations Navigation">
        {!isCollapsed && (
          <div
            style={{
              margin: "6px 10px 14px 10px",
              padding: "8px 10px",
              borderRadius: "8px",
              background: isAdmin
                ? "rgba(239, 68, 68, 0.12)"
                : isDepotManager
                ? "rgba(249, 115, 22, 0.12)"
                : "rgba(59, 130, 246, 0.12)",
              border: `1px solid ${
                isAdmin
                  ? "rgba(239, 68, 68, 0.25)"
                  : isDepotManager
                  ? "rgba(249, 115, 22, 0.25)"
                  : "rgba(59, 130, 246, 0.25)"
              }`,
              fontSize: "12.5px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <MapPin size={14} style={{ color: isAdmin ? "#ef4444" : isDepotManager ? "#f97316" : "#3b82f6", flexShrink: 0 }} />
            <span style={{ fontWeight: "700", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {isAdmin
                ? "HQ • All Depots Jurisdiction"
                : isDepotManager
                ? `${user?.depot || "DEP-CHN-01"} • Operations`
                : `${user?.role || "Staff"} Session`}
            </span>
          </div>
        )}
        <div className="sidebar-section-title">{sectionTitle}</div>
        {mainLinks.map(({ to, key, label, icon: Icon }) => {
          const itemText = label || t(key);
          return (
            <NavLink
              key={to}
              to={to}
              aria-label={itemText}
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
              aria-label={itemText}
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
              fontSize: "13px",
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
