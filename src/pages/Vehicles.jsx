import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Truck, Plus, ShieldCheck, Wrench, Navigation, CheckCircle2, User, Fuel, Gauge } from "lucide-react";
import { SEED_DRIVERS } from "../data/seed";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";
import { vehicleApi } from "../services/api";

const INITIAL_FLEET_VEHICLES = [
  { id: "v1", reg: "TN-01-AB-1234", type: "Fuel Tanker 12,000L", capacity: 12000, status: "Available", driver: "R. Selvam", odometer: 42150, lastService: "2026-07-15" },
  { id: "v2", reg: "TN-07-CD-4321", type: "Heavy Tanker 15,000L", capacity: 15000, status: "In Transit", driver: "K. Arumugam", odometer: 68900, lastService: "2026-06-20" },
  { id: "v3", reg: "TN-09-EF-5678", type: "Rigid Tanker 10,000L", capacity: 10000, status: "Available", driver: "M. Prabhu", odometer: 31400, lastService: "2026-08-01" },
  { id: "v4", reg: "TN-11-GH-9012", type: "Compact Tanker 8,000L", capacity: 8000, status: "Maintenance", driver: "Unassigned", odometer: 94200, lastService: "2026-05-10" },
];

export default function Vehicles() {
  const { t } = useLanguage();
  const { orders } = useOrders();

  const [vehicles, setVehicles] = useState(() => {
    const saved = localStorage.getItem("fdms-vehicles");
    return saved ? JSON.parse(saved) : INITIAL_FLEET_VEHICLES;
  });

  const [reg, setReg] = useState("");
  const [type, setType] = useState("Fuel Tanker 12,000L");
  const [capacity, setCapacity] = useState(12000);
  const [assignedDriver, setAssignedDriver] = useState("Unassigned");

  // Load live vehicles from backend API on mount
  useEffect(() => {
    let mounted = true;
    vehicleApi
      .getVehicles()
      .then((res) => {
        if (mounted && res.data && res.data.length > 0) {
          const normalized = res.data.map((v, idx) => ({
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
      })
      .catch((err) => {
        console.warn("[Vehicles] Backend API unavailable, using local vehicles:", err.message);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("fdms-vehicles", JSON.stringify(vehicles));
  }, [vehicles]);

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
              {SEED_DRIVERS.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-primary" style={{ backgroundColor: "var(--orange)", borderColor: "var(--orange)", fontWeight: "700" }}>
            <Plus size={16} /> Register Vehicle
          </button>
        </form>
      </section>

      {/* Fleet Vehicles Grid */}
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
    </div>
  );
}
