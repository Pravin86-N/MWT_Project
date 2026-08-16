import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Reads the auth status straight out of context (no props needed)
// and redirects unauthenticated visitors back to /login.
export default function ProtectedRoute({ children }) {
  const { state } = useAuth();
  if (state.status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }
  return children;
}
