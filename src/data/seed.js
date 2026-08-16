// Mock data standing in for tbl_User / tbl_Order / tbl_FuelPricing
// from the Fuel Delivery Management System data dictionary.

export const USERS = [
  { email: "priya@fdms.com", password: "depot123", name: "Priya Raman", role: "Depot Manager" },
  { email: "admin@fdms.com", password: "admin123", name: "Arun Ventures", role: "Admin" },
];

export const FUEL_TYPES = [
  { code: "DSL", name: "Diesel", price: 92.4, color: "var(--amber)" },
  { code: "PTL", name: "Petrol", price: 104.8, color: "var(--blue)" },
  { code: "LPG", name: "LPG", price: 61.2, color: "var(--green)" },
  { code: "KRS", name: "Kerosene", price: 74.6, color: "var(--text-dim)" },
];

export const STATUS_FLOW = ["Pending", "Approved", "Dispatched", "InTransit", "Delivered"];

export const STATUS_COLOR = {
  Pending: "var(--text-dim)",
  Approved: "var(--blue)",
  Dispatched: "var(--amber)",
  InTransit: "var(--amber)",
  Delivered: "var(--green)",
  Cancelled: "var(--red)",
};

export const SEED_ORDERS = [
  { id: 1, orderNumber: "FD-260801-001", customer: "Chennai Steel Works", site: "Factory", fuelCode: "DSL", qty: 500, driver: "R. Rangarajan", vehicle: "TN-01-AB-1234", city: "Chennai", status: "Delivered", slot: "06:00-08:00" },
  { id: 2, orderNumber: "FD-260802-014", customer: "Om Sri Hospital", site: "Hospital", fuelCode: "DSL", qty: 200, driver: "V. Vasanth", vehicle: "TN-07-CD-4321", city: "Madurai", status: "InTransit", slot: "10:00-12:00" },
  { id: 3, orderNumber: "FD-260803-027", customer: "Anand Apartments", site: "Apartment Generator", fuelCode: "DSL", qty: 150, driver: "K. Elango", vehicle: "TN-09-EF-5678", city: "Coimbatore", status: "Dispatched", slot: "14:00-16:00" },
  { id: 4, orderNumber: "FD-260803-031", customer: "Suresh Transports", site: "Warehouse", fuelCode: "PTL", qty: 320, driver: "M. Saravanan", vehicle: "TN-11-GH-9012", city: "Trichy", status: "Approved", slot: "08:00-10:00" },
  { id: 5, orderNumber: "FD-260804-002", customer: "Green Valley Farms", site: "Farm", fuelCode: "KRS", qty: 90, driver: "R. Rangarajan", vehicle: "TN-01-AB-1234", city: "Thanjavur", status: "Pending", slot: "12:00-14:00" },
  { id: 6, orderNumber: "FD-260804-009", customer: "Sunrise Construction", site: "Construction Site", fuelCode: "DSL", qty: 650, driver: "V. Vasanth", vehicle: "TN-07-CD-4321", city: "Chennai", status: "Pending", slot: "06:00-08:00" },
  { id: 7, orderNumber: "FD-260804-011", customer: "Kavin LPG Retail", site: "Warehouse", fuelCode: "LPG", qty: 210, driver: "K. Elango", vehicle: "TN-09-EF-5678", city: "Salem", status: "Cancelled", slot: "16:00-18:00" },
  { id: 8, orderNumber: "FD-260805-004", customer: "Nila Textiles", site: "Factory", fuelCode: "PTL", qty: 180, driver: "M. Saravanan", vehicle: "TN-11-GH-9012", city: "Erode", status: "Delivered", slot: "08:00-10:00" },
];

export const DELIVERY_CHARGE = 250;
export const TAX_RATE = 0.18;

// Mock data standing in for tbl_Driver and tbl_Vehicle.
export const SEED_DRIVERS = [
  { id: 1, name: "R. Rangarajan", phone: "+91 98400 11223", vehicle: "TN-01-AB-1234", onDuty: true, deliveries: 142 },
  { id: 2, name: "V. Vasanth", phone: "+91 98410 22334", vehicle: "TN-07-CD-4321", onDuty: true, deliveries: 98 },
  { id: 3, name: "K. Elango", phone: "+91 98420 33445", vehicle: "TN-09-EF-5678", onDuty: false, deliveries: 76 },
  { id: 4, name: "M. Saravanan", phone: "+91 98430 44556", vehicle: "TN-11-GH-9012", onDuty: true, deliveries: 61 },
];

// Derived from SEED_ORDERS so customer stats stay in sync with the
// mock manifest; a real backend would expose a dedicated endpoint.
export function deriveCustomers(orders) {
  const byName = new Map();
  for (const o of orders) {
    if (!byName.has(o.customer)) {
      byName.set(o.customer, { name: o.customer, sites: new Set(), city: o.city, orders: 0, litres: 0 });
    }
    const c = byName.get(o.customer);
    c.sites.add(o.site);
    c.orders += 1;
    if (o.status !== "Cancelled") c.litres += o.qty;
  }
  return Array.from(byName.values())
    .map((c) => ({ ...c, sites: c.sites.size }))
    .sort((a, b) => b.litres - a.litres);
}

export function fuelOf(code) {
  return FUEL_TYPES.find((f) => f.code === code);
}

export function computeTotal(fuelCode, qty) {
  const fuel = fuelOf(fuelCode);
  const subtotal = fuel.price * qty;
  const tax = subtotal * TAX_RATE;
  return { subtotal, tax, total: subtotal + tax + DELIVERY_CHARGE, fuel };
}
