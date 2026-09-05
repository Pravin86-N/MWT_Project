import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useState } from "react";
import { SEED_ORDERS, STATUS_FLOW } from "../data/seed";
import { useInventory } from "./InventoryContext";
import { useNotifications } from "./NotificationContext";

function ordersReducer(state, action) {
  switch (action.type) {
    case "LOAD":
      return action.payload;
    case "ADD":
      return [{ ...action.payload, id: Date.now() }, ...state];
    case "ADVANCE":
      return state.map((o) => {
        if (o.id !== action.id || o.status === "Delivered" || o.status === "Cancelled" || o.status === "Rejected") return o;
        const next = STATUS_FLOW[Math.min(STATUS_FLOW.indexOf(o.status) + 1, STATUS_FLOW.length - 1)];
        return { ...o, status: next };
      });
    case "CANCEL":
      return state.map((o) => (o.id === action.id ? { ...o, status: "Cancelled" } : o));
    case "UPDATE":
      return state.map((o) => (o.id === action.id ? { ...o, ...action.payload } : o));
    case "DELETE":
      return state.filter((o) => o.id !== action.id);
    default:
      return state;
  }
}

const OrdersContext = createContext(null);

export function OrdersProvider({ children }) {
  const [orders, dispatch] = useReducer(ordersReducer, []);
  const [loading, setLoading] = useState(true);
  const { reserveStock, releaseReservation, deductStock, hasSufficientStock } = useInventory();
  const { addNotification } = useNotifications();

  // useEffect: simulate initial API call loading orders
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem("fdms-orders");
      dispatch({ type: "LOAD", payload: saved ? JSON.parse(saved) : SEED_ORDERS });
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // useEffect: persist to localStorage whenever the list changes
  useEffect(() => {
    if (!loading) localStorage.setItem("fdms-orders", JSON.stringify(orders));
  }, [orders, loading]);

  const advanceStatus = useCallback(
    (id) => {
      const o = orders.find((ord) => ord.id === id);
      if (o) {
        const currentIdx = STATUS_FLOW.indexOf(o.status);
        if (currentIdx !== -1 && currentIdx < STATUS_FLOW.length - 1) {
          const nextStatus = STATUS_FLOW[currentIdx + 1];

          if (nextStatus === "Dispatched") {
            if (!o.driver || o.driver === "Unassigned" || !o.vehicle || o.vehicle === "—" || o.vehicle === "Unassigned") {
              return {
                success: false,
                requireAssignment: true,
                message: "Dispatch Assignment Required: Driver and Vehicle must both be assigned before dispatching.",
              };
            }
          }

          if (nextStatus === "Approved") {
            const res = reserveStock(o.fuelCode, o.qty);
            if (!res.success) {
              alert(`Cannot advance order: ${res.reason}`);
              return { success: false, message: res.reason };
            }
          }

          if (nextStatus === "Delivered") {
            deductStock(o.fuelCode, o.qty);
            addNotification({
              title: "Fuel Delivered",
              message: `Order ${o.orderNumber} (${o.qty.toLocaleString()} L ${o.fuelCode}) has been DELIVERED to ${o.site}!`,
              category: "delivery",
              role: "Customer",
              type: "success",
              orderId: o.orderNumber,
            });
          }
        }
      }
      dispatch({ type: "ADVANCE", id });
      return { success: true };
    },
    [orders, reserveStock, deductStock, addNotification]
  );

  const cancelOrder = useCallback(
    (id) => {
      const o = orders.find((ord) => ord.id === id);
      if (o && (o.status === "Approved" || o.status === "Dispatched" || o.status === "InTransit")) {
        releaseReservation(o.fuelCode, o.qty);
      }
      dispatch({ type: "CANCEL", id });
    },
    [orders, releaseReservation]
  );

  const addOrder = useCallback((order) => dispatch({ type: "ADD", payload: order }), []);

  const updateOrder = useCallback(
    (id, payload) => {
      const o = orders.find((ord) => ord.id === id);
      if (o) {
        if (payload.status === "Approved" && o.status !== "Approved") {
          const res = reserveStock(o.fuelCode, o.qty);
          if (!res.success) {
            alert(`Cannot approve order: ${res.reason}`);
            return false;
          }
        }

        if (payload.status === "Delivered" && o.status !== "Delivered") {
          deductStock(o.fuelCode, o.qty);
          addNotification({
            title: "Fuel Delivered",
            message: `Order ${o.orderNumber} (${o.qty.toLocaleString()} L ${o.fuelCode}) has been DELIVERED to ${o.site}!`,
            category: "delivery",
            role: "Customer",
            type: "success",
            orderId: o.orderNumber,
          });
        }

        if (
          (payload.status === "Cancelled" || payload.status === "Rejected") &&
          (o.status === "Approved" || o.status === "Dispatched" || o.status === "InTransit")
        ) {
          releaseReservation(o.fuelCode, o.qty);
        }
      }
      dispatch({ type: "UPDATE", id, payload });
      return true;
    },
    [orders, reserveStock, releaseReservation, deductStock, addNotification]
  );

  const deleteOrder = useCallback((id) => dispatch({ type: "DELETE", id }), []);

  const resetToSeed = useCallback(() => {
    localStorage.removeItem("fdms-orders");
    dispatch({ type: "LOAD", payload: SEED_ORDERS });
  }, []);

  const value = useMemo(
    () => ({
      orders,
      loading,
      advanceStatus,
      cancelOrder,
      addOrder,
      updateOrder,
      deleteOrder,
      resetToSeed,
      hasSufficientStock,
    }),
    [orders, loading, advanceStatus, cancelOrder, addOrder, updateOrder, deleteOrder, resetToSeed, hasSufficientStock]
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within an OrdersProvider");
  return ctx;
}
