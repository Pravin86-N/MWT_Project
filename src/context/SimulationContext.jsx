import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useOrders } from "./OrdersContext";
import { useInventory } from "./InventoryContext";

const SimulationContext = createContext(null);

export function SimulationProvider({ children }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Depot operational. 4 active fuel tankers on radar.", time: "10:00 AM", type: "info" },
    { id: 2, text: "Order FD-260801-001 delivered to Chennai Steel Works.", time: "11:15 AM", type: "success" },
  ]);
  const [unreadCount, setUnreadCount] = useState(2);

  const { orders, advanceStatus } = useOrders();
  const { lowStockWarnings } = useInventory();

  const toggleSimulation = useCallback(() => {
    setIsSimulating((prev) => !prev);
  }, []);

  const addNotification = useCallback((text, type = "info") => {
    const newNotif = {
      id: Date.now(),
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type,
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
    setUnreadCount((c) => c + 1);
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Simulation interval logic
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      // Find orders that can advance
      const activeOrders = orders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled");
      if (activeOrders.length > 0) {
        const randomOrder = activeOrders[Math.floor(Math.random() * activeOrders.length)];
        advanceStatus(randomOrder.id);
        addNotification(
          `⚡ Auto-Sim: Order ${randomOrder.orderNumber} (${randomOrder.customer}) status updated.`,
          "info"
        );
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isSimulating, orders, advanceStatus, addNotification]);

  // Alert on low stock
  useEffect(() => {
    if (lowStockWarnings.length > 0) {
      lowStockWarnings.forEach((tank) => {
        addNotification(`⚠️ Low Inventory Alert: ${tank.name} is below threshold (${tank.current}L)!`, "warning");
      });
    }
  }, [lowStockWarnings.length]);

  const value = useMemo(
    () => ({
      isSimulating,
      toggleSimulation,
      notifications,
      unreadCount,
      markAllRead,
      addNotification,
    }),
    [isSimulating, toggleSimulation, notifications, unreadCount, markAllRead, addNotification]
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used within a SimulationProvider");
  return ctx;
}
