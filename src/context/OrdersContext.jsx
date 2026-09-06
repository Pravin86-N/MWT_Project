import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useState } from "react";
import { SEED_ORDERS, STATUS_FLOW } from "../data/seed";
import { useInventory } from "./InventoryContext";
import { useNotifications } from "./NotificationContext";
import { orderApi } from "../services/api";

function ordersReducer(state, action) {
  switch (action.type) {
    case "LOAD":
      return action.payload;
    case "ADD":
      return [{ ...action.payload, id: action.payload.id || action.payload.orderNumber || Date.now() }, ...state];
    case "ADVANCE":
      return state.map((o) => {
        if (o.id !== action.id && o._id !== action.id && o.orderNumber !== action.id) return o;
        if (o.status === "Delivered" || o.status === "Cancelled" || o.status === "Rejected") return o;
        const next = STATUS_FLOW[Math.min(STATUS_FLOW.indexOf(o.status) + 1, STATUS_FLOW.length - 1)];
        return { ...o, status: next };
      });
    case "CANCEL":
      return state.map((o) => (o.id === action.id || o._id === action.id || o.orderNumber === action.id ? { ...o, status: "Cancelled" } : o));
    case "UPDATE":
      return state.map((o) => (o.id === action.id || o._id === action.id || o.orderNumber === action.id ? { ...o, ...action.payload } : o));
    case "DELETE":
      return state.filter((o) => o.id !== action.id && o._id !== action.id && o.orderNumber !== action.id);
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

  // Load orders from backend API on mount
  useEffect(() => {
    let mounted = true;
    orderApi
      .getOrders()
      .then((res) => {
        if (mounted && res.data && res.data.length > 0) {
          const normalized = res.data.map((o, idx) => ({
            id: o.orderNumber || o._id || idx + 1,
            mongoId: o._id,
            orderNumber: o.orderNumber,
            customer: o.customer,
            site: o.deliveryAddress || o.site,
            fuelCode: o.fuelType || o.fuelCode,
            qty: o.quantity != null ? o.quantity : o.qty,
            driver: o.driver || "Unassigned",
            vehicle: o.vehicle || "Unassigned",
            city: o.city || "Chennai",
            status: o.status === "In Transit" ? "InTransit" : o.status,
            slot: o.slot || "08:00-10:00",
            subtotal: o.subtotal || 0,
            tax: o.tax || 0,
            deliveryCharge: o.deliveryCharge || 250,
            total: o.total || 0,
            notes: o.notes || "",
            createdAt: o.createdAt,
          }));
          dispatch({ type: "LOAD", payload: normalized });
          setLoading(false);
        } else {
          const saved = localStorage.getItem("fdms-orders");
          dispatch({ type: "LOAD", payload: saved ? JSON.parse(saved) : SEED_ORDERS });
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn("[Orders] Backend API unavailable, loading local orders:", err.message);
        const saved = localStorage.getItem("fdms-orders");
        dispatch({ type: "LOAD", payload: saved ? JSON.parse(saved) : SEED_ORDERS });
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Persist to localStorage whenever the list changes
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
      if (o) {
        if (o.status === "Approved" || o.status === "Dispatched" || o.status === "InTransit") {
          releaseReservation(o.fuelCode, o.qty);
        }
        orderApi.updateOrderStatus(o.mongoId || o.orderNumber || id, { status: "Cancelled" }).catch((e) => {
          console.warn("[Orders] API cancel failed, updating locally:", e.message);
        });
      }
      dispatch({ type: "CANCEL", id });
    },
    [orders, releaseReservation]
  );

  const addOrder = useCallback((order) => {
    dispatch({ type: "ADD", payload: order });
    orderApi
      .createOrder({
        customer: order.customer,
        fuelType: order.fuelCode || order.fuelType || "DSL",
        fuelCode: order.fuelCode || order.fuelType || "DSL",
        quantity: order.qty || order.quantity || 1000,
        qty: order.qty || order.quantity || 1000,
        deliveryAddress: order.site || order.deliveryAddress || "Site Location",
        site: order.site || order.deliveryAddress || "Site Location",
        city: order.city || "Chennai",
        slot: order.slot || "08:00-10:00",
        notes: order.notes || "",
      })
      .catch((e) => {
        console.warn("[Orders] API createOrder error, saved to local state:", e.message);
      });
  }, []);

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
          orderApi.approveOrder(o.mongoId || o.orderNumber || id).catch((e) => {
            console.warn("[Orders] API approveOrder failed, updated locally:", e.message);
          });
        } else if (payload.status === "Rejected" && o.status !== "Rejected") {
          orderApi.rejectOrder(o.mongoId || o.orderNumber || id, payload.rejectionReason || "Rejected by Manager").catch((e) => {
            console.warn("[Orders] API rejectOrder failed, updated locally:", e.message);
          });
        } else if (payload.status) {
          orderApi.updateOrderStatus(o.mongoId || o.orderNumber || id, payload).catch((e) => {
            console.warn("[Orders] API updateOrderStatus failed, updated locally:", e.message);
          });
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

  const deleteOrder = useCallback((id) => {
    const o = orders.find((ord) => ord.id === id);
    if (o) {
      orderApi.deleteOrder(o.mongoId || o.orderNumber || id).catch((e) => {
        console.warn("[Orders] API deleteOrder error:", e.message);
      });
    }
    dispatch({ type: "DELETE", id });
  }, [orders]);

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

