// Mock data standing in for tbl_User / tbl_Order / tbl_FuelPricing
// from the Fuel Delivery Management System data dictionary.

export const USERS = [
  { email: "pravin@123", password: "pravin123", name: "Pravin Raman", role: "Depot Manager" },
  { email: "admin@fdms.com", password: "admin123", name: "Arun Ventures", role: "Admin" },
  { email: "customer@fdms.com", password: "customer123", name: "Chennai Steel Works", role: "Customer", site: "Factory Site #1", city: "Chennai", creditLimit: 500000, creditUsed: 146200 },
  { email: "hospital@fdms.com", password: "hospital123", name: "Om Sri Hospital", role: "Customer", site: "Hospital Generator Vault", city: "Madurai", creditLimit: 300000, creditUsed: 52400 },
];

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

// Depot Underground Storage Tank Inventory Telemetry
export const SEED_DEPOT_TANKS = [
  { id: "tank-dsl", fuelCode: "DSL", name: "Diesel Main Vault #1", capacity: 50000, current: 38400, threshold: 10000, temp: 24.2, pressure: 1.02, lastRefill: "2026-08-16" },
  { id: "tank-ptl", fuelCode: "PTL", name: "Super Petrol Vault #2", capacity: 40000, current: 29150, threshold: 8000, temp: 22.8, pressure: 1.01, lastRefill: "2026-08-17" },
  { id: "tank-lpg", fuelCode: "LPG", name: "LPG High-Pressure Sphere #3", capacity: 25000, current: 18900, threshold: 5000, temp: 18.5, pressure: 4.85, lastRefill: "2026-08-14" },
  { id: "tank-krs", fuelCode: "KRS", name: "Kerosene Auxiliary Vault #4", capacity: 15000, current: 4200, threshold: 3000, temp: 25.1, pressure: 0.99, lastRefill: "2026-08-10" },
];

// Live GPS Fleet Telemetry & Active Tankers
export const SEED_FLEET_TELEMETRY = [
  {
    id: "v-1",
    vehicle: "TN-01-AB-1234",
    driver: "R. Rangarajan",
    phone: "+91 98400 11223",
    status: "Delivering",
    fuelCargo: "DSL",
    cargoL: 3000,
    speed: 54,
    fuelLevel: 82,
    tirePressure: 108,
    engineTemp: 87,
    x: 42,
    y: 35,
    dest: "Chennai Steel Works",
    lat: 13.0827,
    lng: 80.2707,
    eta: "14 mins",
  },
  {
    id: "v-2",
    vehicle: "TN-07-CD-4321",
    driver: "V. Vasanth",
    phone: "+91 98410 22334",
    status: "InTransit",
    fuelCargo: "DSL",
    cargoL: 1800,
    speed: 68,
    fuelLevel: 64,
    tirePressure: 112,
    engineTemp: 89,
    x: 65,
    y: 58,
    dest: "Om Sri Hospital (Madurai)",
    lat: 9.9252,
    lng: 78.1198,
    eta: "28 mins",
  },
  {
    id: "v-3",
    vehicle: "TN-09-EF-5678",
    driver: "K. Elango",
    phone: "+91 98420 33445",
    status: "Idle",
    fuelCargo: "DSL",
    cargoL: 0,
    speed: 0,
    fuelLevel: 95,
    tirePressure: 110,
    engineTemp: 45,
    x: 25,
    y: 72,
    dest: "Coimbatore Depot Base",
    lat: 11.0168,
    lng: 76.9558,
    eta: "Stationary",
  },
  {
    id: "v-4",
    vehicle: "TN-11-GH-9012",
    driver: "M. Saravanan",
    phone: "+91 98430 44556",
    status: "Dispatched",
    fuelCargo: "PTL",
    cargoL: 2200,
    speed: 61,
    fuelLevel: 78,
    tirePressure: 109,
    engineTemp: 86,
    x: 78,
    y: 28,
    dest: "Suresh Transports (Trichy)",
    lat: 10.7905,
    lng: 78.7047,
    eta: "45 mins",
  },
];

