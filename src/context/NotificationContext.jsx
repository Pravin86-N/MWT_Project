import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const SEED_NOTIFICATIONS = [
  {
    id: 1,
    title: "New Fuel Request",
    message: "New bulk fuel request #FD-260801-008 from TamilNadu Industrial Corp awaiting manager approval.",
    category: "request",
    role: "Manager",
    type: "info",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
  },
  {
    id: 2,
    title: "Fuel Dispatched",
    message: "Order #FD-260801-001 for Chennai Steel Works is DISPATCHED. Driver R. Rangarajan en-route.",
    category: "dispatch",
    role: "Customer",
    type: "success",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: false,
  },
  {
    id: 3,
    title: "Low Inventory Alert",
    message: "Depot Tank High Speed Diesel (DSL) current stock level is below safety threshold (2,500 L).",
    category: "inventory",
    role: "Manager",
    type: "warning",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    read: false,
  },
  {
    id: 4,
    title: "Request Submitted",
    message: "Your fuel request #FD-260801-002 (4,000 L Premium Petrol) was submitted successfully.",
    category: "request",
    role: "Customer",
    type: "info",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    read: true,
  },
];

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("fdms-notifications");
    return saved ? JSON.parse(saved) : SEED_NOTIFICATIONS;
  });

  useEffect(() => {
    localStorage.setItem("fdms-notifications", JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback(({ title, message, category = "general", role = "All", type = "info", orderId }) => {
    const newNotif = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title,
      message,
      category,
      role, // "Customer", "Manager", or "All"
      type, // "info", "success", "warning", "danger"
      orderId,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]); // keep latest 50
    return newNotif;
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback((roleFilter = "All") => {
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
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      getUnreadCount,
      getNotificationsForRole,
    }),
    [notifications, addNotification, markAsRead, markAllAsRead, clearNotifications, getUnreadCount, getNotificationsForRole]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationProvider");
  return ctx;
}
