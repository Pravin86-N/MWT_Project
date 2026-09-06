import axios from "axios";

// Base API URL configuration
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create configured Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request Interceptor: Automatically attach JWT token to headers if available
api.interceptors.request.use(
  (config) => {
    // Check for direct token or token stored inside user object
    const token =
      localStorage.getItem("fdms-token") ||
      (() => {
        try {
          const userStr = localStorage.getItem("fdms-user");
          return userStr ? JSON.parse(userStr)?.token : null;
        } catch {
          return null;
        }
      })();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle response errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If token is invalid or expired, handle session cleanup if 401
    if (error.response && error.response.status === 401) {
      const isAuthRoute =
        error.config?.url?.includes("/auth/login") ||
        error.config?.url?.includes("/auth/register");
      if (!isAuthRoute) {
        console.warn("[API] Authentication expired or invalid token");
      }
    }
    return Promise.reject(error);
  }
);

/* ==========================================================================
   1. AUTHENTICATION SERVICES
   ========================================================================== */
export const authApi = {
  // Login user and return JWT token
  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const data = response.data;
    if (data.token) {
      localStorage.setItem("fdms-token", data.token);
    }
    return data;
  },

  // Register new user
  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    const data = response.data;
    if (data.token) {
      localStorage.setItem("fdms-token", data.token);
    }
    return data;
  },

  // Get current logged-in user profile
  getMe: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  // Get all users (Admin / Depot Manager)
  getAllUsers: async () => {
    const response = await api.get("/auth/users");
    return response.data;
  },

  // Logout helper
  logout: () => {
    localStorage.removeItem("fdms-token");
    localStorage.removeItem("fdms-user");
  },
};

/* ==========================================================================
   2. CUSTOMER REGISTRATION SERVICES
   ========================================================================== */
export const registrationApi = {
  // Fetch all registrations (supports status & search query params)
  getRegistrations: async (params = {}) => {
    const response = await api.get("/registrations", { params });
    return response.data;
  },

  // Get registration details by ID or regId
  getRegistrationById: async (id) => {
    const response = await api.get(`/registrations/${id}`);
    return response.data;
  },

  // Submit customer registration with documents (supports FormData for Multer)
  createRegistration: async (formData) => {
    const headers =
      formData instanceof FormData
        ? { "Content-Type": "multipart/form-data" }
        : { "Content-Type": "application/json" };
    const response = await api.post("/registrations", formData, { headers });
    return response.data;
  },

  // Approve or reject customer registration
  updateStatus: async (id, status, reviewNotes = "") => {
    const response = await api.patch(`/registrations/${id}/status`, {
      status,
      reviewNotes,
    });
    return response.data;
  },

  // Delete customer registration record
  deleteRegistration: async (id) => {
    const response = await api.delete(`/registrations/${id}`);
    return response.data;
  },
};

/* ==========================================================================
   3. ORDER MANAGEMENT SERVICES
   ========================================================================== */
export const orderApi = {
  // Get all orders with optional filters (status, fuelType, customerId, search)
  getOrders: async (params = {}) => {
    const response = await api.get("/orders", { params });
    return response.data;
  },

  // Get pending orders awaiting Depot Manager approval
  getPendingOrders: async () => {
    const response = await api.get("/orders/pending");
    return response.data;
  },

  // Get orders in the delivery queue
  getDeliveryQueue: async () => {
    const response = await api.get("/orders/delivery-queue");
    return response.data;
  },

  // Get single order by ID or orderNumber
  getOrderById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  // Customer creates a new fuel order
  createOrder: async (orderData) => {
    const response = await api.post("/orders", orderData);
    return response.data;
  },

  // Depot Manager approves an order
  approveOrder: async (id) => {
    const response = await api.patch(`/orders/${id}/approve`);
    return response.data;
  },

  // Depot Manager rejects an order with reason
  rejectOrder: async (id, reason = "") => {
    const response = await api.patch(`/orders/${id}/reject`, { reason });
    return response.data;
  },

  // Assign driver and vehicle to an approved order
  assignOrder: async (id, driver, vehicle) => {
    const response = await api.patch(`/orders/${id}/assign`, { driver, vehicle });
    return response.data;
  },

  // Update order status (Pending, Approved, Rejected, Assigned, In Transit, Delivered)
  updateOrderStatus: async (id, statusData) => {
    const payload =
      typeof statusData === "string" ? { status: statusData } : statusData;
    const response = await api.patch(`/orders/${id}/status`, payload);
    return response.data;
  },

  // Update order details
  updateOrder: async (id, orderData) => {
    const response = await api.put(`/orders/${id}`, orderData);
    return response.data;
  },

  // Delete order
  deleteOrder: async (id) => {
    const response = await api.delete(`/orders/${id}`);
    return response.data;
  },
};

/* ==========================================================================
   4. DEPOT INVENTORY SERVICES
   ========================================================================== */
export const inventoryApi = {
  // View all depot tanks
  getInventory: async (params = {}) => {
    const response = await api.get("/inventory", { params });
    return response.data;
  },

  // View specific tank by ID or fuelType
  getInventoryById: async (id) => {
    const response = await api.get(`/inventory/${id}`);
    return response.data;
  },

  // Update tank stock, capacity, or minimum threshold
  updateInventory: async (id, updateData) => {
    const response = await api.put(`/inventory/${id}`, updateData);
    return response.data;
  },

  // Get active low stock alerts
  getLowStockAlerts: async () => {
    const response = await api.get("/inventory/alerts");
    return response.data;
  },

  // Submit depot tank refill request
  refillInventory: async (refillData) => {
    const response = await api.post("/inventory/refill", refillData);
    return response.data;
  },

  // Get historical refill logs
  getRefillHistory: async () => {
    const response = await api.get("/inventory/refills");
    return response.data;
  },

  // Verify stock availability for orders
  checkStock: async (fuelCode, amount) => {
    const response = await api.get("/inventory/check-stock", {
      params: { fuelCode, amount },
    });
    return response.data;
  },
};

/* ==========================================================================
   5. VEHICLE TRACKING & TELEMETRY SERVICES
   ========================================================================== */
export const vehicleApi = {
  // Get all vehicles with live coordinates & telemetry
  getVehicles: async (params = {}) => {
    const response = await api.get("/vehicles", { params });
    return response.data;
  },

  // Get vehicle by ID or plate number
  getVehicleById: async (id) => {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },

  // Add new vehicle to fleet
  createVehicle: async (vehicleData) => {
    const response = await api.post("/vehicles", vehicleData);
    return response.data;
  },

  // UPDATE vehicle live coordinates & speed for Google Maps
  updateLocation: async (id, locationData) => {
    const response = await api.patch(`/vehicles/${id}/location`, locationData);
    return response.data;
  },

  // UPDATE vehicle status (Available, Assigned, In Transit, Delivered)
  updateStatus: async (id, status) => {
    const response = await api.patch(`/vehicles/${id}/status`, { status });
    return response.data;
  },

  // Get live tracking payload formatted for Google Maps
  getTracking: async (id) => {
    const response = await api.get(`/vehicles/${id}/tracking`);
    return response.data;
  },

  // Update vehicle details
  updateVehicle: async (id, updateData) => {
    const response = await api.put(`/vehicles/${id}`, updateData);
    return response.data;
  },

  // Remove vehicle from fleet
  deleteVehicle: async (id) => {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
  },
};

/* ==========================================================================
   6. DASHBOARD STATISTICS SERVICES
   ========================================================================== */
export const dashboardApi = {
  // Aggregate real-time statistics across Orders, Inventory, and Vehicles
  getDashboardStats: async () => {
    try {
      const [ordersRes, inventoryRes, vehiclesRes, alertsRes] =
        await Promise.allSettled([
          orderApi.getOrders(),
          inventoryApi.getInventory(),
          vehicleApi.getVehicles(),
          inventoryApi.getLowStockAlerts(),
        ]);

      const orders =
        ordersRes.status === "fulfilled" && ordersRes.value?.data
          ? ordersRes.value.data
          : [];
      const inventory =
        inventoryRes.status === "fulfilled" && inventoryRes.value?.data
          ? inventoryRes.value.data
          : [];
      const vehicles =
        vehiclesRes.status === "fulfilled" && vehiclesRes.value?.data
          ? vehiclesRes.value.data
          : [];
      const alerts =
        alertsRes.status === "fulfilled" && alertsRes.value?.alerts
          ? alertsRes.value.alerts
          : [];

      const litresToday = orders.reduce((sum, o) => sum + (o.qty || o.quantity || 0), 0);
      const revenue = orders
        .filter((o) => o.status !== "Cancelled" && o.status !== "Rejected")
        .reduce((sum, o) => sum + (o.total || 0), 0);
      const activeDeliveries = orders.filter(
        (o) =>
          o.status === "InTransit" ||
          o.status === "In Transit" ||
          o.status === "Dispatched" ||
          o.status === "Assigned"
      ).length;
      const completedDeliveries = orders.filter((o) => o.status === "Delivered").length;
      const pendingApprovals = orders.filter((o) => o.status === "Pending").length;

      const totalCapacity = inventory.reduce((sum, t) => sum + (t.capacity || 0), 0);
      const totalStock = inventory.reduce(
        (sum, t) => sum + (t.currentStock != null ? t.currentStock : t.current || 0),
        0
      );

      const availableVehicles = vehicles.filter(
        (v) => v.status === "Available" || v.status === "Idle"
      ).length;
      const inTransitVehicles = vehicles.filter(
        (v) => v.status === "In Transit" || v.status === "InTransit" || v.status === "Delivering"
      ).length;

      return {
        success: true,
        data: {
          orders: {
            total: orders.length,
            litresToday,
            revenue,
            activeDeliveries,
            completedDeliveries,
            pendingApprovals,
            recentOrders: orders.slice(0, 6),
          },
          inventory: {
            totalCapacity,
            totalStock,
            tanksCount: inventory.length,
            lowStockAlertsCount: alerts.length,
            alerts,
            tanks: inventory,
          },
          vehicles: {
            total: vehicles.length,
            available: availableVehicles,
            inTransit: inTransitVehicles,
            fleet: vehicles,
          },
        },
      };
    } catch (error) {
      console.error("[DashboardApi] Error fetching aggregated statistics:", error);
      throw error;
    }
  },
};

export default api;
