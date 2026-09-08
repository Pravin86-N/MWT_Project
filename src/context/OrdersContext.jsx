import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useState } from "react";
import { STATUS_FLOW } from "../data/seed";
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
        const currentIdx = STATUS_FLOW.indexOf(o.status === "In Transit" ? "InTransit" : o.status);
        const next = STATUS_FLOW[Math.min(currentIdx + 1, STATUS_FLOW.length - 1)];
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
  const [error, setError] = useState(null);
  const { reserveStock, releaseReservation, deductStock, hasSufficientStock } = useInventory();
  const { addNotification } = useNotifications();

  // Load orders from backend API on mount
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderApi.getOrders();
      if (res && Array.isArray(res.data)) {
        const normalized = res.data.map((o, idx) => ({
          id: o.orderNumber || o._id || idx + 1,
          mongoId: o._id,
          orderNumber: o.orderNumber,
          customer: o.customer,
          customerId: o.customerId,
          site: o.deliveryAddress || o.site,
          deliveryAddress: o.deliveryAddress || o.site,
          fuelCode: o.fuelType || o.fuelCode || "DSL",
          fuelType: o.fuelType || o.fuelCode || "DSL",
          qty: o.quantity != null ? o.quantity : o.qty || 0,
          quantity: o.quantity != null ? o.quantity : o.qty || 0,
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
          customerSignature: o.customerSignature || "",
          deliveryProof: o.deliveryProof || "",
          reachedAt: o.reachedAt || null,
          createdAt: o.createdAt,
        }));
        dispatch({ type: "LOAD", payload: normalized });
      } else {
        dispatch({ type: "LOAD", payload: [] });
      }
    } catch (err) {
      console.warn("[Orders] API fetch error:", err.message);
      setError(err.message);
      // Retrieve cached orders if available, else empty list
      const saved = localStorage.getItem("fdms-orders");
      dispatch({ type: "LOAD", payload: saved ? JSON.parse(saved) : [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Persist to localStorage whenever the list changes
  useEffect(() => {
    if (!loading) localStorage.setItem("fdms-orders", JSON.stringify(orders));
  }, [orders, loading]);

  const advanceStatus = useCallback(
    async (id) => {
      const o = orders.find((ord) => ord.id === id || ord.mongoId === id || ord.orderNumber === id);
      if (!o) return { success: false, message: "Order not found" };

      const normalizedStatus = o.status === "In Transit" ? "InTransit" : o.status;
      const currentIdx = STATUS_FLOW.indexOf(normalizedStatus);
      if (currentIdx === -1 || currentIdx >= STATUS_FLOW.length - 1) {
        return { success: false, message: "Order already in final status" };
      }

      const nextStatus = STATUS_FLOW[currentIdx + 1];

      if (nextStatus === "Approved") {
        try {
          await orderApi.approveOrder(o.mongoId || o.id);
          reserveStock(o.fuelCode, o.qty);
        } catch (e) {
          const errMsg = e.response?.data?.message || e.message;
          alert(`Approval Error: ${errMsg}`);
          return { success: false, message: errMsg };
        }
      } else if (nextStatus === "Dispatched") {
        if (!o.driver || o.driver === "Unassigned" || !o.vehicle || o.vehicle === "—" || o.vehicle === "Unassigned") {
          return {
            success: false,
            requireAssignment: true,
            message: "Dispatch Assignment Required: Driver and Vehicle must both be assigned before dispatching.",
          };
        }
        try {
          await orderApi.updateOrderStatus(o.mongoId || o.id, { status: "Dispatched" });
        } catch (e) {
          console.warn("[Orders] Status update error:", e.message);
        }
      } else if (nextStatus === "InTransit") {
        try {
          await orderApi.updateOrderStatus(o.mongoId || o.id, { status: "In Transit" });
        } catch (e) {
          console.warn("[Orders] Status update error:", e.message);
        }
      } else if (nextStatus === "Delivered") {
        try {
          await orderApi.updateOrderStatus(o.mongoId || o.id, { status: "Delivered" });
          deductStock(o.fuelCode, o.qty);
        } catch (e) {
          console.warn("[Orders] Status update error:", e.message);
        }
      }

      dispatch({ type: "ADVANCE", id: o.id });
      return { success: true };
    },
    [orders, reserveStock, deductStock]
  );

  const cancelOrder = useCallback(
    async (id) => {
      const o = orders.find((ord) => ord.id === id || ord.mongoId === id || ord.orderNumber === id);
      if (o) {
        if (o.status === "Approved" || o.status === "Dispatched" || o.status === "InTransit") {
          releaseReservation(o.fuelCode, o.qty);
        }
        try {
          await orderApi.updateOrderStatus(o.mongoId || o.id, { status: "Cancelled" });
        } catch (e) {
          console.warn("[Orders] API cancel failed:", e.message);
        }
      }
      dispatch({ type: "CANCEL", id: o ? o.id : id });
    },
    [orders, releaseReservation]
  );

  const addOrder = useCallback(
    async (orderData) => {
      try {
        const payload = {
          customer: orderData.customer,
          customerId: orderData.customerId,
          fuelType: orderData.fuelCode || orderData.fuelType || "DSL",
          fuelCode: orderData.fuelCode || orderData.fuelType || "DSL",
          quantity: orderData.qty || orderData.quantity || 1000,
          qty: orderData.qty || orderData.quantity || 1000,
          deliveryAddress: orderData.site || orderData.deliveryAddress || "Site Location",
          site: orderData.site || orderData.deliveryAddress || "Site Location",
          city: orderData.city || "Chennai",
          slot: orderData.slot || "08:00-10:00",
          notes: orderData.notes || "",
        };

        const res = await orderApi.createOrder(payload);
        const created = res.data || res;
        const normalized = {
          id: created.orderNumber || created._id,
          mongoId: created._id,
          orderNumber: created.orderNumber,
          customer: created.customer,
          customerId: created.customerId,
          site: created.deliveryAddress || created.site,
          deliveryAddress: created.deliveryAddress || created.site,
          fuelCode: created.fuelType || created.fuelCode,
          fuelType: created.fuelType || created.fuelCode,
          qty: created.quantity != null ? created.quantity : created.qty,
          quantity: created.quantity != null ? created.quantity : created.qty,
          driver: created.driver || "Unassigned",
          vehicle: created.vehicle || "Unassigned",
          city: created.city || "Chennai",
          status: created.status || "Pending",
          slot: created.slot || "08:00-10:00",
          subtotal: created.subtotal || 0,
          tax: created.tax || 0,
          deliveryCharge: created.deliveryCharge || 250,
          total: created.total || 0,
          notes: created.notes || "",
          createdAt: created.createdAt || new Date().toISOString(),
        };

        dispatch({ type: "ADD", payload: normalized });
        return { success: true, order: normalized };
      } catch (e) {
        console.warn("[Orders] API createOrder error:", e.message);
        // Optimistic local add
        dispatch({ type: "ADD", payload: orderData });
        return { success: false, error: e.message };
      }
    },
    []
  );

  const updateOrder = useCallback(
    async (id, payload) => {
      const o = orders.find((ord) => ord.id === id || ord.mongoId === id || ord.orderNumber === id);
      if (o) {
        try {
          if (payload.driver && payload.vehicle && (!payload.status || payload.status === "Assigned")) {
            await orderApi.assignOrder(o.mongoId || o.id, o.driver || payload.driver, payload.vehicle);
          } else if (payload.status === "Approved" && o.status !== "Approved") {
            await orderApi.approveOrder(o.mongoId || o.id);
            reserveStock(o.fuelCode, o.qty);
          } else if (payload.status === "Rejected" && o.status !== "Rejected") {
            await orderApi.rejectOrder(o.mongoId || o.id, payload.rejectionReason || "Rejected by Manager");
            if (["Approved", "Assigned", "InTransit", "Dispatched"].includes(o.status)) {
              releaseReservation(o.fuelCode, o.qty);
            }
          } else if (payload.status) {
            await orderApi.updateOrderStatus(o.mongoId || o.id, payload);
            if (payload.status === "Delivered" && o.status !== "Delivered") {
              deductStock(o.fuelCode, o.qty);
            }
          } else {
            await orderApi.updateOrder(o.mongoId || o.id, payload);
          }
        } catch (e) {
          console.warn("[Orders] API update error:", e.message);
        }
      }
      dispatch({ type: "UPDATE", id: o ? o.id : id, payload });
      return true;
    },
    [orders, reserveStock, releaseReservation, deductStock]
  );

  const deleteOrder = useCallback(
    async (id) => {
      const o = orders.find((ord) => ord.id === id || ord.mongoId === id || ord.orderNumber === id);
      if (o) {
        try {
          await orderApi.deleteOrder(o.mongoId || o.id);
        } catch (e) {
          console.warn("[Orders] API deleteOrder error:", e.message);
        }
      }
      dispatch({ type: "DELETE", id: o ? o.id : id });
    },
    [orders]
  );

  const resetToSeed = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  const value = useMemo(
    () => ({
      orders,
      loading,
      error,
      advanceStatus,
      cancelOrder,
      addOrder,
      updateOrder,
      deleteOrder,
      reloadOrders: fetchOrders,
      resetToSeed,
      hasSufficientStock,
    }),
    [orders, loading, error, advanceStatus, cancelOrder, addOrder, updateOrder, deleteOrder, fetchOrders, resetToSeed, hasSufficientStock]
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within an OrdersProvider");
  return ctx;
}
