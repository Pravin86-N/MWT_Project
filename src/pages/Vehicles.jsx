import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Truck, Plus, ShieldCheck, Wrench, Navigation, CheckCircle2, User, Fuel, Gauge } from "lucide-react";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";
import { vehicleApi, driverApi } from "../services/api";

export default function Vehicles() {
  const { t } = useLanguage();
  const { orders } = useOrders();

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [reg, setReg] = useState("");
  const [type, setType] = useState("Fuel Tanker 12,000L");
  const [capacity, setCapacity] = useState(12000);
  const [assignedDriver, setAssignedDriver] = useState("Unassigned");

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
      <div className="fleet-header-saas" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="fleet-title-saas">Fleet Tanker Vehicles Management</h1>
          <p className="fleet-subtitle-saas">
            Monitor bulk fuel delivery tanker assets, capacity volume, maintenance schedules, and assigned operating drivers.
          </p>
        </div>
      </div>

      {/* Add New Vehicle Form */}
      <section className="panel form-panel" style={{ padding: "20px", background: "var(--grad-dark-panel)", borderRadius: "16px", border: "1px solid var(--line)" }}>
        <h3 style={{ margin: "0 0 14px 0", fontSize: "15px", fontWeight: "700" }}>Register New Fleet Delivery Tanker</h3>
        <form className="field-row" onSubmit={handleAddVehicle} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "14px", alignItems: "end" }}>
          <label className="field">
            <span>Vehicle Registration Number</span>
            <input value={reg} onChange={(e) => setReg(e.target.value)} placeholder="TN-01-AB-9999" required />
          </label>
          <label className="field">
            <span>Tanker Model Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="Fuel Tanker 12,000L">Fuel Tanker 12,000L</option>
              <option value="Heavy Tanker 15,000L">Heavy Tanker 15,000L</option>
              <option value="Rigid Tanker 10,000L">Rigid Tanker 10,000L</option>
              <option value="Compact Tanker 8,000L">Compact Tanker 8,000L</option>
            </select>
          </label>
          <label className="field">
            <span>Payload Capacity (Litres)</span>
            <input type="number" min="1000" step="500" value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
          </label>
          <label className="field">
            <span>Assign Operating Driver</span>
            <select value={assignedDriver} onChange={(e) => setAssignedDriver(e.target.value)}>
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

      {/* Fleet Vehicles Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>
          Loading fleet vehicles from database...
        </div>
      ) : dynamicVehicles.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)" }}>
          No vehicles in fleet. Register your first tanker using the form above.
        </div>
      ) : (
        <section className="cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {dynamicVehicles.map((v) => {
          const getStatusBadge = () => {
            if (v.status === "In Transit") return <span className="pill status-intransit" style={{ fontSize: "11px", fontWeight: "800" }}>🚛 IN TRANSIT</span>;
            if (v.status === "Maintenance") return <span className="pill status-cancelled" style={{ fontSize: "11px", fontWeight: "800" }}>🔧 MAINTENANCE</span>;
            return <span className="pill status-delivered" style={{ fontSize: "11px", fontWeight: "800" }}>🟢 AVAILABLE</span>;
          };

          return (
            <div key={v.id} className="panel driver-card" style={{ padding: "20px", borderRadius: "16px", border: "1px solid var(--line)", background: "var(--panel)" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontSize: "17px", fontWeight: "900", color: "var(--text)" }}>
                    🚛 {v.reg}
                  </div>
                  <small style={{ color: "var(--text-dim)", fontSize: "12px" }}>{v.type}</small>
                </div>
                {getStatusBadge()}
              </div>

              {/* Details List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", color: "var(--text-dim)", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Fuel size={15} style={{ color: "var(--orange)" }} />
                  <span>Payload Capacity: <strong style={{ color: "var(--orange)", fontSize: "14px" }}>{v.capacity.toLocaleString()} Litres</strong></span>
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
                <div style={{ background: "rgba(0, 180, 216, 0.1)", border: "1px solid rgba(0, 180, 216, 0.3)", padding: "10px", borderRadius: "10px", fontSize: "12px", marginBottom: "14px" }}>
                  <strong style={{ color: "var(--blue)" }}>En-Route Order: {v.activeOrderNumber}</strong>
                  <div style={{ color: "var(--text-dim)", marginTop: "2px" }}>Destination: {v.site}</div>
                </div>
              )}

              {/* Status Change Buttons */}
              <div style={{ display: "flex", gap: "8px", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
                <button
                  className={`btn-ghost btn-sm ${v.status === "Available" ? "active" : ""}`}
                  onClick={() => handleStatusChange(v.id, "Available")}
                  style={{ fontSize: "11px", flex: 1, borderRadius: "6px" }}
                >
                  Set Available
                </button>
                <button
                  className={`btn-ghost btn-sm ${v.status === "Maintenance" ? "active" : ""}`}
                  onClick={() => handleStatusChange(v.id, "Maintenance")}
                  style={{ fontSize: "11px", flex: 1, borderRadius: "6px", color: "var(--red)" }}
                >
                  Maintenance
                </button>
              </div>
            </div>
          );
        })}
      </section>
      )}
    </div>
  );
}
