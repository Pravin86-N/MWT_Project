// Enterprise RBAC Permission Matrix & Helper for FDMS
// Defines granular capabilities and single source of truth for UI access control

export const ROLES = {
  ADMIN: "Admin",
  DEPOT_MANAGER: "Depot Manager",
  CUSTOMER: "Customer",
  DRIVER: "Driver",
  SUPPORT_EXECUTIVE: "Support Executive",
  AUDITOR: "Auditor",
};

/**
 * Standard Permission Matrix
 * Admin = Platform & Governance (Users, Pricing, Approvals, Audit, All Depots)
 * Depot Manager = Operational Logistics (Own Depot, Orders, Fleet, Inventory, Drivers, Dispatch)
 */
export const PERMISSIONS = {
  // User Management
  "users.manage": [ROLES.ADMIN],
  "users.view": [ROLES.ADMIN, ROLES.AUDITOR],

  // Customer Company Registrations & Approvals
  "applications.approve": [ROLES.ADMIN],
  "applications.reject": [ROLES.ADMIN],
  "applications.delete": [ROLES.ADMIN],
  "applications.view": [ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR],

  // Pricing
  "pricing.edit": [ROLES.ADMIN],
  "pricing.view": [ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR, ROLES.CUSTOMER],

  // Audit Logs & Activity History
  "audit.view": [ROLES.ADMIN, ROLES.AUDITOR],

  // Customers CRM
  "customers.delete": [ROLES.ADMIN],
  "customers.editStatus": [ROLES.ADMIN],
  "customers.view": [ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR],

  // Fleet Vehicles (Depot Manager manages; Admin VIEW only; Delete = Admin only)
  "vehicles.create": [ROLES.DEPOT_MANAGER],
  "vehicles.edit": [ROLES.DEPOT_MANAGER],
  "vehicles.status": [ROLES.DEPOT_MANAGER, ROLES.DRIVER],
  "vehicles.delete": [ROLES.ADMIN],
  "vehicles.view": [ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR, ROLES.DRIVER],

  // Drivers Fleet (Depot Manager manages; Admin VIEW only; Delete = Admin only)
  "drivers.create": [ROLES.DEPOT_MANAGER],
  "drivers.edit": [ROLES.DEPOT_MANAGER],
  "drivers.delete": [ROLES.ADMIN],
  "drivers.view": [ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR, ROLES.DRIVER],

  // Orders
  "orders.view": [ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR, ROLES.DRIVER, ROLES.CUSTOMER],
  "orders.approve": [ROLES.ADMIN, ROLES.DEPOT_MANAGER],
  "orders.reject": [ROLES.ADMIN, ROLES.DEPOT_MANAGER],
  "orders.assign": [ROLES.DEPOT_MANAGER], // Admin is VIEW only for dispatch/assignment
  "orders.create": [ROLES.CUSTOMER, ROLES.DEPOT_MANAGER, ROLES.ADMIN],
  "orders.edit": [ROLES.DEPOT_MANAGER, ROLES.ADMIN],
  "orders.delete": [ROLES.ADMIN],

  // Inventory & Depot Tanks (Depot Manager manages; Admin VIEW only)
  "inventory.refill": [ROLES.DEPOT_MANAGER],
  "inventory.edit": [ROLES.DEPOT_MANAGER],
  "inventory.view": [ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR],

  // Fleet Map
  "fleetMap.view": [ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.DRIVER, ROLES.CUSTOMER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR],
  "fleetMap.allDepots": [ROLES.ADMIN, ROLES.AUDITOR],

  // Reports
  "reports.view": [ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.AUDITOR, ROLES.SUPPORT_EXECUTIVE],
  "reports.allDepots": [ROLES.ADMIN, ROLES.AUDITOR],

  // Invoices
  "invoices.view": [ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR, ROLES.CUSTOMER],
};

/**
 * Check if a given user role has permission to perform an action
 * @param {string} role - Current user's role
 * @param {string} action - Action key from PERMISSIONS map
 * @returns {boolean}
 */
export const can = (role, action) => {
  if (!role || !action) return false;
  const allowed = PERMISSIONS[action];
  if (!allowed) return false;
  return allowed.includes(role);
};

/**
 * Check if a given role has VIEW-ONLY access to a domain where actions exist
 * @param {string} role 
 * @param {string} domain - 'vehicles' | 'drivers' | 'applications' | 'inventory' | 'pricing' | 'dispatch'
 * @returns {boolean}
 */
export const isViewOnly = (role, domain) => {
  if (!role) return true;
  switch (domain) {
    case "vehicles":
    case "drivers":
      // Admin, Support, Auditor view only; Depot Manager has full write
      return role === ROLES.ADMIN || role === ROLES.SUPPORT_EXECUTIVE || role === ROLES.AUDITOR;
    case "applications":
      // Depot Manager, Support, Auditor view only; Admin has full approve/reject
      return role === ROLES.DEPOT_MANAGER || role === ROLES.SUPPORT_EXECUTIVE || role === ROLES.AUDITOR;
    case "pricing":
      // Depot Manager, Customer, Support, Auditor view only; Admin edits
      return role !== ROLES.ADMIN;
    case "inventory":
    case "dispatch":
      // Admin, Support, Auditor view only; Depot Manager runs refills & dispatch
      return role === ROLES.ADMIN || role === ROLES.SUPPORT_EXECUTIVE || role === ROLES.AUDITOR;
    case "customers":
      // Only Admin can delete/change status; Depot Manager views
      return role !== ROLES.ADMIN;
    default:
      return false;
  }
};

/**
 * Get standard landing route for a given user role
 * @param {string} role 
 * @returns {string} Path
 */
export const getRoleHomeRoute = (role) => {
  const normalized = (role || "").toLowerCase();
  if (normalized === "customer") return "/customer-portal";
  if (normalized === "driver") return "/driver-portal";
  return "/dashboard";
};
