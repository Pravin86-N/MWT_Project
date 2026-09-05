import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { OrdersProvider } from "./context/OrdersContext";
import { SettingsProvider } from "./context/SettingsContext";
import { InventoryProvider } from "./context/InventoryContext";
import { SimulationProvider } from "./context/SimulationContext";
import { NotificationProvider } from "./context/NotificationContext";
import ProtectedRoute from "./components/ProtectedRoute";
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
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

function RootRedirect() {
  const { state } = useAuth();
  if (state.status !== "authenticated") return <Navigate to="/login" replace />;
  if (state.user?.role === "Customer") return <Navigate to="/customer-portal" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
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

                      {/* Authenticated Application Routes */}
                      <Route
                        element={
                          <ProtectedRoute>
                            <AppLayout />
                          </ProtectedRoute>
                        }
                      >
                        {/* Customer Accessible Routes */}
                        <Route path="/customer-portal" element={<CustomerPortal />} />
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
                          path="/registrations"
                          element={
                            <ProtectedRoute adminOnly>
                              <CustomerRegistrations />
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
                          path="/fleet-map"
                          element={
                            <ProtectedRoute adminOnly>
                              <FleetMap />
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
  );
}
