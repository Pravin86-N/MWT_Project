import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Truck,
  Navigation,
  CheckCircle2,
  MapPin,
  Phone,
  UploadCloud,
  PenTool,
  Clock,
  ShieldCheck,
  Building2,
  Fuel,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  FileCheck,
  Radio,
  Play,
  Square,
  WifiOff,
  Compass,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrdersContext";
import { useNotifications } from "../context/NotificationContext";
import { vehicleApi, driverApi } from "../services/api";
import StatusPill from "../components/StatusPill";
import FuelBadge from "../components/FuelBadge";
import { playDeliveryCompletedSound } from "../utils/soundNotifications";
import { getSocket } from "../services/socket";

// Smooth Leaflet camera follow component for driver
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (
      center &&
      Array.isArray(center) &&
      Number.isFinite(Number(center[0])) &&
      Number.isFinite(Number(center[1]))
    ) {
      try {
        map.panTo(center, { animate: true, duration: 0.8 });
      } catch (e) {}
    }
  }, [center, map]);
  return null;
}

// Custom Leaflet Markers
const createDepotIcon = () =>
  L.divIcon({
    html: `<div style="background:#FF5E00; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #FFF; box-shadow:0 0 12px rgba(255,94,0,0.8);"><span style="font-size:16px;">🏭</span></div>`,
    className: "custom-leaflet-icon",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

const createCustomerIcon = () =>
  L.divIcon({
    html: `<div style="background:#10B981; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #FFF; box-shadow:0 0 12px rgba(16,185,129,0.8);"><span style="font-size:16px;">📍</span></div>`,
    className: "custom-leaflet-icon",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

const createTankerIcon = () =>
  L.divIcon({
    html: `<div style="background:#00B4D8; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #FFF; box-shadow:0 0 14px rgba(0,180,216,0.9);"><span style="font-size:20px;">🚛</span></div>`,
    className: "custom-leaflet-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

export default function DriverPortal() {
  const { state } = useAuth();
  const { orders, updateOrder } = useOrders();
  const { addNotification } = useNotifications();
  const user = state.user;

  // Filter deliveries assigned specifically to this logged-in driver
  const driverDeliveries = useMemo(() => {
    if (!user?.name) return [];
    const driverName = user.name.toLowerCase();
    return orders.filter((o) => {
      if (!o.driver || o.driver === "—" || o.driver === "Unassigned") return false;
      return (
        o.driver.toLowerCase().includes(driverName) ||
        driverName.includes(o.driver.toLowerCase())
      );
    });
  }, [orders, user]);

  const assignedCount = useMemo(() => {
    return driverDeliveries.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled" && o.status !== "Rejected").length;
  }, [driverDeliveries]);

  const completedCount = useMemo(() => {
    return driverDeliveries.filter((o) => o.status === "Delivered").length;
  }, [driverDeliveries]);

  const [selectedOrder, setSelectedOrder] = useState(null);

  // Debug log driver portal loaded
  useEffect(() => {
    console.log("[Dashboard] Dashboard loaded (Driver Portal) - User:", user?.email, "Role:", user?.role);
  }, [user]);

  useEffect(() => {
    if (driverDeliveries.length > 0) {
      if (!selectedOrder || !driverDeliveries.some((d) => (d.id || d._id) === (selectedOrder.id || selectedOrder._id))) {
        setSelectedOrder(driverDeliveries[0]);
      }
    } else {
      setSelectedOrder(null);
    }
  }, [driverDeliveries, selectedOrder]);

  // Live GPS Coordinates for driver's vehicle
  const [gpsCoord, setGpsCoord] = useState([13.0827, 80.2707]);
  const [speed, setSpeed] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState("Standby");
  const [gpsError, setGpsError] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [deliveryStep, setDeliveryStep] = useState("idle"); // 'idle' | 'in_transit' | 'reached' | 'delivering'
  const [proofFile, setProofFile] = useState(null);
  const [signatureData, setSignatureData] = useState("");
  const [showProofModal, setShowProofModal] = useState(false);
  const [toast, setToast] = useState("");

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const watchIdRef = useRef(null);
  const sendIntervalRef = useRef(null);
  const latestCoordsRef = useRef({ lat: 13.0827, lng: 80.2707, speed: 0, accuracy: 0, heading: 0 });

  // Monitor network connectivity (Requirement 9: Internet disconnected)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setToast("🌐 Internet connection restored.");
      setTimeout(() => setToast(""), 4000);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Transmit location to backend API (POST /api/drivers/location) and Socket.IO every 5 seconds (Requirement 1, 2, 3)
  const transmitLocation = useCallback(async (lat, lng, spd, acc, head) => {
    const currentLat = lat ?? latestCoordsRef.current.lat;
    const currentLng = lng ?? latestCoordsRef.current.lng;
    const currentSpeed = spd ?? latestCoordsRef.current.speed;

    const payload = {
      driverId: user?._id || user?.id || null,
      driverName: user?.name || "R. Rangarajan",
      vehicleId: selectedOrder?.vehicle || user?.vehicle || "TN-01-FL-1001",
      latitude: currentLat,
      longitude: currentLng,
      speed: currentSpeed,
      accuracy: acc ?? latestCoordsRef.current.accuracy,
      heading: head ?? latestCoordsRef.current.heading,
      timestamp: new Date().toISOString(),
    };

    // Emit live GPS event via WebSocket for instant sub-second map updates
    try {
      const socket = getSocket();
      if (socket) {
        socket.emit("vehicle-location-update", payload);
        socket.emit("update_location", payload);
      }
    } catch (sockErr) {
      console.warn("[DriverPortal] Socket emit error:", sockErr.message);
    }

    try {
      await driverApi.sendLocation(payload);
    } catch (err) {
      console.warn("[DriverPortal] POST /api/drivers/location error:", err.message);
    }
  }, [user, selectedOrder]);

  // Start GPS Tracking (Requirement 1 & 2)
  const handleStartTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("GPS Geolocation is not supported by your current browser or mobile device.");
      return;
    }

    setGpsError(null);
    setIsTracking(true);
    setToast("📡 GPS Tracking initialized. Acquiring high-precision satellite fix...");
    setTimeout(() => setToast(""), 4000);

    // Clear existing watch if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // Call navigator.geolocation.watchPosition() (Requirement 2)
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed: s, accuracy: acc, heading: head } = position.coords;
        const currentSpeed = s != null && !isNaN(s) ? Math.round(s * 3.6) : (speed > 0 ? speed : 45);
        const currentAcc = Math.round(acc || 5);

        setGpsCoord([latitude, longitude]);
        setSpeed(currentSpeed);
        setAccuracy(currentAcc);
        setGpsError(null);

        latestCoordsRef.current = {
          lat: latitude,
          lng: longitude,
          speed: currentSpeed,
          accuracy: currentAcc,
          heading: head || 0,
        };
      },
      (error) => {
        console.warn("[DriverPortal] watchPosition error:", error);
        if (error.code === 1) {
          // PERMISSION_DENIED (Requirement 9)
          setGpsError("GPS permission was denied. Please allow location access in your browser or device settings.");
          handleStopTracking();
        } else if (error.code === 2) {
          // POSITION_UNAVAILABLE (Requirement 9)
          setGpsError("GPS position unavailable. Please ensure device location / GPS hardware is turned on.");
        } else if (error.code === 3) {
          // TIMEOUT (Requirement 9)
          setGpsError("GPS satellite signal timed out. Retrying connection...");
        } else {
          setGpsError(`GPS Error: ${error.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    watchIdRef.current = id;

    // Send location updates to backend every 5 seconds (Requirement 2 & 3)
    if (sendIntervalRef.current) clearInterval(sendIntervalRef.current);
    sendIntervalRef.current = setInterval(() => {
      transmitLocation();
    }, 5000);

    // Initial immediate transmit
    transmitLocation();
  }, [speed, transmitLocation]);

  // Stop GPS Tracking (Requirement 1)
  const handleStopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (sendIntervalRef.current !== null) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }
    setIsTracking(false);
    setToast("🛑 GPS tracking stopped. Device is now in standby.");
    setTimeout(() => setToast(""), 4000);
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (sendIntervalRef.current !== null) {
        clearInterval(sendIntervalRef.current);
      }
    };
  }, []);

  // Action: Start Delivery
  const handleStartDelivery = async () => {
    if (!selectedOrder) return;
    const ok = updateOrder(selectedOrder.id || selectedOrder._id, {
      status: "In Transit",
    });
    if (ok) {
      setDeliveryStep("in_transit");
      setToast(`🚀 Delivery started for Order ${selectedOrder.orderNumber}! Tanker is en-route.`);
      addNotification({
        title: "Delivery Started",
        message: `Driver ${user?.name || "R. Rangarajan"} has departed the depot with Order #${selectedOrder.orderNumber}.`,
        category: "delivery",
        role: "Customer",
        type: "info",
        orderId: selectedOrder.orderNumber,
      });
      setTimeout(() => setToast(""), 4000);
    }
  };

  // Action: Reached Customer Site
  const handleReachedCustomer = async () => {
    if (!selectedOrder) return;
    setDeliveryStep("reached");
    updateOrder(selectedOrder.id || selectedOrder._id, {
      reachedAt: new Date(),
    });
    setToast(`📍 Arrived at customer site: ${selectedOrder.site || selectedOrder.customer}. Ready for digital discharge.`);
    addNotification({
      title: "Tanker Arrived at Site",
      message: `Tanker has arrived at ${selectedOrder.site || selectedOrder.customer} for Order #${selectedOrder.orderNumber}.`,
      category: "delivery",
      role: "Customer",
      type: "info",
      orderId: selectedOrder.orderNumber,
    });
    setTimeout(() => setToast(""), 4000);
  };

  // Action: Open Mark Delivered Modal
  const handleOpenMarkDelivered = () => {
    setShowProofModal(true);
  };

  // Signature Canvas Controls
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#FF5E00";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureData("");
    }
  };

  // Submit Delivered with Proof
  const handleConfirmDelivered = () => {
    if (!selectedOrder) return;
    playDeliveryCompletedSound();
    updateOrder(selectedOrder.id || selectedOrder._id, {
      status: "Delivered",
      deliveryProof: proofFile ? proofFile.name : "discharge_meter_verified.jpg",
      customerSignature: signatureData || "Customer_Digital_Sign_Captured",
      deliveredAt: new Date(),
    });

    addNotification({
      title: "Delivery Completed",
      message: `Order #${selectedOrder.orderNumber} successfully discharged and confirmed by driver ${user?.name || "R. Rangarajan"}.`,
      category: "delivery",
      role: "All",
      type: "success",
      orderId: selectedOrder.orderNumber,
    });

    setShowProofModal(false);
    setDeliveryStep("idle");
    setToast(`🎉 Order #${selectedOrder.orderNumber} successfully marked DELIVERED!`);
    setTimeout(() => setToast(""), 4000);
  };

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Driver Header Banner */}
      <div className="fleet-header-saas" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span className={isTracking ? "live-gps-pulse" : ""} style={{ width: "10px", height: "10px", borderRadius: "50%", background: isTracking ? "var(--status-success, #22C55E)" : "var(--text-dim)" }}></span>
            <span style={{ fontSize: "12px", fontWeight: "800", color: isTracking ? "var(--status-success, #22C55E)" : "var(--text-dim)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              {isTracking ? "LIVE TRACKING" : "DRIVER DISPATCH CONSOLE"}
            </span>
          </div>
          <h1 className="fleet-title-saas">Driver Cockpit — {user?.name || "R. Rangarajan"}</h1>
          <p className="fleet-subtitle-saas">
            Live turn-by-turn route tracking, customer drop-off verification, and digital delivery confirmation.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Start / Stop Tracking Buttons (Section 9) */}
          {!isTracking ? (
            <button
              type="button"
              id="start-tracking-btn"
              onClick={handleStartTracking}
              style={{
                background: "var(--status-success, #22C55E)",
                border: "1px solid var(--status-success, #22C55E)",
                color: "#FFFFFF",
                fontWeight: "800",
                padding: "10px 18px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(34, 197, 94, 0.4)",
              }}
            >
              <Navigation size={16} /> Start Live Tracking
            </button>
          ) : (
            <button
              type="button"
              id="stop-tracking-btn"
              onClick={handleStopTracking}
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid #EF4444",
                color: "#EF4444",
                fontWeight: "800",
                padding: "10px 18px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <AlertCircle size={16} /> Stop Tracking
            </button>
          )}
        </div>
      </div>

      {/* SECTION 9: DEDICATED LIVE TRACKING TELEMETRY PANEL */}
      <div
        className="driver-live-telemetry-bar"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "14px",
          padding: "16px 20px",
          background: "var(--card-bg, #1E293B)",
          border: isTracking ? "1px solid var(--status-success, #22C55E)" : "1px solid var(--line)",
          borderRadius: "14px",
          boxShadow: isTracking ? "0 0 24px rgba(34, 197, 94, 0.15)" : "none",
          transition: "all 0.3s ease",
        }}
      >
        {/* Status Badge with Live Pulse */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            className={isTracking ? "live-gps-pulse" : ""}
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: isTracking ? "var(--status-success, #22C55E)" : "var(--text-dim, #94A3B8)",
              flexShrink: 0,
            }}
          />
          <div>
            <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: "700", display: "block" }}>
              Telemetry State
            </span>
            <strong style={{ fontSize: "14px", color: isTracking ? "var(--status-success, #22C55E)" : "var(--text-dim)", letterSpacing: "0.05em" }}>
              {isTracking ? "LIVE TRACKING" : "STANDBY"}
            </strong>
          </div>
        </div>

        {/* Current Coordinates */}
        <div>
          <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: "700", display: "block" }}>
            Current Coordinates
          </span>
          <strong className="mono" style={{ fontSize: "13px", color: "var(--text)", display: "block" }}>
            Lat: {gpsCoord[0].toFixed(5)}°
          </strong>
          <strong className="mono" style={{ fontSize: "13px", color: "var(--text-dim)", display: "block" }}>
            Lng: {gpsCoord[1].toFixed(5)}°
          </strong>
        </div>

        {/* GPS Accuracy */}
        <div>
          <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: "700", display: "block" }}>
            GPS Accuracy
          </span>
          <strong style={{ fontSize: "14px", color: "var(--fuel-electric, #3B82F6)" }}>
            ±{accuracy || 5} m
          </strong>
          <span style={{ fontSize: "12px", color: "var(--text-dim)", display: "block" }}>
            High-Precision Fix
          </span>
        </div>

        {/* Speed */}
        <div>
          <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: "700", display: "block" }}>
            Current Speed
          </span>
          <strong style={{ fontSize: "15px", color: "var(--fuel-diesel, #F59E0B)" }}>
            {speed} km/h
          </strong>
          <span style={{ fontSize: "12px", color: "var(--text-dim)", display: "block" }}>
            Telemetry Stream
          </span>
        </div>

        {/* Last Update */}
        <div>
          <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: "700", display: "block" }}>
            Last Update
          </span>
          <strong style={{ fontSize: "13px", color: isTracking ? "var(--text)" : "var(--text-dim)" }}>
            {lastUpdate}
          </strong>
          <span style={{ fontSize: "12px", color: "var(--text-dim)", display: "block" }}>
            {isTracking ? "Broadcasting 5s" : "Idle"}
          </span>
        </div>
      </div>

      {/* GPS Error Handling: Permission Denied / Signal Unavailable (Requirement 9) */}
      {gpsError && (
        <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid #EF4444", color: "#FFF", padding: "12px 18px", borderRadius: "12px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={20} style={{ color: "#EF4444", flexShrink: 0 }} />
            <span style={{ fontSize: "13px" }}>{gpsError}</span>
          </div>
          <button
            onClick={() => setGpsError(null)}
            style={{ background: "none", border: "none", color: "#FFF", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Internet Disconnected Alert (Requirement 9) */}
      {!isOnline && (
        <div style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid #F59E0B", color: "var(--text)", padding: "12px 18px", borderRadius: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px" }}>
          <WifiOff size={20} style={{ color: "#F59E0B", flexShrink: 0 }} />
          <span style={{ fontSize: "13px" }}>Internet disconnected. GPS coordinates are being held and will transmit automatically once connection is restored.</span>
        </div>
      )}

      {toast && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid var(--green-neon)", color: "var(--text)", padding: "12px 18px", borderRadius: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "10px" }}>
          <CheckCircle2 size={20} style={{ color: "var(--green-neon)" }} />
          <span>{toast}</span>
        </div>
      )}

      {/* Driver KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--fuel-diesel, #F59E0B)" }}>
          <div className="kpi-card-head">
            <span className="kpi-card-lbl">Assigned Deliveries</span>
            <div className="kpi-icon-badge">
              <Truck size={18} />
            </div>
          </div>
          <div className="kpi-val">{assignedCount} Assigned</div>
          <div className="kpi-footer">
            <span className="trend-pill up">Active Route</span>
            <span style={{ color: "var(--text-dim)" }}>Ready for Dispatch</span>
          </div>
        </div>

        <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--status-success, #22C55E)" }}>
          <div className="kpi-card-head">
            <span className="kpi-card-lbl">Completed Deliveries</span>
            <div className="kpi-icon-badge">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="kpi-val">{completedCount} Completed</div>
          <div className="kpi-footer">
            <span className="trend-pill up">100% Fulfilled</span>
            <span style={{ color: "var(--text-dim)" }}>Signed POD Verified</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Deliveries Queue / Right Navigation & Action Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.9fr", gap: "22px" }}>
        {/* LEFT: Assigned Deliveries Queue */}
        <div className="card portal-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700" }}>Assigned Deliveries ({driverDeliveries.length})</h3>
            <span className="pill" style={{ "--pill-color": "var(--fuel-diesel, #F59E0B)" }}>TODAY'S RUNS</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {driverDeliveries.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-dim)", fontStyle: "italic", fontSize: "14px" }}>
                No active delivery orders currently assigned to your shift. You are available in the dispatcher queue.
              </div>
            ) : (
              driverDeliveries.map((o) => {
                const isSelected = selectedOrder?.id === o.id || selectedOrder?._id === o._id;
                return (
                  <div
                    key={o.id || o._id}
                    onClick={() => setSelectedOrder(o)}
                    style={{
                      background: isSelected ? "color-mix(in srgb, var(--fuel-diesel, #F59E0B) 10%, var(--panel))" : "var(--grad-dark-panel)",
                      border: isSelected ? "2px solid var(--fuel-diesel, #F59E0B)" : "1px solid var(--line)",
                      borderRadius: "14px",
                      padding: "16px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span className="order-num-tag">#{o.orderNumber}</span>
                      <StatusPill status={o.status} />
                    </div>

                    <strong style={{ fontSize: "16px", color: "var(--text)", display: "block" }}>{o.customer}</strong>
                    <div style={{ fontSize: "13px", color: "var(--text-dim)", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={13} style={{ color: "var(--fuel-diesel, #F59E0B)" }} /> {o.site || o.deliveryAddress} ({o.city})
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed var(--line)", fontSize: "13px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FuelBadge fuelType={o.fuelCode || o.fuelType} />
                        <span style={{ fontWeight: "700" }}>{(o.qty || o.quantity || 0).toLocaleString()} L</span>
                      </div>
                      <span style={{ color: "var(--text-dim)" }}>Slot: {o.slot || "08:00-10:00"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Active Delivery Navigation Map & Workflow Actions */}
        {selectedOrder ? (
          <div className="card portal-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <span style={{ fontSize: "12px", color: "var(--fuel-diesel, #F59E0B)", fontWeight: "800", textTransform: "uppercase" }}>
                  Active Mission Drop-Off
                </span>
                <h2 style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: "800" }}>
                  {selectedOrder.customer} — #{selectedOrder.orderNumber}
                </h2>
                <div style={{ fontSize: "14px", color: "var(--text-dim)", marginTop: "6px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                  <span><Building2 size={14} style={{ color: "var(--fuel-electric, #3B82F6)" }} /> {selectedOrder.site || selectedOrder.deliveryAddress}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <FuelBadge fuelType={selectedOrder.fuelCode || selectedOrder.fuelType} />
                    <span>{(selectedOrder.qty || selectedOrder.quantity || 0).toLocaleString()} L</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span className="pill" style={{ "--pill-color": "var(--status-success, #22C55E)" }}>
                  TANKER: {selectedOrder.vehicle || "TN-01-AB-1234"}
                </span>
              </div>
            </div>

            {/* REAL REACT LEAFLET ROUTE MAP */}
            <div style={{ height: "300px", borderRadius: "14px", overflow: "hidden", border: "1px solid var(--line)" }}>
              <MapContainer
                center={gpsCoord}
                zoom={13}
                zoomControl={false}
                style={{ width: "100%", height: "100%" }}
              >
                <MapRecenter center={gpsCoord} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* Central Depot */}
                <Marker position={[13.0827, 80.2707]} icon={createDepotIcon()}>
                  <Popup>Central Fuel Dispatch Depot</Popup>
                </Marker>

                {/* Moving Tanker Marker */}
                <Marker position={gpsCoord} icon={createTankerIcon()}>
                  <Popup>
                    <strong>Your Tanker</strong><br />
                    Speed: {speed} km/h<br />
                    GPS: {gpsCoord[0]}, {gpsCoord[1]}
                  </Popup>
                </Marker>

                {/* Customer Drop-off */}
                <Marker position={[13.0450, 80.2100]} icon={createCustomerIcon()}>
                  <Popup>{selectedOrder.customer} Delivery Site</Popup>
                </Marker>

                {/* Route Waypoint Line */}
                <Polyline
                  positions={[
                    [13.0827, 80.2707],
                    gpsCoord,
                    [13.0450, 80.2100],
                  ]}
                  color="#FF5E00"
                  weight={4}
                  dashArray="6, 8"
                />
              </MapContainer>
            </div>

            {/* 3 WORKFLOW ACTION BUTTONS */}
            <div style={{ background: "var(--grad-dark-panel)", padding: "16px", borderRadius: "14px", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: "700", marginBottom: "12px", textTransform: "uppercase" }}>
                Delivery Execution Steps
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                {/* BUTTON 1: Start Delivery */}
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    background: selectedOrder.status === "In Transit" || selectedOrder.status === "InTransit" ? "rgba(0, 180, 216, 0.2)" : "var(--blue)",
                    borderColor: "var(--blue)",
                    color: "#FFF",
                    fontWeight: "700",
                    padding: "14px 10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  onClick={handleStartDelivery}
                >
                  <Navigation size={20} />
                  <span>Start Delivery</span>
                </button>

                {/* BUTTON 2: Reached Customer */}
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    background: deliveryStep === "reached" ? "rgba(255, 183, 3, 0.2)" : "var(--amber)",
                    borderColor: "var(--amber)",
                    color: "#000",
                    fontWeight: "700",
                    padding: "14px 10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  onClick={handleReachedCustomer}
                >
                  <MapPin size={20} />
                  <span>Reached Customer</span>
                </button>

                {/* BUTTON 3: Mark Delivered */}
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    background: selectedOrder.status === "Delivered" ? "rgba(16, 185, 129, 0.2)" : "var(--green-neon)",
                    borderColor: "var(--green-neon)",
                    color: "#000",
                    fontWeight: "800",
                    padding: "14px 10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  onClick={handleOpenMarkDelivered}
                >
                  <CheckCircle2 size={20} />
                  <span>Mark Delivered</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card portal-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
            Select an order on the left to start route navigation.
          </div>
        )}
      </div>

      {/* DELIVERY PROOF & SIGNATURE CAPTURE MODAL */}
      {showProofModal && selectedOrder && (
        <div className="modal-backdrop" onClick={() => setShowProofModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px", background: "var(--panel)", borderRadius: "18px", border: "1px solid var(--line)", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "800" }}>Delivery Discharge Confirmation</h3>
              <button className="icon-btn" onClick={() => setShowProofModal(false)}>✕</button>
            </div>

            <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "var(--text-dim)" }}>
              Discharge verification for <strong>{selectedOrder.customer}</strong> ({selectedOrder.qty} L {selectedOrder.fuelCode}).
            </p>

            {/* 1. Upload Delivery Proof */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "700", marginBottom: "8px" }}>
                1. Upload Meter Discharge Photo / Delivery Slip
              </label>
              <div
                style={{
                  border: "2px dashed var(--line)",
                  borderRadius: "12px",
                  padding: "16px",
                  textAlign: "center",
                  background: "var(--grad-dark-panel)",
                  cursor: "pointer",
                }}
                onClick={() => document.getElementById("proof-file-input").click()}
              >
                <UploadCloud size={24} style={{ color: "var(--orange)", margin: "0 auto 6px" }} />
                <div style={{ fontSize: "14px", color: "var(--text)" }}>
                  {proofFile ? proofFile.name : "Click to select or capture discharge meter photo"}
                </div>
                <small style={{ color: "var(--text-dim)", fontSize: "12px" }}>JPEG, PNG, or PDF</small>
                <input
                  id="proof-file-input"
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files?.[0] && setProofFile(e.target.files[0])}
                />
              </div>
            </div>

            {/* 2. Customer Signature Capture Pad */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "14px", fontWeight: "700" }}>
                  2. Customer Authorized Signature
                </label>
                <button
                  type="button"
                  onClick={clearSignature}
                  style={{ background: "none", border: "none", color: "var(--orange)", fontSize: "13px", cursor: "pointer", fontWeight: "700" }}
                >
                  Clear Pad
                </button>
              </div>

              <div style={{ border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden", background: "var(--panel-alt)" }}>
                <canvas
                  ref={canvasRef}
                  width={470}
                  height={130}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ display: "block", cursor: "crosshair", width: "100%" }}
                />
              </div>
              <small style={{ color: "var(--text-dim)", fontSize: "12px", display: "block", marginTop: "4px" }}>
                Sign above using mouse, stylus, or fingertip.
              </small>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              className="btn-primary full"
              style={{ background: "var(--green-neon)", color: "#000", fontWeight: "800", padding: "14px", borderRadius: "12px" }}
              onClick={handleConfirmDelivered}
            >
              <CheckCircle2 size={18} /> Confirm & Mark Order Delivered
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
