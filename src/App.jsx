import React from "react";
//control.exe keymgr.dll
import { Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { OrdersProvider } from "./context/OrdersContext";
import { SettingsProvider } from "./context/SettingsContext";
import { InventoryProvider } from "./context/InventoryContext";
import { SimulationProvider } from "./context/SimulationContext";
import { NotificationProvider } from "./context/NotificationContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import AppLayout from "./layouts/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CustomerPortal from "./pages/CustomerPortal";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import PendingRequests from "./pages/PendingRequests";
import FleetMap from "./pages/FleetMap";
import Inventory from "./pages/Inventory";
import Drivers from "./pages/Drivers";
import Vehicles from "./pages/Vehicles";
import Customers from "./pages/Customers";
import CustomerRegistrations from "./pages/CustomerRegistrations";
import Applications from "./pages/Applications";
import Register from "./pages/Register";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import DriverPortal from "./pages/DriverPortal";
import ForgotPassword from "./pages/ForgotPassword";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";

function RootRedirect() {
  const { state } = useAuth();
  if (state.status !== "authenticated") return <Navigate to="/login" replace />;
  if (state.user?.role === "Customer") return <Navigate to="/customer-portal" replace />;
  if (state.user?.role === "Driver") return <Navigate to="/driver-portal" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    "834977368397-qaip36ga1e6or3gujguc950kkajb4vjd.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ErrorBoundary>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <SettingsProvider>
                <NotificationProvider>
                  <InventoryProvider>
                    <OrdersProvider>
                      <SimulationProvider>
                        <Routes>
                          <Route path="/login" element={<Login />} />
                          <Route path="/register" element={<Register />} />
                          <Route path="/forgot-password" element={<ForgotPassword />} />

                          {/* Authenticated Application Routes */}
                          <Route
                            element={
                              <ProtectedRoute>
                                <ErrorBoundary>
                                  <AppLayout />
                                </ErrorBoundary>
                              </ProtectedRoute>
                            }
                          >
                        {/* Customer & Driver Accessible Routes */}
                        <Route path="/customer-portal" element={<CustomerPortal />} />
                        <Route path="/driver-portal" element={<DriverPortal />} />
                        <Route path="/fleet-map" element={<FleetMap />} />
                        <Route path="/settings" element={<Settings />} />

                        {/* Strict Admin / Dispatcher Only Routes */}
                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute adminOnly>
                              <Dashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/pending-requests"
                          element={
                            <ProtectedRoute adminOnly>
                              <PendingRequests />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/applications"
                          element={
                            <ProtectedRoute adminOnly>
                              <Applications />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/registrations"
                          element={
                            <ProtectedRoute adminOnly>
                              <Applications />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/application-dossier"
                          element={
                            <ProtectedRoute adminOnly>
                              <Applications />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/audit-logs"
                          element={
                            <ProtectedRoute adminOnly>
                              <AuditLogs />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/orders"
                          element={
                            <ProtectedRoute adminOnly>
                              <Orders />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/orders/:id"
                          element={
                            <ProtectedRoute adminOnly>
                              <OrderDetail />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/inventory"
                          element={
                            <ProtectedRoute adminOnly>
                              <Inventory />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/drivers"
                          element={
                            <ProtectedRoute adminOnly>
                              <Drivers />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/vehicles"
                          element={
                            <ProtectedRoute adminOnly>
                              <Vehicles />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/customers"
                          element={
                            <ProtectedRoute adminOnly>
                              <Customers />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/reports"
                          element={
                            <ProtectedRoute adminOnly>
                              <Reports />
                            </ProtectedRoute>
                          }
                        />
                      </Route>

                      <Route path="/" element={<RootRedirect />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </SimulationProvider>
                </OrdersProvider>
              </InventoryProvider>
            </NotificationProvider>
          </SettingsProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </ErrorBoundary>
</GoogleOAuthProvider>
  );
}
