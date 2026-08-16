import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useState } from "react";
import { SEED_ORDERS, STATUS_FLOW } from "../data/seed";

/**
 * OrdersContext
 * -------------------------------------------------------------
 * The order manifest used to live entirely inside Dashboard's
 * local useState. Now that the app has separate Orders and Order
 * Detail pages that all need to read AND mutate the same list,
 * that state has to move somewhere all of them can reach without
 * prop-drilling through the router — a Context, exactly like
 * AuthContext and ThemeContext.
 *
 * useReducer is used (rather than several useState calls) because
 * "advance status" / "cancel" / "add" / "update" / "delete" are a
 * closed set of well-defined transitions on one list, which is the
 * textbook case for a reducer over ad-hoc setState calls.
 */

function ordersReducer(state, action) {
  switch (action.type) {
    case "LOAD":
      return action.payload;
    case "ADD":
      return [{ ...action.payload, id: Date.now() }, ...state];
    case "ADVANCE":
      return state.map((o) => {
        if (o.id !== action.id || o.status === "Delivered" || o.status === "Cancelled") return o;
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

  // useEffect: simulate an initial API call loading today's
  // orders, preferring anything already saved in this browser.
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = localStorage.getItem("fdms-orders");
      dispatch({ type: "LOAD", payload: saved ? JSON.parse(saved) : SEED_ORDERS });
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // useEffect: persist to localStorage whenever the list changes
  // (skips the very first render, before data has loaded).
  useEffect(() => {
    if (!loading) localStorage.setItem("fdms-orders", JSON.stringify(orders));
  }, [orders, loading]);

  const advanceStatus = useCallback((id) => dispatch({ type: "ADVANCE", id }), []);
  const cancelOrder = useCallback((id) => dispatch({ type: "CANCEL", id }), []);
  const addOrder = useCallback((order) => dispatch({ type: "ADD", payload: order }), []);
  const updateOrder = useCallback((id, payload) => dispatch({ type: "UPDATE", id, payload }), []);
  const deleteOrder = useCallback((id) => dispatch({ type: "DELETE", id }), []);
  const resetToSeed = useCallback(() => {
    localStorage.removeItem("fdms-orders");
    dispatch({ type: "LOAD", payload: SEED_ORDERS });
  }, []);

  const value = useMemo(
    () => ({ orders, loading, advanceStatus, cancelOrder, addOrder, updateOrder, deleteOrder, resetToSeed }),
    [orders, loading, advanceStatus, cancelOrder, addOrder, updateOrder, deleteOrder, resetToSeed]
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within an OrdersProvider");
  return ctx;
}
