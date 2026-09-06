import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
} from "lucide-react";
import { SEED_FLEET_TELEMETRY } from "../data/seed";
import { useOrders } from "../context/OrdersContext";
import { useNotifications } from "../context/NotificationContext";
import { vehicleApi } from "../services/api";

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

// React Leaflet Map Controller to fly camera smoothly on vehicle select
function MapFlyTo({ selectedPos }) {
  const map = useMap();
  useEffect(() => {
    if (selectedPos && selectedPos[0] && selectedPos[1]) {
      map.flyTo(selectedPos, 10, { animate: true, duration: 1.2 });
    }
  }, [map, selectedPos]);
  return null;
}

// Custom Leaflet DivIcon Creators for Truck & Depot Markers
function createTruckDivIcon(status, isSelected, isEmergency) {
  let color = "#00B4D8"; // Blue (Returning)
  if (isEmergency) {
    color = "#FF0055"; // Red (Emergency)
  } else if (status === "Moving") {
    color = "#10B981"; // Green (Moving)
  } else if (status === "Delivering") {
    color = "#FF5E00"; // Orange (Delivering)
  }

  const pulseRing = isSelected
    ? `<circle cx="20" cy="20" r="18" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="4,4" class="leaflet-pulse-ring"/>`
    : "";

  const svgHtml = `
    <div style="position: relative; width: 40px; height: 40px;">
      <svg width="40" height="40" viewBox="0 0 40 40">
        ${pulseRing}
        <circle cx="20" cy="20" r="14" fill="${color}" fill-opacity="0.3" />
        <rect x="8" y="10" width="24" height="20" rx="4" fill="#0B0F19" stroke="${color}" stroke-width="2" />
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
  });
}

export default function FleetMap() {
  const { orders } = useOrders();
  const { addNotification } = useNotifications();

  // State
  const [selectedVehicleId, setSelectedVehicleId] = useState("v-1");
  const [sosActive, setSosActive] = useState(false);
  const [reroutedToast, setReroutedToast] = useState("");
  const [tileSource, setTileSource] = useState("osm"); // "osm", "cartoDark"
  const [filterStatus, setFilterStatus] = useState("All");

  const [liveSpeeds, setLiveSpeeds] = useState({});
  const [livePositions, setLivePositions] = useState({
    "v-1": { lat: 13.0827, lng: 80.2707, routeIdx: 0, progress: 0 },
    "v-2": { lat: 11.0168, lng: 76.9558, routeIdx: 0, progress: 0 },
    "v-3": { lat: 12.5000, lng: 79.8000, routeIdx: 1, progress: 0.5 },
    "v-4": { lat: 9.9252, lng: 78.1198, routeIdx: 0, progress: 0 },
  });

  // Fetch live vehicle telemetry coordinates from backend API on mount
  useEffect(() => {
    let mounted = true;
    vehicleApi
      .getVehicles()
      .then((res) => {
        if (mounted && res.data && res.data.length > 0) {
          const apiPositions = {};
          res.data.forEach((v, idx) => {
            const id = v._id || `v-${idx + 1}`;
            if (v.latitude && v.longitude) {
              apiPositions[id] = { lat: v.latitude, lng: v.longitude, routeIdx: 0, progress: 0 };
            }
          });
          if (Object.keys(apiPositions).length > 0) {
            setLivePositions((prev) => ({ ...prev, ...apiPositions }));
          }
        }
      })
      .catch((err) => {
        console.warn("[FleetMap] Backend API vehicles unavailable, using default telemetry:", err.message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Map Fleet Vehicles mapping
  const vehicles = useMemo(() => {
    const vehicleOrderMap = new Map();
    orders.forEach((o) => {
      if (o.vehicle && o.vehicle !== "—" && o.vehicle !== "Unassigned") {
        if (!vehicleOrderMap.has(o.vehicle) || o.status === "InTransit" || o.status === "Dispatched") {
          vehicleOrderMap.set(o.vehicle, o);
        }
      }
    });

    return SEED_FLEET_TELEMETRY.map((v) => {
      const o = vehicleOrderMap.get(v.vehicle);
      let mappedStatus = "Returning"; // Default Blue
      let speed = 0;
      let cargo = "Empty Tanker";
      let dest = "Chennai Main Depot";
      let driver = v.driver;
      let phone = "+91 98765 43210";
      let eta = "18 mins";

      if (o) {
        driver = o.driver || v.driver;
        if (o.status === "InTransit") {
          mappedStatus = "Moving"; // Green
          speed = liveSpeeds[v.id] || v.speed || 68;
          cargo = `${o.qty.toLocaleString()} L ${o.fuelCode}`;
          dest = `${o.customer} (${o.city})`;
          eta = "28 mins";
        } else if (o.status === "Dispatched") {
          mappedStatus = "Delivering"; // Orange
          speed = 0;
          cargo = `${o.qty.toLocaleString()} L ${o.fuelCode}`;
          dest = `${o.customer} (${o.city})`;
          eta = "45 mins";
        }
      }

      const pos = livePositions[v.id] || { lat: v.lat || 13.0827, lng: v.lng || 80.2707 };

      return {
        ...v,
        driver,
        phone,
        status: mappedStatus,
        speed,
        cargo,
        dest,
        eta,
        lat: pos.lat,
        lng: pos.lng,
        fuelLevel: v.fuelLevel || 85,
        engineTemp: v.engineTemp || 84,
        tirePressure: v.tirePressure || 32,
        gpsSignal: "5G 99%",
        batteryStatus: "100%",
        lastGpsUpdate: "Just now",
      };
    });
  }, [orders, liveSpeeds, livePositions]);

  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId || v.vehicle === selectedVehicleId) || vehicles[0];
  }, [vehicles, selectedVehicleId]);

  // LIVE MOVEMENT SIMULATION USING setInterval (TRUCK MOVEMENT SIMULATION)
  useEffect(() => {
    const timer = setInterval(() => {
      setLivePositions((prevPositions) => {
        const nextPositions = { ...prevPositions };

        Object.keys(HIGHWAY_ROUTES).forEach((vehId) => {
          const route = HIGHWAY_ROUTES[vehId];
          const curr = nextPositions[vehId] || { routeIdx: 0, progress: 0, lat: route[0][0], lng: route[0][1] };

          let routeIdx = curr.routeIdx;
          let progress = curr.progress + 0.12;

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
        "v-1": Math.floor(62 + Math.random() * 12),
        "v-2": Math.floor(58 + Math.random() * 10),
        "v-3": Math.floor(65 + Math.random() * 14),
        "v-4": Math.floor(60 + Math.random() * 8),
      }));
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const filteredVehicles = useMemo(() => {
    if (filterStatus === "All") return vehicles;
    return vehicles.filter((v) => v.status === filterStatus);
  }, [vehicles, filterStatus]);

  const handleSOS = () => {
    setSosActive(!sosActive);
    if (!sosActive) {
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
    setReroutedToast(`Optimal OpenStreetMap route pushed to ${selectedVehicle.driver} (${selectedVehicle.vehicle})`);
    setTimeout(() => setReroutedToast(""), 4000);
  };

  const getMarkerColorHex = (v) => {
    if (sosActive && selectedVehicle?.id === v.id) return "#FF0055";
    switch (v.status) {
      case "Moving":
        return "#10B981"; // Green
      case "Delivering":
        return "#FF5E00"; // Orange
      case "Returning":
      default:
        return "#00B4D8"; // Blue
    }
  };

  return (
    <div className="real-mapbox-page">
      {/* Header Bar */}
      <header className="real-map-header">
        <div>
          <h1 className="real-map-title">Enterprise GPS Control Center (React Leaflet + OpenStreetMap)</h1>
          <p className="real-map-subtitle">
            Tamil Nadu Geographic Radar • Powered 100% by React Leaflet & OpenStreetMap (Zero API Keys Required)
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {reroutedToast && (
            <span className="toast-inline-success">
              <CheckCircle2 size={15} /> {reroutedToast}
            </span>
          )}

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

          {/* REACT LEAFLET MAP CONTAINER */}
          <MapContainer
            center={[10.8, 78.5]}
            zoom={7}
            zoomControl={true}
            style={{ width: "100%", height: "100%", minHeight: "480px", borderRadius: "20px", background: "#0B1120" }}
          >
            <MapFlyTo selectedPos={selectedVehicle ? [selectedVehicle.lat, selectedVehicle.lng] : [10.8, 78.5]} />

            {/* OPENSTREETMAP / CARTO TILE LAYER (NO API KEYS REQUIRED) */}
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

            {/* DRAW ACTUAL HIGHWAY ROUTE POLYLINES */}
            {Object.entries(HIGHWAY_ROUTES).map(([vehId, waypoints]) => (
              <Polyline
                key={`route-${vehId}`}
                positions={waypoints}
                pathOptions={{
                  color: vehId === selectedVehicleId ? "#FF5E00" : "rgba(255, 94, 0, 0.45)",
                  weight: vehId === selectedVehicleId ? 5 : 3,
                  dashArray: "6,6",
                }}
              />
            ))}

            {/* DISPLAY VEHICLE MARKERS WITH LIVE MOVEMENT & POPUPS */}
            {vehicles.map((v) => {
              const isSelected = selectedVehicle?.id === v.id;
              const isEmergency = sosActive && isSelected;

              return (
                <Marker
                  key={v.id}
                  position={[v.lat, v.lng]}
                  icon={createTruckDivIcon(v.status, isSelected, isEmergency)}
                  eventHandlers={{
                    click: () => setSelectedVehicleId(v.id),
                  }}
                >
                  {/* POPUP INFORMATION WHEN VEHICLE IS CLICKED */}
                  <Popup>
                    <div style={{ fontFamily: "system-ui, sans-serif", padding: "4px", minWidth: "200px" }}>
                      <div style={{ fontWeight: "800", fontSize: "14px", color: "#FF5E00", marginBottom: "4px" }}>
                        🚛 {v.vehicle}
                      </div>
                      <div style={{ fontSize: "12px", color: "#1E293B", marginBottom: "2px" }}>
                        Driver: <strong>{v.driver}</strong>
                      </div>
                      <div style={{ fontSize: "12px", color: "#1E293B", marginBottom: "2px" }}>
                        Current Speed: <strong style={{ color: "#10B981" }}>{v.speed} km/h</strong>
                      </div>
                      <div style={{ fontSize: "12px", color: "#1E293B", marginBottom: "2px" }}>
                        Fuel Level: <strong>{v.fuelLevel}%</strong>
                      </div>
                      <div style={{ fontSize: "12px", color: "#1E293B", marginBottom: "2px" }}>
                        Cargo: <strong>{v.cargo}</strong>
                      </div>
                      <div style={{ fontSize: "12px", color: "#FF5E00", fontWeight: "700", marginTop: "4px" }}>
                        Destination: {v.dest} (ETA: {v.eta})
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Map Legend Bar */}
          <div className="map-bottom-legend">
            <div className="legend-status-items">
              <span className="legend-item"><span className="legend-dot dot-green"></span> 🟢 Green = Moving</span>
              <span className="legend-item"><span className="legend-dot dot-orange"></span> 🟧 Orange = Delivering</span>
              <span className="legend-item"><span className="legend-dot dot-blue"></span> 🔵 Blue = Returning</span>
              <span className="legend-item"><span className="legend-dot dot-red"></span> 🔴 Red = Emergency</span>
            </div>
            <div className="legend-meta">
              <span>OpenStreetMap Engine: <strong>React Leaflet 4.2.1</strong></span>
              <span>API Key: <strong style={{ color: "var(--green-neon)" }}>NOT REQUIRED</strong></span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            25% WIDTH RIGHT SIDE VEHICLE TELEMETRY PANEL
            ========================================================================= */}
        <div className="real-telemetry-25-panel">
          <div className="panel-header-badge">
            <Radio size={16} style={{ color: "var(--orange)" }} />
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
                    }}
                  >
                    ● {selectedVehicle.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "4px" }}>
                  Destination: <strong style={{ color: "var(--text)" }}>{selectedVehicle.dest}</strong>
                </div>
              </div>

              {/* Driver Details Profile Card */}
              <div className="tel-card-box driver-profile-box">
                <div className="driver-avatar-wrapper">
                  <div className="avatar-placeholder">
                    <User size={22} style={{ color: "var(--orange)" }} />
                  </div>
                  <div>
                    <strong style={{ fontSize: "15px", color: "var(--text)" }}>{selectedVehicle.driver}</strong>
                    <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>{selectedVehicle.phone}</div>
                    <div style={{ fontSize: "11px", color: "var(--green-neon)", fontWeight: "700", marginTop: "2px" }}>
                      ✓ Verified On-Duty Driver
                    </div>
                  </div>
                </div>

                <a href={`tel:${selectedVehicle.phone}`} className="btn-call-driver">
                  <PhoneCall size={14} /> Call Driver
                </a>
              </div>

              {/* Telemetry Metrics Grid (Speed, Fuel, Temp, Tyre, GPS, Battery) */}
              <div className="tel-metrics-grid">
                <div className="tel-metric-item">
                  <div className="metric-head">
                    <Gauge size={15} style={{ color: "var(--orange)" }} />
                    <span>Current Speed</span>
                  </div>
                  <strong className="metric-val" style={{ color: "var(--orange)" }}>
                    {selectedVehicle.speed} <small>km/h</small>
                  </strong>
                </div>

                <div className="tel-metric-item">
                  <div className="metric-head">
                    <Fuel size={15} style={{ color: "var(--blue)" }} />
                    <span>Fuel Tank Level</span>
                  </div>
                  <strong className="metric-val" style={{ color: "var(--blue)" }}>
                    {selectedVehicle.fuelLevel}% <small>Tank</small>
                  </strong>
                </div>

                <div className="tel-metric-item">
                  <div className="metric-head">
                    <Thermometer size={15} style={{ color: "var(--amber)" }} />
                    <span>Engine Temp</span>
                  </div>
                  <strong className="metric-val" style={{ color: "var(--amber)" }}>
                    {selectedVehicle.engineTemp}°C
                  </strong>
                </div>

                <div className="tel-metric-item">
                  <div className="metric-head">
                    <Shield size={15} style={{ color: "var(--green-neon)" }} />
                    <span>Tyre Pressure</span>
                  </div>
                  <strong className="metric-val" style={{ color: "var(--green-neon)" }}>
                    {selectedVehicle.tirePressure} <small>PSI</small>
                  </strong>
                </div>

                <div className="tel-metric-item">
                  <div className="metric-head">
                    <Wifi size={15} style={{ color: "var(--green-neon)" }} />
                    <span>GPS Signal</span>
                  </div>
                  <strong className="metric-val" style={{ color: "var(--green-neon)" }}>
                    {selectedVehicle.gpsSignal}
                  </strong>
                </div>

                <div className="tel-metric-item">
                  <div className="metric-head">
                    <Battery size={15} style={{ color: "var(--green-neon)" }} />
                    <span>Battery Status</span>
                  </div>
                  <strong className="metric-val" style={{ color: "var(--green-neon)" }}>
                    {selectedVehicle.batteryStatus}
                  </strong>
                </div>
              </div>

              {/* Cargo & Navigation Overview */}
              <div className="tel-card-box">
                <div className="tel-box-title">
                  <Navigation size={14} style={{ color: "var(--orange)" }} /> Active Trip Navigation
                </div>
                <div className="tel-info-row">
                  <span>Current Cargo:</span>
                  <strong style={{ color: "var(--orange)" }}>{selectedVehicle.cargo}</strong>
                </div>
                <div className="tel-info-row">
                  <span>Coordinates:</span>
                  <strong style={{ fontSize: "11px" }}>{selectedVehicle.lat}, {selectedVehicle.lng}</strong>
                </div>
                <div className="tel-info-row">
                  <span>Estimated Arrival (ETA):</span>
                  <strong style={{ color: "var(--green-neon)" }}>{selectedVehicle.eta}</strong>
                </div>
                <div className="tel-info-row">
                  <span>Last GPS Ping:</span>
                  <span style={{ color: "var(--text-dim)" }}>{selectedVehicle.lastGpsUpdate}</span>
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
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Active Fleet Telemetry Manifest</h3>
          <div className="pill-filter-bar">
            {["All", "Moving", "Delivering", "Returning"].map((st) => (
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
            const isSelected = selectedVehicle?.id === v.id;
            const markerColor = getMarkerColorHex(v);

            return (
              <div
                key={v.id}
                className={`samsara-fleet-card ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedVehicleId(v.id)}
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
