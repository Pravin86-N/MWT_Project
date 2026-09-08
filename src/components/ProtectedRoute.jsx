import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { state } = useAuth();

  if (state.status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && (state.user?.role === "Customer" || state.user?.role === "Driver")) {
    return <Navigate to={state.user?.role === "Customer" ? "/customer-portal" : "/driver-portal"} replace />;
  }

  return children;
}
