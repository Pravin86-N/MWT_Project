import React from "react";
import { Fuel, Zap, Flame, Gauge } from "lucide-react";
import { getFuelInfo } from "../utils/fuelColors";

/**
 * Standardized FuelNet 360 Fuel Identity Badge.
 * Combines color, small icon, and label for WCAG AA compliance.
 */
export default function FuelBadge({ fuelType, showIcon = true, size = "md", style = {} }) {
  const info = getFuelInfo(fuelType);

  const getIcon = () => {
    if (info.code === "EV") return <Zap size={size === "sm" ? 11 : 13} style={{ flexShrink: 0 }} />;
    if (info.code === "CNG") return <Gauge size={size === "sm" ? 11 : 13} style={{ flexShrink: 0 }} />;
    return <Fuel size={size === "sm" ? 11 : 13} style={{ flexShrink: 0 }} />;
  };

  const isSmall = size === "sm";

  return (
    <span
      className="fuel-identity-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSmall ? "4px" : "6px",
        padding: isSmall ? "2px 7px" : "4px 10px",
        borderRadius: "6px",
        fontSize: isSmall ? "12px" : "13px",
        fontWeight: "700",
        letterSpacing: "0.02em",
        color: info.hex,
        backgroundColor: info.bg,
        border: `1px solid ${info.border}`,
        boxShadow: `0 0 10px -2px ${info.glow}`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {showIcon && getIcon()}
      <span>{info.name}</span>
    </span>
  );
}
