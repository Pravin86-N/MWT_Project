// Centralized Fuel Color System & Identity Utilities
// FuelNet 360 Design System

export const FUEL_COLORS = {
  DIESEL: {
    hex: "#F59E0B",
    cssVar: "var(--fuel-diesel)",
    name: "Diesel",
    code: "DSL",
    border: "rgba(245, 158, 11, 0.35)",
    bg: "rgba(245, 158, 11, 0.12)",
    glow: "rgba(245, 158, 11, 0.25)",
  },
  PETROL: {
    hex: "#EF4444",
    cssVar: "var(--fuel-petrol)",
    name: "Petrol",
    code: "PTL",
    border: "rgba(239, 68, 68, 0.35)",
    bg: "rgba(239, 68, 68, 0.12)",
    glow: "rgba(239, 68, 68, 0.25)",
  },
  CNG: {
    hex: "#22C55E",
    cssVar: "var(--fuel-cng)",
    name: "CNG",
    code: "CNG",
    border: "rgba(34, 197, 94, 0.35)",
    bg: "rgba(34, 197, 94, 0.12)",
    glow: "rgba(34, 197, 94, 0.25)",
  },
  ELECTRIC: {
    hex: "#3B82F6",
    cssVar: "var(--fuel-electric)",
    name: "Electric / EV",
    code: "EV",
    border: "rgba(59, 130, 246, 0.35)",
    bg: "rgba(59, 130, 246, 0.12)",
    glow: "rgba(59, 130, 246, 0.25)",
  },
};

/**
 * Normalizes any fuel string or code and returns the full FuelNet color definition.
 * @param {string} fuelTypeOrCode
 * @returns {typeof FUEL_COLORS.DIESEL}
 */
export function getFuelInfo(fuelTypeOrCode) {
  if (!fuelTypeOrCode) return FUEL_COLORS.DIESEL;
  const str = String(fuelTypeOrCode).trim().toUpperCase();

  if (str.includes("PETROL") || str === "PTL" || str.includes("GASOLINE")) {
    return FUEL_COLORS.PETROL;
  }
  if (str.includes("CNG") || str.includes("LPG") || str.includes("GAS")) {
    return FUEL_COLORS.CNG;
  }
  if (str.includes("ELEC") || str === "EV" || str.includes("BATTERY") || str.includes("HYBRID")) {
    return FUEL_COLORS.ELECTRIC;
  }
  // Default to Diesel (DSL, HSD, Kerosene, etc.)
  return FUEL_COLORS.DIESEL;
}

/**
 * Returns the hex code directly for charting libraries or inline styles.
 */
export function getFuelHex(fuelTypeOrCode) {
  return getFuelInfo(fuelTypeOrCode).hex;
}
