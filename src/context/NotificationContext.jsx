import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getSocket } from "../services/socket";
import { notificationApi } from "../services/api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { state } = useAuth();
  const user = state?.user;

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("fdms-notifications");
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  // Load from MongoDB Atlas on mount
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getNotifications();
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        const normalized = res.data.map((n) => ({
          id: n._id || n.id,
          mongoId: n._id,
          title: n.title,
          message: n.message,
          category: n.category || "general",
          role: n.role || "All",
          type: n.type || "info",
          orderId: n.orderId || "",
          timestamp: n.createdAt || new Date().toISOString(),
          read: Boolean(n.read),
        }));
        setNotifications(normalized);
      }
    } catch (err) {
      console.warn("[Notifications] Backend API fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Persist to local storage
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem("fdms-notifications", JSON.stringify(notifications));
    }
  }, [notifications]);

  // Real-Time Socket.IO connection
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket.IO Client] Connected to real-time notification gateway:", socket.id);
      if (user) {
        socket.emit("join_room", {
          role: user.role,
          userId: user._id || user.id,
        });
      }
    });

    const handleIncoming = (data) => {
      if (!data) return;
      console.log("[Socket.IO Client] Real-time notification received:", data);

      const newNotif = {
        id: data._id || data.id || `sock_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        mongoId: data._id,
        title: data.title || "System Alert",
        message: data.message || "",
        category: data.category || "general",
        role: data.role || "All",
        type: data.type || "info",
        orderId: data.orderId || "",
        timestamp: data.timestamp || new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => {
        // Prevent duplicate IDs
        if (prev.some((n) => (n.mongoId && n.mongoId === newNotif.mongoId) || n.id === newNotif.id)) {
          return prev;
        }
        return [newNotif, ...prev.slice(0, 49)];
      });
    };

    // Listen to generic and specific event channels
    socket.on("notification", handleIncoming);
    socket.on("order_submitted", handleIncoming);
    socket.on("order_approved", handleIncoming);
    socket.on("order_rejected", handleIncoming);
    socket.on("delivery_assigned", handleIncoming);
    socket.on("new_order_request", handleIncoming);
    socket.on("new_registration_request", handleIncoming);

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const addNotification = useCallback(
    async ({ title, message, category = "general", role = "All", type = "info", orderId }) => {
      const tempId = Date.now() + Math.floor(Math.random() * 1000);
      const newNotif = {
        id: tempId,
        title,
        message,
        category,
        role, // "Customer", "Depot Manager", "Driver", "Admin", or "All"
        type, // "info", "success", "warning", "danger"
        orderId: orderId || "",
        timestamp: new Date().toISOString(),
        read: false,
      };

      try {
        const res = await notificationApi.createNotification({ title, message, category, role, type, orderId });
        if (res?.data?._id) {
          newNotif.id = res.data._id;
          newNotif.mongoId = res.data._id;
        }
      } catch (e) {
        console.warn("[Notifications] API createNotification error:", e.message);
      }

      setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);
      return newNotif;
    },
    []
  );

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id || n.mongoId === id) {
          notificationApi.markAsRead(n.mongoId || id).catch(() => {});
          return { ...n, read: true };
        }
        return n;
      })
    );
  }, []);

  const markAllAsRead = useCallback((roleFilter = "All") => {
    notificationApi.markAllAsRead(roleFilter).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => {
        const isMatch =
          roleFilter === "All" ||
          n.role === "All" ||
          n.role === roleFilter ||
          (roleFilter === "Manager" && (n.role === "Depot Manager" || n.role === "Admin" || n.role === "Manager"));
        if (isMatch) {
          return { ...n, read: true };
        }
        return n;
      })
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem("fdms-notifications");
  }, []);

  const matchesRole = (notifRole, roleFilter) => {
    if (!roleFilter || roleFilter === "All" || notifRole === "All") return true;
    if (notifRole === roleFilter) return true;
    if (roleFilter === "Manager" || roleFilter === "Admin" || roleFilter === "Depot Manager") {
      return ["Admin", "Manager", "Depot Manager", "All"].includes(notifRole);
    }
    return false;
  };

  const getUnreadCount = useCallback(
    (roleFilter = "All") => {
      return notifications.filter((n) => !n.read && matchesRole(n.role, roleFilter)).length;
    },
    [notifications]
  );

  const getNotificationsForRole = useCallback(
    (roleFilter = "All") => {
      return notifications.filter((n) => matchesRole(n.role, roleFilter));
    },
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      loading,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      getUnreadCount,
      getNotificationsForRole,
      reloadNotifications: fetchNotifications,
    }),
    [notifications, loading, addNotification, markAsRead, markAllAsRead, clearNotifications, getUnreadCount, getNotificationsForRole, fetchNotifications]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationProvider");
  return ctx;
}
