import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Truck, Plus, ShieldCheck, Wrench, Navigation, CheckCircle2, User, Fuel, Gauge, Lock } from "lucide-react";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { ROLES, can } from "../utils/permissions";
import { vehicleApi, driverApi } from "../services/api";
import { recordRecentAccess } from "../services/recentAccess";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import { SkeletonCard } from "../components/Skeleton";
import FuelBadge from "../components/FuelBadge";

export default function Vehicles() {
  const { t } = useLanguage();
  const { orders } = useOrders();
  const { state: authState } = useAuth();
  const currentUser = authState?.user;
  const userRole = currentUser?.role || "";
  const canManage = can(userRole, "vehicles.create");

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [reg, setReg] = useState("");
  const [type, setType] = useState("Fuel Tanker 12,000L");
  const [capacity, setCapacity] = useState(12000);
  const [assignedDriver, setAssignedDriver] = useState("Unassigned");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Load live vehicles and drivers from backend API on mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.allSettled([vehicleApi.getVehicles(), driverApi.getDrivers()])
      .then(([vehRes, drvRes]) => {
        if (!mounted) return;
        if (vehRes.status === "fulfilled" && vehRes.value?.data) {
          const normalized = vehRes.value.data.map((v, idx) => ({
            id: v._id || `v-${idx + 1}`,
            mongoId: v._id,
            reg: v.vehicleNumber || v.reg || v.vehicle || `TN-01-FL-${idx + 1000}`,
            type: v.type || "Fuel Tanker 12,000L",
            capacity: v.capacity || 12000,
            status: v.status === "InTransit" ? "In Transit" : v.status || "Available",
            driver: v.driverName || v.driver || "Unassigned",
            odometer: v.odometer || 40000 + idx * 2500,
            lastService: v.lastService || "2026-07-15",
            latitude: v.latitude,
            longitude: v.longitude,
            speed: v.speed,
            fuelLevel: v.fuelLevel,
          }));
          setVehicles(normalized);
        }
        if (drvRes.status === "fulfilled" && drvRes.value?.data) {
          setDrivers(drvRes.value.data);
        }
      })
      .catch((err) => {
        console.warn("[Vehicles] Backend API error:", err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Derive live vehicle statuses and assigned drivers dynamically from active orders
  const dynamicVehicles = useMemo(() => {
    const vehicleOrderMap = {};
    for (const o of orders) {
      if (o.vehicle && o.vehicle !== "—" && o.vehicle !== "Unassigned") {
        if (o.status === "Dispatched" || o.status === "InTransit") {
          vehicleOrderMap[o.vehicle] = o;
        }
      }
    }

    return vehicles.map((v) => {
      const activeOrder = vehicleOrderMap[v.reg];
      if (activeOrder) {
        return {
          ...v,
          status: "In Transit",
          driver: activeOrder.driver || v.driver,
          activeOrderNumber: activeOrder.orderNumber,
          site: activeOrder.site,
        };
      }
      return v;
    });
  }, [vehicles, orders]);

  const totalPages = Math.max(1, Math.ceil(dynamicVehicles.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const paginatedVehicles = dynamicVehicles.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!reg.trim()) return;

    const newVehicleData = {
      id: `v-${Date.now()}`,
      reg: reg.toUpperCase(),
      vehicleNumber: reg.toUpperCase(),
      type,
      capacity: Number(capacity),
      status: "Available",
      driver: assignedDriver,
      driverName: assignedDriver,
      odometer: 10000,
      lastService: new Date().toISOString().split("T")[0],
    };

    try {
      const res = await vehicleApi.createVehicle({
        vehicleNumber: reg.toUpperCase(),
        type,
        capacity: Number(capacity),
        driverName: assignedDriver,
        status: "Available",
      });
      if (res?.data?._id) {
        newVehicleData.mongoId = res.data._id;
        newVehicleData.id = res.data._id;
      }
    } catch (err) {
      console.warn("[Vehicles] API createVehicle error, saving locally:", err.message);
    }

    setVehicles((prev) => [newVehicleData, ...prev]);
    setReg("");
    setCapacity(12000);
    setAssignedDriver("Unassigned");
  };

  const handleStatusChange = (id, newStatus) => {
    const v = vehicles.find((veh) => veh.id === id);
    if (v) {
      vehicleApi
        .updateStatus(v.mongoId || v.reg || id, newStatus)
        .catch((err) => {
          console.warn("[Vehicles] API updateStatus error:", err.message);
        });
    }

    setVehicles((prev) =>
      prev.map((veh) => (veh.id === id ? { ...veh, status: newStatus } : veh))
    );
  };

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Banner */}
      <div className="fleet-header-saas" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 className="fleet-title-saas" style={{ margin: 0 }}>Fleet Tanker Vehicles Management</h1>
            {!canManage && (
              <span
                style={{
                  fontSize: "12px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(249, 115, 22, 0.15)",
                  border: "1px solid rgba(249, 115, 22, 0.3)",
                  color: "var(--orange)",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Lock size={12} />
                VIEW-ONLY • Managed by Depot Managers
              </span>
            )}
          </div>
          <p className="fleet-subtitle-saas">
            Monitor bulk fuel delivery tanker assets, capacity volume, maintenance schedules, and assigned operating drivers.
          </p>
        </div>
      </div>

      {/* Add New Vehicle Form (Depot Manager) or Governance Banner (Admin / Staff) */}
      {canManage ? (
        <section className="panel form-panel" style={{ padding: "20px", background: "var(--grad-dark-panel)", borderRadius: "16px", border: "1px solid var(--line)" }}>
          <h3 style={{ margin: "0 0 14px 0", fontSize: "17px", fontWeight: "700" }}>Register New Fleet Delivery Tanker</h3>
          <form className="field-row" onSubmit={handleAddVehicle} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "14px", alignItems: "end" }}>
            <label className="field" htmlFor="veh-reg-number">
              <span>Vehicle Registration Number</span>
              <input
                id="veh-reg-number"
                value={reg}
                onChange={(e) => setReg(e.target.value)}
                placeholder="TN-01-AB-9999"
                required
              />
            </label>
            <label className="field" htmlFor="veh-tanker-type">
              <span>Tanker Model Type</span>
              <select
                id="veh-tanker-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                aria-label="Tanker Model Type"
              >
                <option value="Fuel Tanker 12,000L">Fuel Tanker 12,000L</option>
                <option value="Heavy Tanker 15,000L">Heavy Tanker 15,000L</option>
                <option value="Rigid Tanker 10,000L">Rigid Tanker 10,000L</option>
                <option value="Compact Tanker 8,000L">Compact Tanker 8,000L</option>
              </select>
            </label>
            <label className="field" htmlFor="veh-payload-capacity">
              <span>Payload Capacity (Litres)</span>
              <input
                id="veh-payload-capacity"
                type="number"
                min="1000"
                step="500"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
            </label>
            <label className="field" htmlFor="veh-assigned-driver">
              <span>Assign Operating Driver</span>
              <select
                id="veh-assigned-driver"
                value={assignedDriver}
                onChange={(e) => setAssignedDriver(e.target.value)}
                aria-label="Assign Operating Driver"
              >
                <option value="Unassigned">Unassigned</option>
                {drivers.map((d) => (
                  <option key={d._id || d.id} value={d.name}>{d.name} {d.onDuty ? "(On Duty)" : "(Off Duty)"}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-primary" style={{ backgroundColor: "var(--orange)", borderColor: "var(--orange)", fontWeight: "700" }}>
              <Plus size={16} /> Register Vehicle
            </button>
          </form>
        </section>
      ) : (
        <div
          style={{
            padding: "16px 20px",
            background: "rgba(59, 130, 246, 0.1)",
            borderRadius: "14px",
            border: "1px solid rgba(59, 130, 246, 0.25)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "var(--text)",
            fontSize: "14px",
          }}
        >
          <ShieldCheck size={20} style={{ color: "#3b82f6", flexShrink: 0 }} />
          <div>
            <strong>Platform Governance (View-Only Mode):</strong> Physical fleet tankers, registration plates, and vehicle service statuses are operationally registered and managed by <strong>Depot Managers</strong> for their assigned depots.
          </div>
        </div>
      )}

      {/* Fleet Vehicles Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={`skel-veh-${i}`} height="220px" />
          ))}
        </div>
      ) : dynamicVehicles.length === 0 ? (
        <EmptyState
          type="vehicles"
          title="No active fleet vehicles."
          message="No fleet vehicles are registered in this depot jurisdiction. Register your first tanker using the form above."
        />
      ) : (
        <>
          <section className="cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
            {paginatedVehicles.map((v) => {
          const getStatusBadge = () => {
            if (v.status === "In Transit") return <span className="pill status-intransit" style={{ fontSize: "12.5px", fontWeight: "800" }}>🚛 IN TRANSIT</span>;
            if (v.status === "Maintenance") return <span className="pill status-cancelled" style={{ fontSize: "12.5px", fontWeight: "800" }}>🔧 MAINTENANCE</span>;
            return <span className="pill status-delivered" style={{ fontSize: "12.5px", fontWeight: "800" }}>🟢 AVAILABLE</span>;
          };

          return (
            <div
              key={v.id}
              className="panel driver-card"
              onClick={() => {
                recordRecentAccess("vehicles", {
                  id: String(v.reg || v.id),
                  title: `Tanker ${v.reg}`,
                  subtitle: `${v.type} • ${v.capacity?.toLocaleString() || 12000}L (${v.status})`,
                  link: "/vehicles",
                });
              }}
              style={{ padding: "20px", borderRadius: "16px", border: "1px solid var(--line)", background: "var(--panel)", cursor: "pointer" }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontSize: "17px", fontWeight: "900", color: "var(--text)" }}>
                    🚛 {v.reg}
                  </div>
                  <small style={{ color: "var(--text-dim)", fontSize: "13px" }}>{v.type}</small>
                </div>
                {getStatusBadge()}
              </div>

              {/* Details List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px", color: "var(--text-dim)", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Fuel size={15} style={{ color: "var(--orange)" }} />
                  <span>Payload Capacity: <strong style={{ color: "var(--orange)", fontSize: "15px" }}>{v.capacity.toLocaleString()} Litres</strong></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <User size={15} style={{ color: "var(--blue)" }} />
                  <span>Current Operating Driver: <strong style={{ color: "var(--text)" }}>{v.driver || "Unassigned"}</strong></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Gauge size={15} style={{ color: "var(--amber)" }} />
                  <span>Odometer: <strong style={{ color: "var(--text)" }}>{v.odometer.toLocaleString()} km</strong></span>
                </div>
              </div>

              {/* Active Delivery Info (if in transit) */}
              {v.activeOrderNumber && (
                <div style={{ background: "rgba(0, 180, 216, 0.1)", border: "1px solid rgba(0, 180, 216, 0.3)", padding: "10px", borderRadius: "10px", fontSize: "13px", marginBottom: "14px" }}>
                  <strong style={{ color: "var(--blue)" }}>En-Route Order: {v.activeOrderNumber}</strong>
                  <div style={{ color: "var(--text-dim)", marginTop: "2px" }}>Destination: {v.site}</div>
                </div>
              )}

              {/* Status Change Buttons (Depot Manager) or Read-Only Marker */}
              {canManage ? (
                <div style={{ display: "flex", gap: "8px", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
                  <button
                    className={`btn-ghost btn-sm ${v.status === "Available" ? "active" : ""}`}
                    onClick={() => handleStatusChange(v.id, "Available")}
                    style={{ fontSize: "13px", flex: 1, borderRadius: "6px" }}
                  >
                    Set Available
                  </button>
                  <button
                    className={`btn-ghost btn-sm ${v.status === "Maintenance" ? "active" : ""}`}
                    onClick={() => handleStatusChange(v.id, "Maintenance")}
                    style={{ fontSize: "13px", flex: 1, borderRadius: "6px", color: "var(--red)" }}
                  >
                    Maintenance
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "var(--text-dim)", fontStyle: "italic", textAlign: "center", width: "100%", paddingTop: "10px", borderTop: "1px solid var(--line)" }}>
                  Operational Status Managed by Depot
                </div>
              )}
            </div>
          );
        })}
      </section>

          <Pagination
            currentPage={clampedPage}
            totalPages={totalPages}
            totalRecords={dynamicVehicles.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        </>
      )}
    </div>
  );
}
