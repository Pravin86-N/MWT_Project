// Role Groups and RBAC Constants for FDMS (Fuel Delivery Management System)
// Matches enterprise fuel logistics hierarchy (Admin = Platform Governance, Depot Manager = Depot Operations)

const ROLES = {
  ADMIN: 'Admin',
  DEPOT_MANAGER: 'Depot Manager',
  CUSTOMER: 'Customer',
  DRIVER: 'Driver',
  SUPPORT_EXECUTIVE: 'Support Executive',
  AUDITOR: 'Auditor',
};

// Role Groups
const ADMIN_ONLY = [ROLES.ADMIN];
const MANAGER_ONLY = [ROLES.DEPOT_MANAGER];
const OPS_STAFF = [ROLES.ADMIN, ROLES.DEPOT_MANAGER];
const READ_STAFF = [ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR];
const AUDIT_STAFF = [ROLES.ADMIN, ROLES.AUDITOR];
const SUPPORT_STAFF = [ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE];
const ALL_STAFF = [ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR, ROLES.DRIVER];

/**
 * Higher-order middleware to authorize specific roles with standard 403 JSON
 * @param  {...string} allowedRoles 
 */
const authorize = (...allowedRoles) => {
  // Flatten if passed as arrays
  const flatRoles = allowedRoles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required',
      });
    }

    if (!flatRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied: requires role ${flatRoles.join(' or ')}`,
      });
    }

    next();
  };
};

module.exports = {
  ROLES,
  ADMIN_ONLY,
  MANAGER_ONLY,
  OPS_STAFF,
  READ_STAFF,
  AUDIT_STAFF,
  SUPPORT_STAFF,
  ALL_STAFF,
  authorize,
};
