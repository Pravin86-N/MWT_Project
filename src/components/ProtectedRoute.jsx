import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "./LoadingScreen";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { state } = useAuth();
  const location = useLocation();

  const token = localStorage.getItem("fdms-token") || localStorage.getItem("token");
  const userStr = localStorage.getItem("fdms-user") || localStorage.getItem("user");

  // If status is loading or if state is idle while we have a token stored (rehydration)
  if (state.status === "loading" || (state.status === "idle" && token)) {
    return <LoadingScreen message="Verifying session credentials..." />;
  }

  if (state.status !== "authenticated" && !token) {
    console.warn(`[ProtectedRoute] Unauthenticated access to ${location.pathname} - Redirecting to /login`);
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const currentUser = state.user || (userStr ? JSON.parse(userStr) : null);
  const userRole = (currentUser?.role || "").toLowerCase();

  if (adminOnly && (userRole === "customer" || userRole === "driver")) {
    const target = userRole === "customer" ? "/customer-portal" : "/driver-portal";
    console.warn(`[ProtectedRoute] Access restricted for ${currentUser?.role} on ${location.pathname} - Redirecting to ${target}`);
    return <Navigate to={target} replace />;
  }

  return children;
}
