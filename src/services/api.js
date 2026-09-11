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

// Response Interceptor: Handle response errors gracefully with retry logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    // If token is invalid or expired, handle session cleanup if 401
    if (error.response && error.response.status === 401) {
      const isAuthRoute =
        error.config?.url?.includes("/auth/login") ||
        error.config?.url?.includes("/auth/register");
      if (!isAuthRoute) {
        console.warn("[API] Authentication expired or invalid token");
      }
      return Promise.reject(error);
    }

    // Auto-retry for idempotent requests (GET) or network disconnects up to 2 times
    if (
      config &&
      (!config.method || config.method.toLowerCase() === "get") &&
      (!config.__retryCount || config.__retryCount < 2)
    ) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      const delayMs = config.__retryCount * 800;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api(config);
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

  // Google OAuth Login
  googleLogin: async (googleData) => {
    const response = await api.post("/auth/google", googleData);
    const data = response.data;
    if (data.token) {
      localStorage.setItem("fdms-token", data.token);
    }
    return data;
  },

  // Send Mobile OTP
  sendOtp: async (mobile) => {
    const response = await api.post("/auth/send-otp", { mobile });
    return response.data;
  },

  // Verify Mobile OTP
  verifyOtp: async (mobile, otp) => {
    const response = await api.post("/auth/verify-otp", { mobile, otp });
    const data = response.data;
    if (data.token) {
      localStorage.setItem("fdms-token", data.token);
    }
    return data;
  },

  // Send Email OTP for Login
  sendLoginOtp: async (email) => {
    const response = await api.post("/auth/send-login-otp", { email });
    return response.data;
  },

  // Verify Email OTP for Login
  verifyLoginOtp: async (email, otp) => {
    const response = await api.post("/auth/verify-login-otp", { email, otp });
    const data = response.data;
    if (data.token) {
      localStorage.setItem("fdms-token", data.token);
    }
    return data;
  },

  // Forgot Password - Send Reset OTP
  forgotPassword: async (email) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  // Verify Forgot Password OTP
  verifyResetOtp: async (email, otp) => {
    const response = await api.post("/auth/verify-reset-otp", { email, otp });
    return response.data;
  },

  // Set New Password after OTP verification or Reset Token link
  resetPassword: async (emailOrPayload, otp, newPassword, token) => {
    const payload =
      typeof emailOrPayload === "object"
        ? emailOrPayload
        : { email: emailOrPayload, otp, newPassword, token };
    const response = await api.post("/auth/reset-password", payload);
    return response.data;
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

  // Update profile
  updateProfile: async (profileData) => {
    const response = await api.put("/auth/profile", profileData);
    if (response.data?.token) {
      localStorage.setItem("fdms-token", response.data.token);
    }
    return response.data;
  },

  // Change Password
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post("/auth/change-password", { currentPassword, newPassword });
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

  // Approve customer registration (PUT /api/registrations/:id/approve)
  approveRegistration: async (id) => {
    const response = await api.put(`/registrations/${id}/approve`);
    return response.data;
  },

  // Reject customer registration with reason (PUT /api/registrations/:id/reject)
  rejectRegistration: async (id, rejectionReason = "") => {
    const response = await api.put(`/registrations/${id}/reject`, { rejectionReason });
    return response.data;
  },

  // Approve or reject customer registration (legacy patch)
  updateStatus: async (id, status, reviewNotes = "") => {
    if (status === "Approved") {
      return registrationApi.approveRegistration(id);
    } else if (status === "Rejected") {
      return registrationApi.rejectRegistration(id, reviewNotes);
    }
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
   2.1 ENTERPRISE CUSTOMER CRM SERVICES
   ========================================================================== */
export const customerApi = {
  // Fetch all customers from MongoDB
  getCustomers: async (params = {}) => {
    const response = await api.get("/customers", { params });
    return response.data;
  },

  // Get customer by ID, regId, or name
  getCustomerById: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  // Create or register new customer
  createCustomer: async (formData) => {
    const headers =
      formData instanceof FormData
        ? { "Content-Type": "multipart/form-data" }
        : { "Content-Type": "application/json" };
    const response = await api.post("/customers", formData, { headers });
    return response.data;
  },

  // Approve or reject customer status
  updateStatus: async (id, status, reviewNotes = "") => {
    const response = await api.patch(`/customers/${id}/status`, {
      status,
      reviewNotes,
    });
    return response.data;
  },

  // Delete customer record
  deleteCustomer: async (id) => {
    const response = await api.delete(`/customers/${id}`);
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

  // Get order invoice & billing details
  getOrderInvoice: async (id) => {
    const response = await api.get(`/orders/${id}/invoice`);
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
  // Aggregate real-time statistics across Customers, Orders, Inventory, Drivers, and Vehicles
  getDashboardStats: async () => {
    try {
      const [ordersRes, inventoryRes, vehiclesRes, alertsRes, customersRes, driversRes] =
        await Promise.allSettled([
          orderApi.getOrders(),
          inventoryApi.getInventory(),
          vehicleApi.getVehicles(),
          inventoryApi.getLowStockAlerts(),
          customerApi.getCustomers(),
          driverApi.getDrivers(),
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
      const customers =
        customersRes.status === "fulfilled" && customersRes.value?.data
          ? customersRes.value.data
          : [];
      const drivers =
        driversRes.status === "fulfilled" && driversRes.value?.data
          ? driversRes.value.data
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
      const pendingApprovals = orders.filter(
        (o) => o.status === "Pending" || o.status === "Pending Approval"
      ).length;

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

      const activeDrivers = drivers.filter(
        (d) => d.onDuty || d.status === "On Duty" || d.status === "Available"
      ).length;
      const pendingDeliveries = orders.filter((o) =>
        ["Pending", "Pending Approval", "Approved", "Assigned", "In Transit", "InTransit", "Dispatched"].includes(o.status)
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
          customers: {
            total: customers.length,
            list: customers,
          },
          drivers: {
            total: drivers.length,
            active: activeDrivers,
            list: drivers,
          },
          // Specific KPIs required for Admin Dashboard & Depot Manager Dashboard
          kpis: {
            totalCustomers: customers.length,
            totalOrders: orders.length,
            pendingOrders: pendingApprovals,
            completedOrders: completedDeliveries,
            totalDrivers: drivers.length,
            totalVehicles: vehicles.length,
            depotOrders: orders.length,
            pendingDeliveries,
            activeDrivers,
            availableFuelStock: totalStock,
          },
        },
      };
    } catch (error) {
      console.error("[DashboardApi] Error fetching aggregated statistics:", error);
      throw error;
    }
  },
};

/* ==========================================================================
   7. DRIVER FLEET WORKFORCE SERVICES
   ========================================================================== */
export const driverApi = {
  getDrivers: async (params = {}) => {
    const response = await api.get("/drivers", { params });
    return response.data;
  },
  getDriverById: async (id) => {
    const response = await api.get(`/drivers/${id}`);
    return response.data;
  },
  createDriver: async (driverData) => {
    const response = await api.post("/drivers", driverData);
    return response.data;
  },
  updateDriver: async (id, updateData) => {
    const response = await api.put(`/drivers/${id}`, updateData);
    return response.data;
  },
  deleteDriver: async (id) => {
    const response = await api.delete(`/drivers/${id}`);
    return response.data;
  },
};

/* ==========================================================================
   8. REAL-TIME NOTIFICATION SERVICES
   ========================================================================== */
export const notificationApi = {
  getNotifications: async (params = {}) => {
    const response = await api.get("/notifications", { params });
    return response.data;
  },
  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },
  markAllAsRead: async (role = "All") => {
    const response = await api.patch("/notifications/read-all", { role });
    return response.data;
  },
  createNotification: async (data) => {
    const response = await api.post("/notifications", data);
    return response.data;
  },
};

/* ==========================================================================
   9. REPORTS & ANALYTICS SERVICES
   ========================================================================== */
export const reportApi = {
  // Fetch general reports suite
  getReports: async (params = {}) => {
    const response = await api.get("/reports", { params });
    return response.data;
  },
  // Fetch reports dashboard with tables and KPIs
  getDashboardReports: async () => {
    const response = await api.get("/reports/dashboard");
    return response.data;
  },
  // Fetch summary metrics
  getReportsSummary: async () => {
    const response = await api.get("/reports/summary");
    return response.data;
  },
};

/* ==========================================================================
   10. AUDIT TRAIL & ACTIVITY LOG SERVICES
   ========================================================================== */
export const activityApi = {
  getActivities: async (params = {}) => {
    const response = await api.get("/activities", { params });
    return response.data;
  },
};

export default api;
