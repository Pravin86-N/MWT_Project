import React, { useState, useEffect, useMemo } from "react";
import { X, Truck, UserCheck, AlertTriangle, CheckCircle2, ShieldCheck, Sparkles, Navigation, Clock, Building2, Zap } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { driverApi, vehicleApi, orderApi } from "../services/api";

export default function DispatchModal({ order, onClose, onConfirm }) {
  const { addNotification } = useNotifications();
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [smartDispatch, setSmartDispatch] = useState(null);
  const [smartLoading, setSmartLoading] = useState(false);

  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.allSettled([driverApi.getDrivers(), vehicleApi.getVehicles()])
      .then(([drvRes, vehRes]) => {
        if (!mounted) return;
        if (drvRes.status === "fulfilled" && drvRes.value?.data) {
          setDrivers(drvRes.value.data);
        }
        if (vehRes.status === "fulfilled" && vehRes.value?.data) {
          setVehicles(vehRes.value.data);
        }
      })
      .catch((err) => {
        console.warn("[DispatchModal] Failed to fetch drivers/vehicles:", err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // Fetch Smart Fuel Dispatch Suggestions (Nearest Depot, Nearest Vehicle, ETA)
    if (order) {
      setSmartLoading(true);
      const targetId = order.mongoId || order.id || order.orderNumber;
      orderApi
        .getSmartDispatchSuggestion(targetId, order.city || "")
        .then((res) => {
          if (mounted && res?.data) {
            setSmartDispatch(res.data);
          }
        })
        .catch((err) => {
          console.warn("[DispatchModal] Smart dispatch suggestion error:", err.message);
        })
        .finally(() => {
          if (mounted) setSmartLoading(false);
        });
    }

    return () => {
      mounted = false;
    };
  }, [order]);

  // Filter ONLY available / on-duty drivers
  const availableDrivers = useMemo(
    () => drivers.filter((d) => d.onDuty || d.status === "On Duty" || d.status === "Available"),
    [drivers]
  );

  const availableVehicles = useMemo(
    () => vehicles.filter((v) => v.status === "Available" || (order && order.vehicle === (v.vehicleNumber || v.reg))),
    [vehicles, order]
  );

  // Pre-select driver and vehicle
  useEffect(() => {
    if (order) {
      if (order.driver && order.driver !== "Unassigned") {
        setSelectedDriver(order.driver);
      } else if (availableDrivers.length > 0 && !selectedDriver) {
        setSelectedDriver(availableDrivers[0].name);
      }

      if (order.vehicle && order.vehicle !== "—" && order.vehicle !== "Unassigned") {
        setSelectedVehicle(order.vehicle);
      } else if (availableVehicles.length > 0 && !selectedVehicle) {
        setSelectedVehicle(availableVehicles[0].vehicleNumber || availableVehicles[0].reg);
      }
    }
  }, [order, availableDrivers, availableVehicles, selectedDriver, selectedVehicle]);

  const handleApplySmartSuggestion = () => {
    if (!smartDispatch) return;
    if (smartDispatch.nearestVehicle?.vehicleNumber) {
      setSelectedVehicle(smartDispatch.nearestVehicle.vehicleNumber);
    }
    if (smartDispatch.nearestVehicle?.suggestedDriver) {
      const matchDriver = availableDrivers.find(
        (d) => d.name.toLowerCase() === smartDispatch.nearestVehicle.suggestedDriver.toLowerCase()
      );
      if (matchDriver) {
        setSelectedDriver(matchDriver.name);
      } else if (availableDrivers.length > 0) {
        setSelectedDriver(availableDrivers[0].name);
      }
    }
  };

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

        {/* Smart Fuel Dispatch AI Recommendation Card (Requirement 8) */}
        {smartDispatch && (
          <div
            style={{
              marginTop: "14px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(255, 94, 0, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)",
              border: "1px solid rgba(255, 94, 0, 0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={16} style={{ color: "var(--orange)" }} />
                <strong style={{ fontSize: "12px", color: "var(--orange)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Smart Fuel Dispatch Engine
                </strong>
              </div>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={handleApplySmartSuggestion}
                style={{
                  fontSize: "11px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "var(--orange)",
                  color: "#FFF",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                <Zap size={12} style={{ verticalAlign: "middle", marginRight: "3px" }} />
                Auto-Select
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", fontSize: "11px" }}>
              <div style={{ background: "var(--panel)", padding: "8px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <span style={{ color: "var(--text-dim)", display: "block" }}>Nearest Depot</span>
                <strong style={{ color: "var(--text)", display: "block", fontSize: "12px", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {smartDispatch.nearestDepot?.name || "Central Depot"}
                </strong>
                <small style={{ color: "var(--green-neon)", fontWeight: "700" }}>
                  {smartDispatch.nearestDepot?.distanceKm ?? 3.5} km away
                </small>
              </div>

              <div style={{ background: "var(--panel)", padding: "8px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <span style={{ color: "var(--text-dim)", display: "block" }}>Nearest Vehicle</span>
                <strong style={{ color: "var(--text)", display: "block", fontSize: "12px", marginTop: "2px" }}>
                  {smartDispatch.nearestVehicle?.vehicleNumber || "TN-01-FD-1011"}
                </strong>
                <small style={{ color: "var(--blue)", fontWeight: "700" }}>
                  {smartDispatch.nearestVehicle?.model || "12,000L Tanker"}
                </small>
              </div>

              <div style={{ background: "var(--panel)", padding: "8px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                <span style={{ color: "var(--text-dim)", display: "block" }}>Est. Delivery Time</span>
                <strong style={{ color: "var(--text)", display: "block", fontSize: "12px", marginTop: "2px" }}>
                  {smartDispatch.estimatedDelivery?.formattedDuration || "35 mins"}
                </strong>
                <small style={{ color: "var(--amber)", fontWeight: "700" }}>
                  ETA: {smartDispatch.estimatedDelivery?.etaTime || "In Transit"}
                </small>
              </div>
            </div>
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
                <option key={d._id || d.id} value={d.name}>
                  {d.name} ({d.phone || "On Duty"}) — {d.vehicle || "No default truck"}
                </option>
              ))}
            </select>
          )}
        </label>

        {/* Vehicle Selection Field */}
        <label className="field" style={{ marginTop: "12px" }}>
          <span>Select Available Delivery Tanker Vehicle</span>
          {availableVehicles.length === 0 ? (
            <div style={{ padding: "10px", background: "rgba(255, 0, 85, 0.1)", color: "var(--red)", borderRadius: "8px", fontSize: "13px" }}>
              ⚠️ No vehicles are currently available. Please register or free up a vehicle.
            </div>
          ) : (
            <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)} required>
              {availableVehicles.map((v) => {
                const regNum = v.vehicleNumber || v.reg;
                return (
                  <option key={v._id || v.id} value={regNum}>
                    {regNum} — {v.type} ({v.status})
                  </option>
                );
              })}
            </select>
          )}
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
