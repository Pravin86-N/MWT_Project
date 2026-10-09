import React, { Suspense, lazy } from "react";
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
import LoadingScreen from "./components/LoadingScreen";
import AppLayout from "./layouts/AppLayout";

// Code-split routes for optimal performance and minimal initial bundle size
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const PendingRequests = lazy(() => import("./pages/PendingRequests"));
const FleetMap = lazy(() => import("./pages/FleetMap"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Drivers = lazy(() => import("./pages/Drivers"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const Customers = lazy(() => import("./pages/Customers"));
const Applications = lazy(() => import("./pages/Applications"));
const Register = lazy(() => import("./pages/Register"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const DriverPortal = lazy(() => import("./pages/DriverPortal"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Pricing = lazy(() => import("./pages/Pricing"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { ROLES } from "./utils/permissions";

function RootRedirect() {
  const { state } = useAuth();
  const token = localStorage.getItem("fdms-token") || localStorage.getItem("token");
  const userStr = localStorage.getItem("fdms-user") || localStorage.getItem("user");
  const currentUser = state.user || (userStr ? JSON.parse(userStr) : null);

  if (state.status !== "authenticated" && !token) return <Navigate to="/login" replace />;
  const role = (currentUser?.role || "").toLowerCase();
  if (role === "customer") return <Navigate to="/customer-portal" replace />;
  if (role === "driver") return <Navigate to="/driver-portal" replace />;
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
                        <Suspense fallback={<LoadingScreen message="Loading page..." />}>
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

                          {/* Enterprise RBAC Role-Scoped Routes */}
                          <Route
                            path="/dashboard"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR]}>
                                <Dashboard />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/users"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                                <UserManagement />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/pricing"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR, ROLES.CUSTOMER]}>
                                <Pricing />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/pending-requests"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DEPOT_MANAGER]}>
                                <PendingRequests />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/applications"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR]}>
                                <Applications />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/registrations"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR]}>
                                <Applications />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/application-dossier"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR]}>
                                <Applications />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/audit-logs"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.AUDITOR]}>
                                <AuditLogs />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/orders"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR, ROLES.DRIVER, ROLES.CUSTOMER]}>
                                <Orders />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/orders/:id"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR, ROLES.DRIVER, ROLES.CUSTOMER]}>
                                <OrderDetail />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/inventory"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR]}>
                                <Inventory />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/drivers"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR, ROLES.DRIVER]}>
                                <Drivers />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/vehicles"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR, ROLES.DRIVER]}>
                                <Vehicles />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/customers"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR]}>
                                <Customers />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/reports"
                            element={
                              <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.AUDITOR, ROLES.SUPPORT_EXECUTIVE]}>
                                <Reports />
                              </ProtectedRoute>
                            }
                          />
                        </Route>

                        <Route path="/" element={<RootRedirect />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
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
