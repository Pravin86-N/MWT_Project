// Recently Accessed Items Tracking Service
// Tracks: Recent Orders, Recent Customers, Recent Vehicles, Recent Reports

const STORAGE_KEY = "fdms_recently_accessed_v1";

const DEFAULT_DATA = {
  orders: [],
  customers: [],
  vehicles: [],
  reports: [],
};

export function getAllRecentAccess() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

export function recordRecentAccess(category, item) {
  if (!category || !item || !item.id) return;
  const validCategories = ["orders", "customers", "vehicles", "reports"];
  if (!validCategories.includes(category)) return;

  try {
    const all = getAllRecentAccess();
    const existingList = all[category] || [];

    // Remove duplicates if already recorded
    const filtered = existingList.filter((x) => x.id !== item.id);

    // Prepend latest entry with timestamp
    const updatedCategoryList = [
      {
        id: item.id,
        title: item.title || item.id,
        subtitle: item.subtitle || "",
        link: item.link || (category === "orders" ? `/orders/${item.id}` : `/${category}`),
        timestamp: Date.now(),
        meta: item.meta || {},
      },
      ...filtered,
    ].slice(0, 10); // Keep latest 10 items per category

    all[category] = updatedCategoryList;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    // Notify active listeners across windows/tabs
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fdms-recent-access-updated", {
          detail: { category, item },
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
