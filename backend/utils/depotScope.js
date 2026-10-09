// Depot Scoping & Registry for FDMS
// Standard Depots matching smart-dispatch in orderController

const DEPOTS = [
  { code: 'DEP-CHN-01', name: 'Chennai Central Fuel Terminal', city: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { code: 'DEP-SLM-02', name: 'Salem Fleet Regional Hub', city: 'Salem', lat: 11.6643, lng: 78.1460 },
  { code: 'DEP-MDU-03', name: 'Madurai Southern Logistics Depot', city: 'Madurai', lat: 9.9252, lng: 78.1198 },
  { code: 'DEP-TRY-04', name: 'Trichy Fleet Central Terminal', city: 'Trichy', lat: 10.7905, lng: 78.7047 },
  { code: 'DEP-CBE-05', name: 'Coimbatore Western Industrial Hub', city: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
];

/**
 * Reusable helper to scope database queries to depot based on role
 * Admin: sees all depots; can filter optionally via req.query.depot
 * Depot Manager: strictly scoped to req.user.depot
 * Other roles: optional filter via req.query.depot
 * 
 * @param {object} req - Express request object (contains req.user & req.query)
 * @param {object} baseFilter - Base MongoDB query filter
 * @returns {object} Scoped MongoDB query object
 */
const scopeToDepot = (req, baseFilter = {}) => {
  const query = { ...baseFilter };

  if (!req || !req.user) {
    return query;
  }

  const role = req.user.role;

  if (role === 'Depot Manager') {
    // Depot Manager is strictly bound to their assigned depot
    const userDepot = req.user.depot || getDepotForCity(req.user.city || 'Chennai');
    query.depot = userDepot;
    return query;
  }

  // Admin and Auditor / Support Executive can see all depots or filter by specific depot code
  if (req.query && req.query.depot && req.query.depot !== 'All') {
    query.depot = req.query.depot;
  }

  return query;
};

/**
 * Map city name to standard depot code
 * @param {string} city 
 * @returns {string} Depot code (e.g. DEP-CHN-01)
 */
const getDepotForCity = (city = '') => {
  const c = String(city).trim().toLowerCase();
  if (c.includes('salem')) return 'DEP-SLM-02';
  if (c.includes('madurai')) return 'DEP-MDU-03';
  if (c.includes('trichy') || c.includes('tiruchirappalli')) return 'DEP-TRY-04';
  if (c.includes('coimbatore') || c.includes('kovai')) return 'DEP-CBE-05';
  return 'DEP-CHN-01'; // Default Chennai
};

module.exports = {
  DEPOTS,
  scopeToDepot,
  getDepotForCity,
};
