import React from "react";
import { Fuel, Truck, Users, Inbox, PackageX, SearchX, AlertCircle } from "lucide-react";

/**
 * FuelNet 360 Professional Empty State Component.
 * Avoids blank screens and provides contextual guidance.
 */
export default function EmptyState({
  type = "default",
  title,
  message,
  actionLabel,
  onAction,
  style = {},
}) {
  const configs = {
    orders: {
      icon: PackageX,
      color: "var(--fuel-diesel)",
      defaultTitle: "No fuel orders available.",
      defaultMessage: "There are currently no active or historical fuel requests found in the system.",
    },
    vehicles: {
      icon: Truck,
      color: "var(--fuel-electric)",
      defaultTitle: "No active fleet vehicles.",
      defaultMessage: "No tankers or bowsers are registered or assigned in this depot jurisdiction.",
    },
    customers: {
      icon: Users,
      color: "var(--status-success)",
      defaultTitle: "No approved customers found.",
      defaultMessage: "No enterprise client records match your current criteria or pending verification.",
    },
    inventory: {
      icon: Fuel,
      color: "var(--fuel-diesel)",
      defaultTitle: "No fuel storage vaults found.",
      defaultMessage: "No underground tank telemetry records are currently configured.",
    },
    search: {
      icon: SearchX,
      color: "var(--text-secondary)",
      defaultTitle: "No matching records found.",
      defaultMessage: "Try adjusting your search terms, date ranges, or status filters.",
    },
    default: {
      icon: Inbox,
      color: "var(--text-secondary)",
      defaultTitle: "No data available.",
      defaultMessage: "Real-time records will appear here as activity occurs.",
    },
  };

  const current = configs[type] || configs.default;
  const IconComponent = current.icon;
  const displayTitle = title || current.defaultTitle;
  const displayMessage = message || current.defaultMessage;

  return (
    <div
      className="empty-state-panel"
      style={{
        padding: "50px 24px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--panel)",
        borderRadius: "12px",
        border: "1px dashed var(--line)",
        margin: "12px 0",
        ...style,
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "16px",
          background: "rgba(255, 255, 255, 0.04)",
          border: `1px solid ${current.color}33`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
          color: current.color,
          boxShadow: `0 8px 24px -6px ${current.color}22`,
        }}
      >
        <IconComponent size={30} />
      </div>

      <h3
        style={{
          margin: "0 0 8px 0",
          fontSize: "17px",
          fontWeight: "700",
          color: "var(--text-primary)",
        }}
      >
        {displayTitle}
      </h3>

      <p
        style={{
          margin: 0,
          maxWidth: "420px",
          fontSize: "14px",
          color: "var(--text-secondary)",
          lineHeight: "1.5",
        }}
      >
        {displayMessage}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary"
          style={{
            marginTop: "18px",
            background: "var(--fuel-diesel)",
            borderColor: "var(--fuel-diesel)",
            color: "#0F172A",
            fontWeight: "700",
            fontSize: "13px",
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
