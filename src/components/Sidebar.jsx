import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, ClipboardList, Truck, Users, BarChart3, Settings as SettingsIcon, Fuel } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const LINKS = [
  { to: "/dashboard", key: "nav_dashboard", icon: LayoutDashboard },
  { to: "/orders", key: "nav_orders", icon: ClipboardList },
  { to: "/drivers", key: "nav_drivers", icon: Truck },
  { to: "/customers", key: "nav_customers", icon: Users },
  { to: "/reports", key: "nav_reports", icon: BarChart3 },
  { to: "/settings", key: "nav_settings", icon: SettingsIcon },
];

// NavLink from react-router already tracks the active route for
// us (via its `isActive`/className function), so no extra state
// or context is needed just to highlight the current page.
export default function Sidebar() {
  const { t } = useLanguage();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Fuel size={22} />
        <span>FDMS</span>
      </div>
      <nav className="sidebar-nav">
        {LINKS.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
          >
            <Icon size={17} />
            <span>{t(key)}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
