// Core Domain Constants, Color Codes & Pricing Utilities
// Fuel Delivery Management System (FDMS)

export const USERS = [];

export const FUEL_TYPES = [
  { code: "DSL", name: "Diesel", price: 92.4, color: "var(--amber)" },
  { code: "PTL", name: "Petrol", price: 104.8, color: "var(--blue)" },
  { code: "LPG", name: "LPG", price: 61.2, color: "var(--green)" },
  { code: "KRS", name: "Kerosene", price: 74.6, color: "var(--text-dim)" },
];

export const STATUS_FLOW = ["Pending", "Approved", "Dispatched", "InTransit", "Delivered"];

export const STATUS_COLOR = {
  Pending: "var(--amber)",
  "Pending Approval": "var(--amber)",
  Approved: "var(--blue)",
  Dispatched: "var(--amber)",
  InTransit: "var(--amber)",
  Delivered: "var(--green)",
  Cancelled: "var(--red)",
  Rejected: "var(--red)",
};

export const SEED_ORDERS = [];

export const DELIVERY_CHARGE = 250;
export const TAX_RATE = 0.18;

export const SEED_DRIVERS = [];

export function deriveCustomers(orders = []) {
  const byName = new Map();
  for (const o of orders) {
    if (!o || !o.customer) continue;
    if (!byName.has(o.customer)) {
      byName.set(o.customer, { name: o.customer, sites: new Set(), city: o.city || "Chennai", orders: 0, litres: 0 });
    }
    const c = byName.get(o.customer);
    if (o.site) c.sites.add(o.site);
    c.orders += 1;
    if (o.status !== "Cancelled" && o.status !== "Rejected") c.litres += (o.qty || o.quantity || 0);
  }
  return Array.from(byName.values())
    .map((c) => ({ ...c, sites: c.sites.size }))
    .sort((a, b) => b.litres - a.litres);
}

export function fuelOf(code) {
  return FUEL_TYPES.find((f) => f.code === (code || "DSL").toUpperCase()) || FUEL_TYPES[0];
}

export function computeTotal(fuelCode, qty = 0) {
  const fuel = fuelOf(fuelCode);
  const subtotal = fuel.price * qty;
  const tax = subtotal * TAX_RATE;
  return { subtotal, tax, total: subtotal + tax + DELIVERY_CHARGE, fuel };
}

export const SEED_DEPOT_TANKS = [];
export const SEED_FLEET_TELEMETRY = [];
