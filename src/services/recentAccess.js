// Recently Accessed Items Tracking Service
// Tracks: Recently Viewed Orders, Customers, Vehicles, Reports
// Storage schema: userId, resourceType, resourceId, resourceName, accessedAt

const STORAGE_KEY = "fdms_recently_accessed_v2";

const DEFAULT_DATA = {
  orders: [],
  customers: [],
  vehicles: [],
  reports: [],
};

export function getAllRecentAccess() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("fdms_recently_accessed_v1");
    if (!raw) return { ...DEFAULT_DATA };
    const parsed = JSON.parse(raw);
    return {
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
    };
  } catch (e) {
    console.warn("[RecentlyAccessed] Failed to read recent access cache:", e.message);
    return { ...DEFAULT_DATA };
  }
}

export function getRecentAccess(category) {
  const all = getAllRecentAccess();
  return all[category] || [];
}

/**
 * Record a viewed resource adhering to the FuelNet schema:
 * { userId, resourceType, resourceId, resourceName, accessedAt }
 */
export function recordRecentAccess(category, item) {
  if (!category || !item) return;
  const validCategories = ["orders", "customers", "vehicles", "reports"];
  if (!validCategories.includes(category)) return;

  const id = item.id || item.resourceId;
  if (!id) return;

  try {
    const all = getAllRecentAccess();
    const existingList = all[category] || [];

    // Remove duplicates
    const filtered = existingList.filter((x) => (x.id || x.resourceId) !== id);

    const now = Date.now();
    const newEntry = {
      id,
      resourceId: id,
      resourceType: item.resourceType || category,
      resourceName: item.resourceName || item.title || item.name || id,
      title: item.resourceName || item.title || item.name || id,
      subtitle: item.subtitle || "",
      userId: item.userId || "current_user",
      accessedAt: item.accessedAt || now,
      timestamp: item.timestamp || now,
      link: item.link || (category === "orders" ? `/orders/${id}` : `/${category}`),
      meta: item.meta || {},
    };

    all[category] = [newEntry, ...filtered].slice(0, 50); // Store up to 50 for View All pagination
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fdms-recent-access-updated", {
          detail: { category, item: newEntry },
        })
      );
    }
  } catch (err) {
    console.warn("[RecentlyAccessed] Error recording item:", err.message);
  }
}

export function clearRecentAccess(category = null) {
  try {
    if (category) {
      const all = getAllRecentAccess();
      all[category] = [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fdms-recent-access-updated", { detail: { cleared: true } }));
    }
  } catch (err) {
    console.warn("[RecentlyAccessed] Error clearing items:", err.message);
  }
}
