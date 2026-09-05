import React, { useState, useEffect, useMemo } from "react";
import { X, Truck, UserCheck, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { SEED_DRIVERS } from "../data/seed";
import { useNotifications } from "../context/NotificationContext";

const FLEET_VEHICLES = [
  { id: "v1", reg: "TN-01-AB-1234", type: "Fuel Tanker 12,000L", status: "Available" },
  { id: "v2", reg: "TN-07-CD-4321", type: "Heavy Tanker 15,000L", status: "Available" },
  { id: "v3", reg: "TN-09-EF-5678", type: "Rigid Tanker 10,000L", status: "Available" },
  { id: "v4", reg: "TN-11-GH-9012", type: "Compact Tanker 8,000L", status: "Available" },
];

export default function DispatchModal({ order, onClose, onConfirm }) {
  const { addNotification } = useNotifications();
  const [drivers] = useState(() => {
    const saved = localStorage.getItem("fdms-drivers");
    return saved ? JSON.parse(saved) : SEED_DRIVERS;
  });

  // Filter ONLY available / on-duty drivers
  const availableDrivers = useMemo(
    () => drivers.filter((d) => d.onDuty),
    [drivers]
  );

  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [validationError, setValidationError] = useState("");

  // Pre-select if order already has an assigned driver or vehicle
  useEffect(() => {
    if (order) {
      if (order.driver && order.driver !== "Unassigned") {
        const found = availableDrivers.find((d) => d.name === order.driver);
        if (found) {
          setSelectedDriver(found.name);
          setSelectedVehicle(found.vehicle || FLEET_VEHICLES[0].reg);
          return;
        }
      }
      if (availableDrivers.length > 0) {
        setSelectedDriver(availableDrivers[0].name);
        setSelectedVehicle(availableDrivers[0].vehicle || FLEET_VEHICLES[0].reg);
      }
    }
  }, [order, availableDrivers]);

  const handleDriverChange = (driverName) => {
    setSelectedDriver(driverName);
    const d = availableDrivers.find((item) => item.name === driverName);
    if (d && d.vehicle && d.vehicle !== "—") {
      setSelectedVehicle(d.vehicle);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    if (!selectedDriver || selectedDriver === "Unassigned") {
      setValidationError("Dispatch Assignment Error: An available On-Duty Driver must be selected.");
      return;
    }

    if (!selectedVehicle || selectedVehicle === "—" || selectedVehicle === "Unassigned") {
      setValidationError("Dispatch Assignment Error: An available Fleet Vehicle must be assigned.");
      return;
    }

    onConfirm(order.id, {
      driver: selectedDriver,
      vehicle: selectedVehicle,
      status: "Dispatched",
      dispatchedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    });

    addNotification({
      title: "Driver Assigned",
      message: `Driver ${selectedDriver} has been assigned to your fuel request ${order.orderNumber}.`,
      category: "dispatch",
      role: "Customer",
      type: "info",
      orderId: order.orderNumber,
    });

    addNotification({
      title: "Vehicle Assigned",
      message: `Fleet Tanker ${selectedVehicle} has been assigned to transport your order ${order.orderNumber}.`,
      category: "dispatch",
      role: "Customer",
      type: "info",
      orderId: order.orderNumber,
    });

    addNotification({
      title: "Fuel Dispatched",
      message: `Order ${order.orderNumber} (${order.qty.toLocaleString()} L ${order.fuelCode}) is DISPATCHED en-route to ${order.site} (${order.city}).`,
      category: "dispatch",
      role: "Customer",
      type: "success",
      orderId: order.orderNumber,
    });

    onClose();
  };

  if (!order) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} style={{ maxWidth: "520px" }}>
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Truck size={22} style={{ color: "var(--orange)" }} />
            <h3 style={{ margin: "0" }}>Dispatch Assignment Center</h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "10px 14px", background: "var(--grad-dark-panel)", borderRadius: "12px", border: "1px solid var(--line)" }}>
          <div style={{ fontSize: "13px", color: "var(--text-dim)" }}>
            Order Number: <strong style={{ color: "var(--text)" }}>{order.orderNumber}</strong>
          </div>
          <div style={{ fontSize: "14px", fontWeight: "700", marginTop: "2px", color: "var(--text)" }}>
            {order.customer} ({order.site} • {order.city})
          </div>
          <div style={{ fontSize: "12px", color: "var(--orange)", marginTop: "4px", fontWeight: "700" }}>
            Cargo: {order.qty.toLocaleString()} L of {order.fuelCode} Bulk Fuel
          </div>
        </div>

        {/* Validation Error Display */}
        {validationError && (
          <div className="banner-alert danger-banner" style={{ borderRadius: "12px", marginTop: "12px", padding: "10px 14px" }}>
            <AlertTriangle size={18} style={{ color: "var(--red)" }} />
            <span style={{ fontSize: "13px", fontWeight: "700" }}>{validationError}</span>
          </div>
        )}

        {/* Driver Selection Field */}
        <label className="field" style={{ marginTop: "16px" }}>
          <span style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Select Available On-Duty Driver</span>
            <small style={{ color: "var(--green-neon)" }}>
              <ShieldCheck size={12} style={{ verticalAlign: "middle" }} /> {availableDrivers.length} Drivers On Duty
            </small>
          </span>
          {availableDrivers.length === 0 ? (
            <div style={{ padding: "10px", background: "rgba(255, 0, 85, 0.1)", color: "var(--red)", borderRadius: "8px", fontSize: "13px" }}>
              ⚠️ No drivers are currently On-Duty. Please toggle driver duty status in Drivers page.
            </div>
          ) : (
            <select value={selectedDriver} onChange={(e) => handleDriverChange(e.target.value)} required>
              {availableDrivers.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.phone}) — {d.vehicle || "No default truck"}
                </option>
              ))}
            </select>
          )}
        </label>

        {/* Vehicle Selection Field */}
        <label className="field" style={{ marginTop: "12px" }}>
          <span>Select Available Delivery Tanker Vehicle</span>
          <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)} required>
            {FLEET_VEHICLES.map((v) => (
              <option key={v.id} value={v.reg}>
                {v.reg} — {v.type} ({v.status})
              </option>
            ))}
          </select>
        </label>

        <div style={{ background: "rgba(255, 183, 3, 0.08)", border: "1px solid rgba(255, 183, 3, 0.25)", padding: "12px", borderRadius: "12px", fontSize: "12px", color: "var(--amber)", marginTop: "14px" }}>
          <strong>Dispatch Check:</strong> Assigning a driver and vehicle automatically transfers cargo to the tanker's live GPS telemetry route.
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
          <button type="button" className="btn-secondary full" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary full"
            disabled={availableDrivers.length === 0}
            style={{ backgroundColor: "var(--orange)", borderColor: "var(--orange)", fontWeight: "800" }}
          >
            Confirm Dispatch Assignment
          </button>
        </div>
      </form>
    </div>
  );
}
