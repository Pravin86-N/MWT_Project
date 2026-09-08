import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { notificationApi } from "../services/api";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("fdms-notifications");
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem("fdms-notifications", JSON.stringify(notifications));
    }
  }, [notifications]);

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
        if (roleFilter === "All" || n.role === "All" || n.role === roleFilter) {
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

  const getUnreadCount = useCallback(
    (roleFilter = "All") => {
      return notifications.filter(
        (n) => !n.read && (roleFilter === "All" || n.role === "All" || n.role === roleFilter)
      ).length;
    },
    [notifications]
  );

  const getNotificationsForRole = useCallback(
    (roleFilter = "All") => {
      return notifications.filter(
        (n) => roleFilter === "All" || n.role === "All" || n.role === roleFilter
      );
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
