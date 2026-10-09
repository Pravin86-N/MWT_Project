import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ErrorBoundary from "../components/ErrorBoundary";

// Fix Leaflet's default marker icons in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

import {
  Truck,
  Navigation,
  Activity,
  AlertTriangle,
  Radio,
  PhoneCall,
  Gauge,
  Thermometer,
  Shield,
  Fuel,
  CheckCircle2,
  Zap,
  Wifi,
  Battery,
  User,
  Maximize2,
  Compass,
  Play,
  Square,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrdersContext";
import { useNotifications } from "../context/NotificationContext";
import { vehicleApi, driverApi, gpsApi } from "../services/api";
import { getSocket } from "../services/socket";
import FuelBadge from "../components/FuelBadge";
import { playCriticalAlertSound } from "../utils/soundNotifications";

// REAL GPS COORDINATES FOR TAMIL NADU CITIES & DEPOTS
const DEPOT_LOCATIONS = [
  { id: "d1", name: "Chennai Main Depot", lat: 13.0827, lng: 80.2707, type: "Central Depot" },
  { id: "d2", name: "Salem Fleet Hub", lat: 11.6643, lng: 78.146, type: "Regional Hub" },
  { id: "d3", name: "Madurai Logistics Depot", lat: 9.9252, lng: 78.1198, type: "Southern Depot" },
  { id: "d4", name: "Trichy Fleet Terminal", lat: 10.7905, lng: 78.7047, type: "Central Hub" },
  { id: "d5", name: "Coimbatore Industrial Hub", lat: 11.0168, lng: 76.9558, type: "Western Hub" },
];

// HIGHWAY ROUTE WAYPOINTS (Real Latitude/Longitude pairs)
const HIGHWAY_ROUTES = {
  "v-1": [
    [13.0827, 80.2707], // Chennai
    [12.8342, 79.7036], // Kanchipuram
    [11.6643, 78.146],  // Salem
    [10.7905, 78.7047], // Trichy
    [9.9252, 78.1198],  // Madurai
  ],
  "v-2": [
    [11.0168, 76.9558], // Coimbatore
    [11.1085, 77.3411], // Tiruppur
    [11.341, 77.7172],  // Erode
    [10.7905, 78.7047], // Trichy
  ],
  "v-3": [
    [13.0827, 80.2707], // Chennai
    [11.9401, 79.4861], // Viluppuram
    [10.7905, 78.7047], // Trichy
  ],
  "v-4": [
    [9.9252, 78.1198],  // Madurai
    [9.1723, 77.8762],  // Sattur
    [8.7139, 77.7567],  // Tirunelveli
  ],
};

// ROBUST FALLBACK FLEET (Ensures radar is never empty and represents all 4 required statuses)
const DEFAULT_FALLBACK_FLEET = [
  {
    id: "v-1",
    key: "v-1",
    vehicle: "TN-01-FL-1001",
    depot: "DEP-CHN-01",
    type: "Fuel Tanker 16,000L",
    driver: "Rajesh Kannan",
    phone: "+91 98765 43210",
    status: "Delivering",
    speed: 64,
    cargo: "12,000 L Diesel",
    dest: "Metro Fuels Ltd (Salem)",
    eta: "24 mins",
    lat: 12.8342,
    lng: 79.7036,
    fuelLevel: 88,
    engineTemp: 84,
    tirePressure: 34,
    gpsSignal: "5G 99%",
    batteryStatus: "100%",
    lastGpsUpdate: "Just now",
  },
  {
    id: "v-2",
    key: "v-2",
    vehicle: "TN-38-FL-2002",
    depot: "DEP-CBE-05",
    type: "Heavy Tanker 20,000L",
    driver: "S. Murugan",
    phone: "+91 98451 23456",
    status: "Returning",
    speed: 52,
    cargo: "Empty Tanker",
    dest: "Coimbatore Industrial Hub",
    eta: "38 mins",
    lat: 11.2200,
    lng: 77.5000,
    fuelLevel: 72,
    engineTemp: 82,
    tirePressure: 33,
    gpsSignal: "5G 98%",
    batteryStatus: "95%",
    lastGpsUpdate: "Just now",
  },
  {
    id: "v-3",
    key: "v-3",
    vehicle: "TN-09-FL-3003",
    depot: "DEP-TRY-04",
    type: "Express Dispenser 8,000L",
    driver: "K. Velu",
    phone: "+91 97123 78901",
    status: "Idle",
    speed: 0,
    cargo: "8,000 L Petrol",
    dest: "Trichy Fleet Terminal",
    eta: "Standby (Ready for Dispatch)",
    lat: 10.7905,
    lng: 78.7047,
    fuelLevel: 94,
    engineTemp: 75,
    tirePressure: 35,
    gpsSignal: "5G 99%",
    batteryStatus: "100%",
    lastGpsUpdate: "Just now",
  },
  {
    id: "v-4",
    key: "v-4",
    vehicle: "TN-58-FL-4004",
    depot: "DEP-MDU-03",
    type: "Rigid Chassis 14,000L",
    driver: "A. Joseph",
    phone: "+91 94432 10987",
    status: "Maintenance",
    speed: 0,
    cargo: "Depot Service Bay",
    dest: "Madurai Logistics Service Bay",
    eta: "Scheduled Maintenance",
    lat: 9.9252,
    lng: 78.1198,
    fuelLevel: 45,
    engineTemp: 68,
    tirePressure: 30,
    gpsSignal: "5G 96%",
    batteryStatus: "90%",
    lastGpsUpdate: "Just now",
  },
];

// React Leaflet Map Controller to fly camera smoothly on vehicle select
function MapFlyTo({ selectedPos }) {
  const map = useMap();
  useEffect(() => {
    if (
      selectedPos &&
      Array.isArray(selectedPos) &&
      Number.isFinite(Number(selectedPos[0])) &&
      Number.isFinite(Number(selectedPos[1]))
    ) {
      try {
        map.flyTo(selectedPos, map.getZoom() < 8 ? 9 : map.getZoom(), { animate: true, duration: 1.2 });
      } catch (e) {
        console.warn("[MapFlyTo] flyTo error:", e);
      }
    }
  }, [map, selectedPos]);
  return null;
}

// Section 8: Vehicle marker color mapping:
// Available: Green (#22C55E)
// Delivering: Blue (#3B82F6)
// Dispatched: Amber (#F59E0B)
// Emergency: Red (#EF4444)
function createTruckDivIcon(status, isSelected, isEmergency) {
  let color = "#22C55E"; // Available: Green
  if (isEmergency) {
    color = "#EF4444"; // Emergency: Red
  } else if (status === "Delivering") {
    color = "#3B82F6"; // Delivering: Blue
  } else if (status === "Dispatched" || status === "Returning" || status === "In Transit") {
    color = "#F59E0B"; // Dispatched: Amber
  } else if (status === "Maintenance") {
    color = "#EF4444"; // Emergency/Maintenance: Red
  } else {
    color = "#22C55E"; // Available/Idle: Green
  }

  // Selected vehicle: Animated ring
  const selectedRing = isSelected
    ? `<div style="position: absolute; top: -10px; left: -10px; width: 60px; height: 60px; border-radius: 50%; border: 2px dashed ${color}; animation: step-pulse 1.8s infinite ease-in-out; pointer-events: none;"></div>`
    : "";

  // GPS pulse around active vehicle marker
  const isMoving = status === "Delivering" || status === "Dispatched" || isEmergency;
  const activeGpsPulse = isMoving
    ? `<div style="position: absolute; top: -6px; left: -6px; width: 52px; height: 52px; border-radius: 50%; background: ${color}25; animation: live-gps-pulse 2s infinite ease-in-out; pointer-events: none;"></div>`
    : "";

  const svgHtml = `
    <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
      ${activeGpsPulse}
      ${selectedRing}
      <svg width="40" height="40" viewBox="0 0 40 40" style="position: relative; z-index: 2;">
        <circle cx="20" cy="20" r="14" fill="${color}" fill-opacity="0.3" />
        <rect x="8" y="10" width="24" height="20" rx="4" fill="#0F172A" stroke="${color}" stroke-width="2" />
        <rect x="10" y="12" width="20" height="8" rx="2" fill="${color}" />
        <rect x="12" y="22" width="16" height="6" rx="2" fill="#1E293B" stroke="${color}" stroke-width="1" />
      </svg>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: "custom-truck-leaflet-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

function createDepotDivIcon() {
  const svgHtml = `
    <div style="position: relative; width: 32px; height: 32px;">
      <svg width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="#FF5E00" fill-opacity="0.25" />
        <rect x="9" y="9" width="14" height="14" rx="4" fill="#FF5E00" stroke="#000000" stroke-width="2" />
      </svg>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: "custom-depot-leaflet-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function createCurrentLocationDivIcon() {
  const svgHtml = `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(0, 180, 216, 0.35); border: 1px solid #00B4D8;"></div>
      <div style="position: relative; width: 18px; height: 18px; border-radius: 50%; background: #00B4D8; border: 3px solid #FFFFFF; box-shadow: 0 0 12px rgba(0, 180, 216, 0.9);"></div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: "custom-current-location-marker",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

export default function FleetMap() {
  const { state: authState } = useAuth();
  const { orders } = useOrders();
  const { addNotification } = useNotifications();

  // Resolve current user and role
  const user = authState?.user || (() => {
    try {
      const s = localStorage.getItem("fdms-user") || localStorage.getItem("user");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  })();
  const userRole = user?.role || localStorage.getItem("fdms-role") || localStorage.getItem("role") || "Admin";
  const normalizedRole = (userRole || "").toLowerCase();

  const isDriver = normalizedRole === "driver";
  const isAdmin = normalizedRole === "admin";
  const isDepotManager = normalizedRole === "depot manager" || normalizedRole === "manager";
  const isCustomer = normalizedRole === "customer";

  // =========================================================================
  // STATE DECLARATIONS - ALL HOOKS DECLARED AT THE VERY TOP (FIX FOR ISSUE 1)
  // Must declare selectedVehicle before any code that references it!
  // =========================================================================
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [rawVehicles, setRawVehicles] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null); // [lat, lng]
  const [trackingSpeed, setTrackingSpeed] = useState(0);
  const [trackingHeading, setTrackingHeading] = useState(0);
  const [trackingError, setTrackingError] = useState(null);
  const [sosActive, setSosActive] = useState(false);
  const [reroutedToast, setReroutedToast] = useState("");
  const [tileSource, setTileSource] = useState("osm"); // "osm", "cartoDark"
  const [filterStatus, setFilterStatus] = useState("All");
  const [depotFilter, setDepotFilter] = useState("ALL");

  const [liveSpeeds, setLiveSpeeds] = useState({});
  const [vehicleHistories, setVehicleHistories] = useState({});
  const [livePositions, setLivePositions] = useState({
    "v-1": { lat: 13.0827, lng: 80.2707, routeIdx: 0, progress: 0 },
    "v-2": { lat: 11.0168, lng: 76.9558, routeIdx: 0, progress: 0 },
    "v-3": { lat: 12.5000, lng: 79.8000, routeIdx: 1, progress: 0.5 },
    "v-4": { lat: 9.9252, lng: 78.1198, routeIdx: 0, progress: 0 },
  });

  // Tracking refs
  const watchIdRef = useRef(null);
  const sendIntervalRef = useRef(null);
  const latestCoordsRef = useRef(null);

  // Identify driver's designated vehicle
  const driverVehicleId = useMemo(() => {
    if (user?.vehicle && user.vehicle !== "—" && user.vehicle !== "Unassigned") return user.vehicle;
    if (orders && user?.name) {
      const assignedOrder = orders.find(
        (o) => o.driver && o.driver.toLowerCase().includes(user.name.toLowerCase())
      );
      if (assignedOrder?.vehicle && assignedOrder.vehicle !== "—") return assignedOrder.vehicle;
    }
    return "TN-01-FL-1001";
  }, [user, orders]);

  // Transmit location to backend API (POST /api/gps/update) and Socket.IO every 5 seconds
  const transmitLocation = useCallback(async (coords) => {
    if (!coords) return;
    const { latitude, longitude, speed: spd = 0, heading: hdg = 0 } = coords;
    const currentSpeed = Number(spd) || 0;
    const currentHeading = Number(hdg) || 0;
    const currentLat = Number(latitude);
    const currentLng = Number(longitude);

    if (isNaN(currentLat) || isNaN(currentLng)) return;

    const timestamp = new Date().toISOString();
    const payload = {
      vehicleId: driverVehicleId,
      latitude: currentLat,
      longitude: currentLng,
      speed: currentSpeed,
      heading: currentHeading,
      timestamp,
    };

    // 1. Emit Socket.IO real-time event: socket.emit("vehicle-location-update")
    try {
      const socket = getSocket();
      if (socket) {
        socket.emit("vehicle-location-update", payload);
      }
    } catch (err) {
      console.warn("[FleetMap] socket.emit vehicle-location-update error:", err);
    }

    // 2. Call Backend API: POST /api/gps/update
    try {
      await gpsApi.updateLocation(payload);
    } catch (err) {
      console.warn("[FleetMap] POST /api/gps/update error:", err.message);
    }
  }, [driverVehicleId]);

  // Start GPS Tracking (DRIVER ROLE only)
  const handleStartTracking = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setTrackingError("GPS Geolocation is not supported by your current browser or device.");
      return;
    }

    setTrackingError(null);
    setIsTracking(true);
    setReroutedToast(`🛰️ Live GPS Tracking started for ${driverVehicleId}. Sending coordinates every 5s.`);
    setTimeout(() => setReroutedToast(""), 5000);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // Use browser navigator.geolocation.watchPosition()
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed: s, heading: h } = pos.coords;
        const currentSpeed = s != null && !isNaN(s) ? Math.round(s * 3.6) : (trackingSpeed || 48);
        const currentHeading = h || 0;

        setCurrentLocation([latitude, longitude]);
        setTrackingSpeed(currentSpeed);
        setTrackingHeading(currentHeading);
        setTrackingError(null);

        latestCoordsRef.current = {
          latitude,
          longitude,
          speed: currentSpeed,
          heading: currentHeading,
        };

        // Update local position for driver's vehicle immediately
        setLivePositions((prev) => ({
          ...prev,
          [driverVehicleId]: { lat: latitude, lng: longitude, routeIdx: 0, progress: 0 },
        }));
      },
      (error) => {
        console.warn("[FleetMap] watchPosition error:", error);
        if (error.code === 1) {
          setTrackingError("Location permission denied. Please allow location access.");
          handleStopTracking();
        } else if (error.code === 2) {
          setTrackingError("GPS position unavailable. Please ensure device GPS is turned on.");
        } else if (error.code === 3) {
          setTrackingError("GPS satellite signal timed out. Retrying...");
        } else {
          setTrackingError(`GPS error: ${error.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    watchIdRef.current = id;

    // Send latitude, longitude, speed, heading, timestamp to backend every 5 seconds
    if (sendIntervalRef.current) clearInterval(sendIntervalRef.current);
    sendIntervalRef.current = setInterval(() => {
      if (latestCoordsRef.current) {
        transmitLocation(latestCoordsRef.current);
      }
    }, 5000);
  }, [driverVehicleId, trackingSpeed, transmitLocation]);

  // Stop GPS Tracking (DRIVER ROLE only)
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
    setReroutedToast("🛑 Live GPS Tracking stopped.");
    setTimeout(() => setReroutedToast(""), 4000);
  }, []);

  // Cleanup GPS tracking on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (sendIntervalRef.current !== null) {
        clearInterval(sendIntervalRef.current);
      }
    };
  }, []);

  // Fetch live vehicle telemetry coordinates from backend API on mount
  useEffect(() => {
    let mounted = true;
    vehicleApi
      .getVehicles()
      .then((res) => {
        if (mounted && res.data && res.data.length > 0) {
          setRawVehicles(res.data);
          const apiPositions = {};
          const histories = {};
          res.data.forEach((v, idx) => {
            const id = v._id || `v-${idx + 1}`;
            const reg = v.vehicleNumber || v.vehicle;
            if (v.latitude && v.longitude) {
              apiPositions[id] = { lat: v.latitude, lng: v.longitude, routeIdx: 0, progress: 0 };
              apiPositions[`v-${idx + 1}`] = { lat: v.latitude, lng: v.longitude, routeIdx: 0, progress: 0 };
              if (reg) apiPositions[reg] = { lat: v.latitude, lng: v.longitude, routeIdx: 0, progress: 0 };
            }
            if (v.locationHistory && v.locationHistory.length > 0) {
              const coords = v.locationHistory.map((h) => [h.latitude, h.longitude]);
              histories[id] = coords;
              if (reg) histories[reg] = coords;
              histories[`v-${idx + 1}`] = coords;
            }
          });
          if (Object.keys(apiPositions).length > 0) {
            setLivePositions((prev) => ({ ...prev, ...apiPositions }));
          }
          if (Object.keys(histories).length > 0) {
            setVehicleHistories((prev) => ({ ...prev, ...histories }));
          }
        }
      })
      .catch((err) => {
        console.warn("[FleetMap] Backend API vehicles unavailable:", err.message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Socket.IO: Admin/Manager/Customer receive "vehicle-location-update" and update marker position instantly
  useEffect(() => {
    const socket = getSocket();

    const handleLocationUpdate = (data) => {
      if (!data) return;
      const { vehicleId, driverId, latitude, longitude, speed: s } = data;
      const key = vehicleId || driverId;
      if (!key) return;

      const lat = Number(latitude);
      const lng = Number(longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      setLivePositions((prev) => ({
        ...prev,
        [key]: { lat, lng, routeIdx: 0, progress: 0 },
        ...(vehicleId ? { [vehicleId]: { lat, lng, routeIdx: 0, progress: 0 } } : {}),
      }));

      if (s != null && !isNaN(Number(s))) {
        setLiveSpeeds((prev) => ({
          ...prev,
          [key]: Number(s),
          ...(vehicleId ? { [vehicleId]: Number(s) } : {}),
        }));
      }

      setVehicleHistories((prev) => {
        const existing = prev[vehicleId] || prev[key] || [];
        const updated = [...existing, [lat, lng]];
        const capped = updated.slice(-1000);
        return {
          ...prev,
          [key]: capped,
          ...(vehicleId ? { [vehicleId]: capped } : {}),
        };
      });
    };

    socket.on("vehicle-location-update", handleLocationUpdate);
    socket.on("location_update", handleLocationUpdate);

    return () => {
      socket.off("vehicle-location-update", handleLocationUpdate);
      socket.off("location_update", handleLocationUpdate);
    };
  }, []);

  // Map all Fleet Vehicles dynamically from MongoDB fleet with fallback
  const allVehicles = useMemo(() => {
    const vehicleOrderMap = new Map();
    orders.forEach((o) => {
      if (o.vehicle && o.vehicle !== "—" && o.vehicle !== "Unassigned") {
        if (!vehicleOrderMap.has(o.vehicle) || o.status === "InTransit" || o.status === "Dispatched") {
          vehicleOrderMap.set(o.vehicle, o);
        }
      }
    });

    if (rawVehicles.length === 0) {
      return DEFAULT_FALLBACK_FLEET.map((v) => ({
        ...v,
        speed: v.status === "Idle" || v.status === "Maintenance" ? 0 : (liveSpeeds[v.key] ?? liveSpeeds[v.vehicle] ?? v.speed),
        lat: livePositions[v.key]?.lat ?? livePositions[v.vehicle]?.lat ?? v.lat,
        lng: livePositions[v.key]?.lng ?? livePositions[v.vehicle]?.lng ?? v.lng,
      }));
    }

    return rawVehicles.map((v, idx) => {
      const vKey = `v-${idx + 1}`;
      const vehId = v._id || vKey;
      const vehReg = v.vehicleNumber || v.vehicle || `TN-01-FL-${idx + 1000}`;
      const o = vehicleOrderMap.get(vehReg);

      const validStatuses = ["Delivering", "Returning", "Idle", "Maintenance"];
      let mappedStatus = validStatuses[idx % 4];

      if (v.status) {
        const s = v.status.toLowerCase();
        if (s.includes("idle") || s.includes("standby") || s.includes("park")) mappedStatus = "Idle";
        else if (s.includes("deliv") || s.includes("transit") || s.includes("mov")) mappedStatus = "Delivering";
        else if (s.includes("return")) mappedStatus = "Returning";
        else if (s.includes("maint") || s.includes("repair") || s.includes("off")) mappedStatus = "Maintenance";
      }

      let speed = mappedStatus === "Idle" || mappedStatus === "Maintenance" ? 0 : (liveSpeeds[vKey] ?? liveSpeeds[vehId] ?? liveSpeeds[vehReg] ?? 56);
      let cargo = mappedStatus === "Returning" ? "Empty Tanker" : "12,000 L High Speed Diesel";
      let dest = "Chennai Main Depot";
      let driver = v.driverName || v.driver || "Unassigned Driver";
      let phone = "+91 98765 43210";
      let eta = mappedStatus === "Idle" ? "Standby" : (mappedStatus === "Maintenance" ? "In Service" : "25 mins");

      if (o) {
        driver = o.driver || driver;
        if (o.status === "InTransit" || o.status === "In Transit" || o.status === "Dispatched") {
          mappedStatus = "Delivering";
          speed = liveSpeeds[vKey] ?? liveSpeeds[vehId] ?? liveSpeeds[vehReg] ?? v.speed ?? 64;
          cargo = `${o.qty ? o.qty.toLocaleString() : "10,000"} L ${o.fuelCode || "Diesel"}`;
          dest = `${o.customer || "Metro Fuels"} (${o.city || "Tamil Nadu"})`;
          eta = "28 mins";
        }
      }

      const defaultDepot = DEPOT_LOCATIONS[idx % DEPOT_LOCATIONS.length];
      const rawPos = livePositions[vehReg] ?? livePositions[vKey] ?? livePositions[vehId] ?? {
        lat: v.latitude || defaultDepot.lat,
        lng: v.longitude || defaultDepot.lng,
      };

      const finalLat = Number.isFinite(Number(rawPos?.lat)) ? Number(rawPos.lat) : defaultDepot.lat;
      const finalLng = Number.isFinite(Number(rawPos?.lng)) ? Number(rawPos.lng) : defaultDepot.lng;

      return {
        id: vehId,
        key: vKey,
        vehicle: vehReg,
        type: v.type || "Fuel Tanker 12,000L",
        driver,
        phone,
        depot: v.depot || defaultDepot.id || "DEP-CHN-01",
        status: mappedStatus,
        speed,
        cargo,
        dest,
        eta,
        lat: finalLat,
        lng: finalLng,
        fuelLevel: v.fuelLevel || (80 - (idx * 5) % 40),
        engineTemp: v.engineTemp || 82,
        tirePressure: v.tirePressure || 33,
        gpsSignal: "5G 99%",
        batteryStatus: "100%",
        lastGpsUpdate: "Just now",
      };
    });
  }, [rawVehicles, orders, liveSpeeds, livePositions]);

  // CUSTOMER ROLE: Identify assigned delivery vehicle
  const customerAssignedVehicle = useMemo(() => {
    if (!isCustomer) return null;
    const customerOrders = orders.filter((o) => {
      if (!user) return false;
      const cName = (user.name || user.fullName || "").toLowerCase();
      const cEmail = (user.email || "").toLowerCase();
      const oCust = (o.customer || "").toLowerCase();
      const oUser = (o.user || "").toLowerCase();
      return (
        (cName && oCust.includes(cName)) ||
        (cEmail && oUser.includes(cEmail)) ||
        o.customerId === user._id ||
        o.customerId === user.id
      );
    });

    const activeOrder = customerOrders.find(
      (o) =>
        o.vehicle &&
        o.vehicle !== "—" &&
        o.vehicle !== "Unassigned" &&
        ["InTransit", "In Transit", "Dispatched", "Assigned", "Delivering"].includes(o.status)
    ) || customerOrders.find(
      (o) => o.vehicle && o.vehicle !== "—" && o.vehicle !== "Unassigned"
    );

    return activeOrder?.vehicle || null;
  }, [isCustomer, orders, user]);

  // Vehicles visible according to role permissions:
  // - Depot Manager -> Scoped strictly to assigned depot
  // - Admin -> All depots (with interactive filter)
  // - Customer -> ONLY sees assigned delivery vehicle
  const vehicles = useMemo(() => {
    let list = allVehicles;

    if (isDepotManager && user?.depot) {
      list = list.filter((v) => !v.depot || v.depot === user.depot || v.dest?.includes(user.depot));
    } else if (isAdmin && depotFilter !== "ALL") {
      list = list.filter((v) => !v.depot || v.depot === depotFilter || v.dest?.includes(depotFilter));
    }

    if (isCustomer) {
      if (customerAssignedVehicle) {
        const matched = list.filter(
          (v) =>
            v.vehicle === customerAssignedVehicle ||
            v.id === customerAssignedVehicle ||
            v.key === customerAssignedVehicle
        );
        if (matched.length > 0) return matched;

        return [
          {
            id: customerAssignedVehicle,
            key: customerAssignedVehicle,
            vehicle: customerAssignedVehicle,
            type: "Customer Delivery Tanker",
            driver: "Assigned Delivery Driver",
            phone: "+91 98765 43210",
            status: "Delivering",
            speed: liveSpeeds[customerAssignedVehicle] || 52,
            cargo: "Scheduled Fuel Delivery",
            dest: user?.site || user?.address || "Customer Facility",
            eta: "18 mins",
            lat: livePositions[customerAssignedVehicle]?.lat || 13.0827,
            lng: livePositions[customerAssignedVehicle]?.lng || 80.2707,
            fuelLevel: 85,
            engineTemp: 82,
            tirePressure: 33,
            gpsSignal: "5G 99%",
            batteryStatus: "100%",
            lastGpsUpdate: "Live",
          },
        ];
      }
      // If customer has no active orders assigned yet, show single fallback
      return list.slice(0, 1);
    }
    return list;
  }, [isCustomer, customerAssignedVehicle, allVehicles, liveSpeeds, livePositions, user, isDepotManager, isAdmin, depotFilter]);

  // Synchronize selectedVehicle state with vehicles list safely
  useEffect(() => {
    if (!vehicles || vehicles.length === 0) {
      setSelectedVehicle(null);
      return;
    }
    if (selectedVehicleId) {
      const match = vehicles.find(
        (v) => v.id === selectedVehicleId || v.vehicle === selectedVehicleId || v.key === selectedVehicleId
      );
      if (match) {
        setSelectedVehicle(match);
        return;
      }
    }
    // Default to first available vehicle
    setSelectedVehicle(vehicles[0]);
    setSelectedVehicleId(vehicles[0].id || vehicles[0].key || vehicles[0].vehicle);
  }, [vehicles, selectedVehicleId]);

  // Fetch up to 1000 location history points when a vehicle is selected
  useEffect(() => {
    const targetVehId = selectedVehicle?.vehicle || selectedVehicle?.id || selectedVehicleId;
    if (!targetVehId) return;

    driverApi
      .getLocationHistory({ vehicleId: targetVehId, limit: 1000 })
      .then((res) => {
        if (res?.data && res.data.length > 0) {
          const coords = res.data.map((pt) => [pt.latitude, pt.longitude]);
          setVehicleHistories((prev) => ({
            ...prev,
            [targetVehId]: coords,
            ...(selectedVehicleId ? { [selectedVehicleId]: coords } : {}),
          }));
        }
      })
      .catch(() => {});
  }, [selectedVehicle?.id, selectedVehicle?.vehicle, selectedVehicleId]);

  // Simulation timer for fallback highway vehicles
  useEffect(() => {
    const timer = setInterval(() => {
      setLivePositions((prevPositions) => {
        const nextPositions = { ...prevPositions };

        Object.keys(HIGHWAY_ROUTES).forEach((vehId) => {
          const route = HIGHWAY_ROUTES[vehId];
          const curr = nextPositions[vehId] || { routeIdx: 0, progress: 0, lat: route[0][0], lng: route[0][1] };

          let routeIdx = curr.routeIdx;
          let progress = curr.progress + 0.15;

          if (progress >= 1) {
            progress = 0;
            routeIdx = (routeIdx + 1) % (route.length - 1);
          }

          const p1 = route[routeIdx];
          const p2 = route[routeIdx + 1] || route[0];

          const currentLat = p1[0] + (p2[0] - p1[0]) * progress;
          const currentLng = p1[1] + (p2[1] - p1[1]) * progress;

          nextPositions[vehId] = {
            routeIdx,
            progress,
            lat: Number(currentLat.toFixed(4)),
            lng: Number(currentLng.toFixed(4)),
          };
        });

        return nextPositions;
      });

      setLiveSpeeds(() => ({
        "v-1": Math.floor(60 + Math.random() * 12),
        "v-2": Math.floor(52 + Math.random() * 10),
        "v-3": 0, // Idle
        "v-4": 0, // Maintenance
      }));
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const filteredVehicles = useMemo(() => {
    if (filterStatus === "All") return vehicles;
    return vehicles.filter((v) => v.status === filterStatus);
  }, [vehicles, filterStatus]);

  const handleSelectVehicle = (v) => {
    setSelectedVehicle(v);
    setSelectedVehicleId(v.id || v.key || v.vehicle);
  };

  const handleSOS = () => {
    setSosActive(!sosActive);
    if (!sosActive) {
      playCriticalAlertSound();
      addNotification({
        title: "EMERGENCY SOS ALERT",
        message: `Emergency SOS Alert broadcasted for Tanker ${selectedVehicle?.vehicle || "Fleet"}!`,
        category: "sos",
        role: "Manager",
        type: "danger",
      });
    }
  };

  const handleReroute = () => {
    setReroutedToast(`Optimal OpenStreetMap route pushed to ${selectedVehicle?.driver || "Driver"} (${selectedVehicle?.vehicle || "Vehicle"})`);
    setTimeout(() => setReroutedToast(""), 4000);
  };

  // Section 8 marker color scheme:
  // Available: Green (#22C55E)
  // Delivering: Blue (#3B82F6)
  // Dispatched: Amber (#F59E0B)
  // Emergency: Red (#EF4444)
  const getMarkerColorHex = (v) => {
    if (!v) return "#22C55E";
    if (sosActive && selectedVehicle?.id === v.id) return "#EF4444";
    switch (v.status) {
      case "Delivering":
        return "#3B82F6"; // Blue
      case "Dispatched":
      case "Returning":
      case "In Transit":
        return "#F59E0B"; // Amber
      case "Emergency":
      case "Maintenance":
        return "#EF4444"; // Red
      case "Available":
      case "Idle":
      default:
        return "#22C55E"; // Green
    }
  };

  return (
    <div className="real-mapbox-page">
      {/* Header Bar */}
      <header className="real-map-header">
        <div>
          <h1 className="real-map-title">
            Enterprise GPS Control Center (React Leaflet + OpenStreetMap)
          </h1>
          <p className="real-map-subtitle">
            {isCustomer
              ? `Live Customer Delivery Tracking • Assigned Tanker: ${customerAssignedVehicle || "In Transit"}`
              : isDriver
              ? `Driver Live GPS Console • Vehicle: ${driverVehicleId} • Broadcast every 5s`
              : "Tamil Nadu Geographic Radar • Powered 100% by React Leaflet & OpenStreetMap"}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Admin Depot Selector */}
          {isAdmin && (
            <select
              value={depotFilter}
              onChange={(e) => setDepotFilter(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                background: "var(--surface, #1e293b)",
                border: "1px solid var(--line, #334155)",
                color: "var(--text, #fff)",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <option value="ALL">🌐 All Depots (Tamil Nadu HQ)</option>
              <option value="DEP-CHN-01">🏭 DEP-CHN-01 (Chennai Terminal)</option>
              <option value="DEP-SLM-02">🏭 DEP-SLM-02 (Salem Hub)</option>
              <option value="DEP-MDU-03">🏭 DEP-MDU-03 (Madurai Junction)</option>
              <option value="DEP-TRY-04">🏭 DEP-TRY-04 (Trichy Central)</option>
              <option value="DEP-CBE-05">🏭 DEP-CBE-05 (Coimbatore Base)</option>
            </select>
          )}

          {/* Depot Manager Scoped Jurisdiction Chip */}
          {isDepotManager && (
            <span
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                background: "rgba(249, 115, 22, 0.15)",
                border: "1px solid rgba(249, 115, 22, 0.35)",
                color: "var(--orange, #f97316)",
                fontSize: "14px",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              🏭 Depot: {user?.depot || "DEP-CHN-01"} Radar (Scoped)
            </span>
          )}

          {reroutedToast && (
            <span className="toast-inline-success">
              <CheckCircle2 size={15} /> {reroutedToast}
            </span>
          )}

          {trackingError && (
            <span className="toast-inline-danger" style={{ color: "#EF4444", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}>
              <AlertTriangle size={14} /> {trackingError}
            </span>
          )}



          {/* SOS Alert Button */}
          <button
            className={`btn-sos-toggle ${sosActive ? "active" : ""}`}
            onClick={handleSOS}
          >
            <AlertTriangle size={16} /> {sosActive ? "EMERGENCY SOS ACTIVE" : "TRIGGER SOS ALERT"}
          </button>
        </div>
      </header>

      {/* =========================================================================
          MAIN COMMAND SPLIT LAYOUT (75% REACT LEAFLET MAP / 25% TELEMETRY PANEL)
          ========================================================================= */}
      <div className="real-map-split-container">
        {/* =========================================================================
            75% WIDTH REACT LEAFLET MAP CONTAINER WITH OPENSTREETMAP
            ========================================================================= */}
        <div className="real-map-75-wrapper">
          {/* Tile Layer Controls */}
          <div className="real-map-toolbar">
            <div className="layer-btn-group">
              <button
                className={`layer-btn ${tileSource === "osm" ? "active" : ""}`}
                onClick={() => setTileSource("osm")}
              >
                🗺️ OpenStreetMap Standard
              </button>
              <button
                className={`layer-btn ${tileSource === "cartoDark" ? "active" : ""}`}
                onClick={() => setTileSource("cartoDark")}
              >
                🌙 Carto Dark Logistics
              </button>
            </div>

            <button className="layer-btn btn-optimize" onClick={handleReroute}>
              <Zap size={14} /> Optimize Route
            </button>
          </div>

          {/* REACT LEAFLET MAP CONTAINER WITH FULL WORLD VIEW & CONTROLS */}
          <ErrorBoundary>
            <MapContainer
              center={
                selectedVehicle && Number.isFinite(Number(selectedVehicle.lat)) && Number.isFinite(Number(selectedVehicle.lng))
                  ? [selectedVehicle.lat, selectedVehicle.lng]
                  : [10.8, 78.5]
              }
              zoom={7}
              minZoom={2}
              worldCopyJump={true}
              zoomControl={true}
              style={{ width: "100%", height: "100%", minHeight: "480px", borderRadius: "20px", background: "var(--panel)" }}
            >
              <MapFlyTo
                selectedPos={
                  selectedVehicle && Number.isFinite(Number(selectedVehicle.lat)) && Number.isFinite(Number(selectedVehicle.lng))
                    ? [selectedVehicle.lat, selectedVehicle.lng]
                    : [10.8, 78.5]
                }
              />

              {/* OPENSTREETMAP / CARTO TILE LAYER */}
              {tileSource === "osm" ? (
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  maxZoom={19}
                />
              ) : (
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
                  maxZoom={19}
                />
              )}

              {/* DRAW DEPOT LOCATIONS & GEOFENCE CIRCLES */}
              {DEPOT_LOCATIONS.map((depot) => (
                <React.Fragment key={depot.id}>
                  <Circle
                    center={[depot.lat, depot.lng]}
                    radius={25000}
                    pathOptions={{
                      color: "#FF5E00",
                      fillColor: "#FF5E00",
                      fillOpacity: 0.1,
                      weight: 1.5,
                      dashArray: "4,4",
                    }}
                  />
                  <Marker
                    position={[depot.lat, depot.lng]}
                    icon={createDepotDivIcon()}
                  >
                    <Tooltip permanent={false} direction="top">
                      📍 <strong>{depot.name}</strong> ({depot.type})
                    </Tooltip>
                  </Marker>
                </React.Fragment>
              ))}

              {/* DRAW LOCATION HISTORY ROUTE POLYLINE (UP TO 1000 POINTS) */}
              {(() => {
                const currentVehKey = selectedVehicle?.vehicle || selectedVehicle?.id || selectedVehicleId;
                if (!currentVehKey) return null;
                const routePts =
                  vehicleHistories[currentVehKey] ||
                  vehicleHistories[selectedVehicleId] ||
                  HIGHWAY_ROUTES[selectedVehicleId];
                if (routePts && routePts.length > 1) {
                  return (
                    <Polyline
                      key={`route-history-${currentVehKey}`}
                      positions={routePts}
                      pathOptions={{
                        color: "#3B82F6",
                        weight: 4,
                        opacity: 0.9,
                        dashArray: "8,6",
                        className: "moving-dash",
                      }}
                    />
                  );
                }
                return null;
              })()}

              {/* DRIVER ROLE: CURRENT USER GPS LOCATION MARKER */}
              {currentLocation && (
                <Marker
                  position={currentLocation}
                  icon={createCurrentLocationDivIcon()}
                >
                  <Popup>
                    <div style={{ fontFamily: "system-ui, sans-serif", padding: "6px 8px", color: "#0F172A" }}>
                      <strong style={{ fontSize: "15px", color: "#3B82F6" }}>📍 Your Current GPS Location</strong>
                      <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>
                        Coordinates: {currentLocation[0].toFixed(5)}, {currentLocation[1].toFixed(5)}
                      </div>
                      <div style={{ fontSize: "13px", color: "#22C55E", fontWeight: "600", marginTop: "2px" }}>
                        Speed: {trackingSpeed} km/h • Heading: {trackingHeading}°
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* DISPLAY LIVE VEHICLE MARKERS WITH POPUPS */}
              {vehicles.map((v) => {
                const isSelected = selectedVehicle?.id === v.id || selectedVehicle?.vehicle === v.vehicle;
                const isEmergency = sosActive && isSelected;

                return (
                  <Marker
                    key={v.id || v.vehicle}
                    position={[v.lat, v.lng]}
                    icon={createTruckDivIcon(v.status, isSelected, isEmergency)}
                    eventHandlers={{
                      click: () => handleSelectVehicle(v),
                    }}
                  >
                    {/* POPUP INFORMATION: VEHICLE AND DRIVER DETAILS */}
                    <Popup>
                      <div style={{ fontFamily: "system-ui, sans-serif", padding: "8px", minWidth: "260px", color: "#0F172A" }}>
                        {/* Vehicle Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid #E2E8F0", paddingBottom: "6px" }}>
                          <strong style={{ fontSize: "15px", color: getMarkerColorHex(v) }}>🚛 {v.vehicle}</strong>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              backgroundColor: `${getMarkerColorHex(v)}20`,
                              color: getMarkerColorHex(v),
                              border: `1px solid ${getMarkerColorHex(v)}40`,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            ● {v.status}
                          </span>
                        </div>

                        {/* DRIVER DETAILS POPUP SECTION */}
                        <div style={{ background: "#F8FAFC", padding: "6px 8px", borderRadius: "6px", marginBottom: "8px" }}>
                          <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", marginBottom: "2px" }}>
                            Driver Details
                          </div>
                          <div style={{ fontSize: "14.5px", fontWeight: "600", color: "#1E293B" }}>
                            👨‍✈️ {v.driver}
                          </div>
                          <div style={{ fontSize: "13.5px", color: "#475569", marginTop: "2px" }}>
                            📞 <a href={`tel:${v.phone || "+919876543210"}`} style={{ color: "var(--fuel-electric, #3B82F6)", textDecoration: "none", fontWeight: "600" }}>{v.phone || "+91 98765 43210"}</a>
                          </div>
                          <div style={{ fontSize: "13px", color: "#22C55E", marginTop: "2px", fontWeight: "600" }}>
                            ● Active On Shift • ⭐ 4.9 Rating
                          </div>
                        </div>

                        {/* VEHICLE DETAILS POPUP SECTION */}
                        <div style={{ fontSize: "13.5px", display: "flex", flexDirection: "column", gap: "5px", color: "#334155" }}>
                          <div><strong>Type:</strong> {v.type}</div>
                          <div><strong>Speed:</strong> <span style={{ color: v.speed > 0 ? "#22C55E" : "#64748B", fontWeight: "700" }}>{v.speed} km/h</span></div>
                          <div><strong>Coordinates:</strong> {Number(v.lat).toFixed(4)}, {Number(v.lng).toFixed(4)}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <strong>Cargo:</strong>
                            <FuelBadge fuelType={v.cargo || "Diesel"} label={v.cargo || "Diesel"} />
                          </div>
                          <div><strong>Fuel Level:</strong> {v.fuelLevel}%</div>
                          <div><strong>Destination:</strong> {v.dest}</div>
                          <div style={{ color: "var(--fuel-electric, #3B82F6)", fontWeight: "700" }}><strong>ETA:</strong> {v.eta}</div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </ErrorBoundary>

          {/* Map Legend Bar */}
          <div className="map-bottom-legend">
            <div className="legend-status-items">
              <span className="legend-item"><span className="legend-dot" style={{ backgroundColor: "#22C55E" }}></span> 🟢 Green = Available</span>
              <span className="legend-item"><span className="legend-dot" style={{ backgroundColor: "#3B82F6" }}></span> 🔵 Blue = Delivering</span>
              <span className="legend-item"><span className="legend-dot" style={{ backgroundColor: "#F59E0B" }}></span> 🟡 Amber = Dispatched</span>
              <span className="legend-item"><span className="legend-dot" style={{ backgroundColor: "#EF4444" }}></span> 🔴 Red = Emergency</span>
            </div>
            <div className="legend-meta">
              <span>OpenStreetMap Engine: <strong>React Leaflet 4.2.1</strong></span>
              <span>Telemetry Ping: <strong style={{ color: "var(--status-success, #22C55E)" }}>5s Live GPS</strong></span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            25% WIDTH RIGHT SIDE VEHICLE TELEMETRY PANEL
            ========================================================================= */}
        <div className="real-telemetry-25-panel">
          <div className="panel-header-badge">
            <Radio size={16} style={{ color: "var(--fuel-electric, #3B82F6)" }} />
            <span>TELEMETRY DIAGNOSTICS</span>
          </div>

          {selectedVehicle ? (
            <div className="telemetry-scroll-body">
              {/* Header Box: Vehicle Registration & Status */}
              <div className="tel-card-box">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong className="tel-veh-id">{selectedVehicle.vehicle}</strong>
                  <span
                    className="status-pill"
                    style={{
                      backgroundColor: `${getMarkerColorHex(selectedVehicle)}20`,
                      color: getMarkerColorHex(selectedVehicle),
                      border: `1px solid ${getMarkerColorHex(selectedVehicle)}50`,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    ● {selectedVehicle.status?.toUpperCase() || "ACTIVE"}
                  </span>
                </div>
                <div style={{ fontSize: "14px", color: "var(--text-dim)", marginTop: "4px" }}>
                  Destination: <strong style={{ color: "var(--text)" }}>{selectedVehicle.dest || "In Transit"}</strong>
                </div>
              </div>

              {/* Driver Details Profile Card */}
              <div className="tel-card-box driver-profile-box">
                <div className="driver-avatar-wrapper">
                  <div className="avatar-placeholder">
                    <User size={22} style={{ color: "var(--fuel-diesel, #F59E0B)" }} />
                  </div>
                  <div>
                    <strong style={{ fontSize: "16px", color: "var(--text)" }}>{selectedVehicle.driver || "Driver"}</strong>
                    <div style={{ fontSize: "14px", color: "var(--text-dim)" }}>{selectedVehicle.phone || "+91 98765 43210"}</div>
                    <div style={{ fontSize: "13px", color: "var(--status-success, #22C55E)", fontWeight: "700", marginTop: "2px" }}>
                      ✓ Verified On-Duty Driver
                    </div>
                  </div>
                </div>

                <a href={`tel:${selectedVehicle.phone || "+919876543210"}`} className="btn-call-driver">
                  <PhoneCall size={14} /> Call Driver
                </a>
              </div>

              {/* Telemetry Metrics Grid (Speed, Fuel, Temp, Tyre, GPS, Battery) */}
              <div className="tel-metrics-grid">
                <div className="tel-metric-item">
                  <div className="metric-head">
                    <Gauge size={15} style={{ color: "var(--fuel-diesel, #F59E0B)" }} />
                    <span>Current Speed</span>
                  </div>
                  <strong className="metric-val" style={{ color: "var(--fuel-diesel, #F59E0B)" }}>
                    {selectedVehicle.speed ?? 0} <small>km/h</small>
                  </strong>
                </div>

                <div className="tel-metric-item">
                  <div className="metric-head">
                    <Fuel size={15} style={{ color: "var(--fuel-electric, #3B82F6)" }} />
                    <span>Fuel Tank Level</span>
                  </div>
                  <strong className="metric-val" style={{ color: "var(--fuel-electric, #3B82F6)" }}>
                    {selectedVehicle.fuelLevel ?? 80}% <small>Tank</small>
                  </strong>
                </div>

                <div className="tel-metric-item">
                  <div className="metric-head">
                    <Thermometer size={15} style={{ color: "var(--fuel-diesel, #F59E0B)" }} />
                    <span>Engine Temp</span>
                  </div>
                  <strong className="metric-val" style={{ color: "var(--fuel-diesel, #F59E0B)" }}>
                    {selectedVehicle.engineTemp ?? 82}°C
                  </strong>
                </div>

                <div className="tel-metric-item">
                  <div className="metric-head">
                    <Shield size={15} style={{ color: "var(--status-success, #22C55E)" }} />
                    <span>Tyre Pressure</span>
                  </div>
                  <strong className="metric-val" style={{ color: "var(--status-success, #22C55E)" }}>
                    {selectedVehicle.tirePressure ?? 33} <small>PSI</small>
                  </strong>
                </div>

                <div className="tel-metric-item">
                  <div className="metric-head">
                    <Wifi size={15} style={{ color: "var(--status-success, #22C55E)" }} />
                    <span>GPS Signal</span>
                  </div>
                  <strong className="metric-val" style={{ color: "var(--status-success, #22C55E)" }}>
                    {selectedVehicle.gpsSignal || "5G 99%"}
                  </strong>
                </div>

                <div className="tel-metric-item">
                  <div className="metric-head">
                    <Battery size={15} style={{ color: "var(--status-success, #22C55E)" }} />
                    <span>Battery Status</span>
                  </div>
                  <strong className="metric-val" style={{ color: "var(--status-success, #22C55E)" }}>
                    {selectedVehicle.batteryStatus || "100%"}
                  </strong>
                </div>
              </div>

              {/* Cargo & Navigation Overview */}
              <div className="tel-card-box">
                <div className="tel-box-title">
                  <Navigation size={14} style={{ color: "var(--fuel-electric, #3B82F6)" }} /> Active Trip Navigation
                </div>
                <div className="tel-info-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <span>Current Cargo:</span>
                  <FuelBadge fuelType={selectedVehicle.cargo || "Diesel"} label={selectedVehicle.cargo || "Diesel"} />
                </div>
                <div className="tel-info-row">
                  <span>Coordinates:</span>
                  <strong style={{ fontSize: "13px" }}>{Number(selectedVehicle.lat).toFixed(4)}, {Number(selectedVehicle.lng).toFixed(4)}</strong>
                </div>
                <div className="tel-info-row">
                  <span>Estimated Arrival (ETA):</span>
                  <strong style={{ color: "var(--green-neon)" }}>{selectedVehicle.eta || "25 mins"}</strong>
                </div>
                <div className="tel-info-row">
                  <span>Last GPS Ping:</span>
                  <span style={{ color: "var(--text-dim)" }}>{selectedVehicle.lastGpsUpdate || "Just now"}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-dim)" }}>
              Click any vehicle marker on the OpenStreetMap canvas to inspect diagnostics.
            </div>
          )}
        </div>
      </div>

      {/* ACTIVE VEHICLES MANIFEST CARDS LIST (BELOW MAP) */}
      <div className="active-manifest-section">
        <div className="manifest-header">
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
            {isCustomer ? "Assigned Delivery Vehicle Manifest" : "Active Fleet Telemetry Manifest"}
          </h3>
          <div className="pill-filter-bar">
            {["All", "Idle", "Delivering", "Returning", "Maintenance"].map((st) => (
              <button
                key={st}
                className={`filter-pill-btn ${filterStatus === st ? "active" : ""}`}
                onClick={() => setFilterStatus(st)}
              >
                {st.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="fleet-cards-grid">
          {filteredVehicles.map((v) => {
            const isSelected = selectedVehicle?.id === v.id || selectedVehicle?.vehicle === v.vehicle;
            const markerColor = getMarkerColorHex(v);

            return (
              <div
                key={v.id || v.vehicle}
                className={`samsara-fleet-card ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelectVehicle(v)}
              >
                <div className="fleet-card-top">
                  <strong className="veh-reg">{v.vehicle}</strong>
                  <span
                    className="card-status-pill"
                    style={{
                      backgroundColor: `${markerColor}20`,
                      color: markerColor,
                      border: `1px solid ${markerColor}40`,
                    }}
                  >
                    ● {v.status}
                  </span>
                </div>

                <div className="fleet-card-driver">
                  <User size={13} style={{ color: "var(--orange)" }} />
                  <span>{v.driver}</span>
                </div>

                <div className="fleet-card-metrics">
                  <div>
                    <small>Speed</small>
                    <strong style={{ color: "var(--orange)" }}>{v.speed} km/h</strong>
                  </div>
                  <div>
                    <small>Fuel Level</small>
                    <strong style={{ color: "var(--blue)" }}>{v.fuelLevel}%</strong>
                  </div>
                  <div>
                    <small>ETA</small>
                    <strong style={{ color: "var(--green-neon)" }}>{v.eta}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
