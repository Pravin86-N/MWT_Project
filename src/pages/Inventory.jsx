import React, { useState, useMemo } from "react";
import {
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Thermometer,
  Gauge,
  Calendar,
  Fuel,
  Clock,
  ArrowUpRight,
  TrendingDown,
  Search,
  SlidersHorizontal,
  ShieldAlert,
  Activity,
  Droplets,
  Zap,
} from "lucide-react";
import { useInventory } from "../context/InventoryContext";
import { useLanguage } from "../context/LanguageContext";
import { fuelOf } from "../data/seed";

export default function Inventory() {
  const { t } = useLanguage();
  const { tanks, refillTank, resetTanks, lowStockWarnings } = useInventory();
  const [refillingId, setRefillingId] = useState(null);
  const [toast, setToast] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fuelFilter, setFuelFilter] = useState("ALL");

  // Handle refill with telemetry simulation feedback
  const handleRefill = (tankId, tankName) => {
    setRefillingId(tankId);
    setTimeout(() => {
      refillTank(tankId, 10000);
      setRefillingId(null);
      setToast(`Telemetry Synced: Successfully refilled +10,000 Litres to ${tankName}`);
      setTimeout(() => setToast(""), 4000);
    }, 750);
  };

  // Executive summary calculations
  const totalCapacity = useMemo(() => tanks.reduce((acc, tank) => acc + tank.capacity, 0), [tanks]);
  const totalCurrent = useMemo(() => tanks.reduce((acc, tank) => acc + tank.current, 0), [tanks]);
  const overallUtilization = Math.round((totalCurrent / totalCapacity) * 100);

  // Filtered tanks list
  const filteredTanks = useMemo(() => {
    return tanks.filter((tank) => {
      const matchesSearch =
        tank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tank.fuelCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = fuelFilter === "ALL" || tank.fuelCode === fuelFilter;
      return matchesSearch && matchesFilter;
    });
  }, [tanks, searchQuery, fuelFilter]);

  // Compute burn rate estimated days remaining based on current litres
  const getEstimatedDays = (currentVolume, fuelCode) => {
    const burnRates = { DSL: 2800, PTL: 2100, LPG: 1400, KRS: 600 };
    const rate = burnRates[fuelCode] || 1500;
    const days = Math.round(currentVolume / rate);
    return days <= 0 ? "< 1 day" : `${days} days`;
  };

  return (
    <div className="inventory-page-container">
      {/* Enterprise Page Header */}
      <header className="inventory-header-v2">
        <div>
          <h1 className="page-title">{t("inventoryTitle") || "Bulk Storage Telemetry"}</h1>
          <p>
            Real-time underground fuel vault telemetry, thermal & pressure monitoring, and automated reserve alarms.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button className="btn-secondary" onClick={resetTanks} style={{ padding: "10px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", background: "var(--panel-alt)", border: "1px solid var(--line)", color: "var(--text)", cursor: "pointer" }}>
            <RefreshCw size={15} /> Reset Stock Telemetry
          </button>
        </div>
      </header>

      {/* Global Toast Alert */}
      {toast && (
        <div className="banner-alert success-banner" style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.35)", borderRadius: "12px", padding: "14px 18px", color: "var(--green)", display: "flex", alignItems: "center", gap: "12px", fontWeight: "600", fontSize: "14px" }}>
          <CheckCircle2 size={18} />
          <span>{toast}</span>
        </div>
      )}

      {/* Low Stock Telemetry Warning Banner */}
      {lowStockWarnings.length > 0 && (
        <div className="telemetry-alert-banner danger">
          <ShieldAlert size={22} style={{ flexShrink: 0 }} />
          <div>
            <strong>CRITICAL TELEMETRY ALERT: {lowStockWarnings.length} STORAGE VAULT(S) BELOW SAFETY THRESHOLD!</strong>
            <p>Immediate depot tanker replenishment recommended to ensure uninterrupted dispatch operations.</p>
          </div>
        </div>
      )}

      {/* Executive Storage KPI Summary Grid */}
      <div className="inventory-kpi-grid">
        <div className="kpi-card-v2">
          <div className="kpi-header">
            <span className="kpi-title">Total Depot Capacity</span>
            <div className="kpi-icon-wrapper">
              <Database size={18} />
            </div>
          </div>
          <div className="kpi-value-group">
            <span className="kpi-val">{totalCapacity.toLocaleString()}</span>
            <span className="kpi-unit">Litres</span>
          </div>
          <div className="kpi-badge success">
            <Activity size={12} /> 4 Active Storage Vaults
          </div>
        </div>

        <div className="kpi-card-v2">
          <div className="kpi-header">
            <span className="kpi-title">Current Fuel Reserve</span>
            <div className="kpi-icon-wrapper">
              <Droplets size={18} />
            </div>
          </div>
          <div className="kpi-value-group">
            <span className="kpi-val">{totalCurrent.toLocaleString()}</span>
            <span className="kpi-unit">Litres Available</span>
          </div>
          <div className="kpi-badge success">
            <ArrowUpRight size={12} /> Real-time Telemetry
          </div>
        </div>

        <div className="kpi-card-v2">
          <div className="kpi-header">
            <span className="kpi-title">Overall Storage Utilization</span>
            <div className="kpi-icon-wrapper">
              <Gauge size={18} />
            </div>
          </div>
          <div className="kpi-value-group">
            <span className="kpi-val">{overallUtilization}%</span>
            <span className="kpi-unit">Depot Load</span>
          </div>
          <div className={`kpi-badge ${overallUtilization < 40 ? "warning" : "success"}`}>
            {overallUtilization < 40 ? "Low Reserve Capacity" : "Optimal Load Factor"}
          </div>
        </div>

        <div className="kpi-card-v2">
          <div className="kpi-header">
            <span className="kpi-title">Safety Threshold Alerts</span>
            <div className="kpi-icon-wrapper" style={{ color: lowStockWarnings.length > 0 ? "var(--red)" : "var(--green)" }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="kpi-value-group">
            <span className="kpi-val" style={{ color: lowStockWarnings.length > 0 ? "var(--red)" : "var(--green)" }}>
              {lowStockWarnings.length}
            </span>
            <span className="kpi-unit">Vault Alarm(s)</span>
          </div>
          <div className={`kpi-badge ${lowStockWarnings.length > 0 ? "danger" : "success"}`}>
            {lowStockWarnings.length > 0 ? "Action Required" : "All Vaults Normal"}
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["ALL", "DSL", "PTL", "LPG", "KRS"].map((code) => {
            const labelMap = { ALL: "All Vaults", DSL: "Diesel", PTL: "Petrol", LPG: "LPG Spheres", KRS: "Kerosene" };
            const isActive = fuelFilter === code;
            return (
              <button
                key={code}
                onClick={() => setFuelFilter(code)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  border: isActive ? "1px solid var(--orange)" : "1px solid var(--line)",
                  background: isActive ? "var(--grad-flame)" : "var(--panel-alt)",
                  color: isActive ? "#FFFFFF" : "var(--text-dim)",
                  boxShadow: isActive ? "var(--shadow-flame-glow)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {labelMap[code]}
              </button>
            );
          })}
        </div>

        <div style={{ position: "relative", minWidth: "260px" }}>
          <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search vault name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="table-search-input"
            style={{ paddingLeft: "36px", width: "100%" }}
          />
        </div>
      </div>

      {/* Responsive Telemetry Cards Grid (2-4 cards per row) */}
      <div className="tanks-telemetry-grid">
        {filteredTanks.map((tank) => {
          const fuel = fuelOf(tank.fuelCode);
          const percent = Math.round((tank.current / tank.capacity) * 100);
          const isLow = tank.current <= tank.threshold;
          const isCritical = percent <= 20;
          const estDays = getEstimatedDays(tank.current, tank.fuelCode);

          let cardStateClass = "";
          let statusText = "Optimal";
          let statusClass = "optimal";

          if (isCritical) {
            cardStateClass = "critical-state";
            statusText = "Critical Stock";
            statusClass = "critical";
          } else if (isLow) {
            cardStateClass = "warning-state";
            statusText = "Low Reserve";
            statusClass = "low";
          }

          return (
            <div key={tank.id} className={`telemetry-tank-card ${cardStateClass}`}>
              {/* Card Header & Fuel Grade Badge */}
              <div className="tank-card-header-v2">
                <div className="tank-identity">
                  <div
                    className="tank-icon-box"
                    style={{
                      background: fuel?.color ? `linear-gradient(135deg, ${fuel.color} 0%, rgba(15,23,42,0.8) 100%)` : "var(--grad-flame)",
                    }}
                  >
                    <Fuel size={22} />
                  </div>
                  <div className="tank-meta">
                    <h3>{tank.name}</h3>
                    <span
                      className="fuel-tag"
                      style={{
                        backgroundColor: fuel?.color ? `${fuel.color}22` : "rgba(255,94,0,0.15)",
                        color: fuel?.color || "var(--orange)",
                        border: `1px solid ${fuel?.color || "var(--orange)"}44`,
                      }}
                    >
                      {fuel?.name} • ({tank.fuelCode})
                    </span>
                  </div>
                </div>

                <div className={`status-indicator-pill ${statusClass}`}>
                  <span className="live-dot-pulse" style={{ backgroundColor: isCritical ? "var(--red)" : isLow ? "var(--amber)" : "var(--green-neon)" }}></span>
                  {statusText}
                </div>
              </div>

              {/* Visual Liquid Level Gauge & Volume Metric */}
              <div className="tank-visual-gauge-widget">
                <div className="gauge-top-info">
                  <div className="gauge-percent-display">
                    <span className="gauge-percent-val">{percent}</span>
                    <span className="gauge-percent-symbol">%</span>
                  </div>
                  <div className="gauge-vol-display">
                    <strong>{tank.current.toLocaleString()}</strong> / {tank.capacity.toLocaleString()} Litres
                  </div>
                </div>

                <div className="fluid-progress-bar-container">
                  <div
                    className="fluid-progress-bar-fill"
                    style={{
                      width: `${percent}%`,
                      background: isCritical
                        ? "var(--grad-crimson)"
                        : isLow
                        ? "linear-gradient(90deg, #F59E0B, #FFB703)"
                        : fuel?.color
                        ? `linear-gradient(90deg, ${fuel.color}, #00E676)`
                        : "var(--grad-flame)",
                    }}
                  >
                    <div className="fluid-shimmer"></div>
                  </div>
                </div>
              </div>

              {/* Sensor Telemetry 2x2 Grid */}
              <div className="telemetry-sensors-grid">
                <div className="sensor-box">
                  <div className="sensor-icon">
                    <Thermometer size={16} style={{ color: tank.temp > 25 ? "var(--amber)" : "var(--text-dim)" }} />
                  </div>
                  <div className="sensor-info">
                    <span className="sensor-lbl">Vault Temp</span>
                    <span className="sensor-val">{tank.temp}°C</span>
                  </div>
                </div>

                <div className="sensor-box">
                  <div className="sensor-icon">
                    <Gauge size={16} />
                  </div>
                  <div className="sensor-info">
                    <span className="sensor-lbl">Pressure</span>
                    <span className="sensor-val">{tank.pressure} Bar</span>
                  </div>
                </div>

                <div className="sensor-box">
                  <div className="sensor-icon">
                    <Calendar size={16} />
                  </div>
                  <div className="sensor-info">
                    <span className="sensor-lbl">Last Refill</span>
                    <span className="sensor-val">{tank.lastRefill}</span>
                  </div>
                </div>

                <div className="sensor-box">
                  <div className="sensor-icon">
                    <Clock size={16} style={{ color: isLow ? "var(--amber)" : "var(--text-dim)" }} />
                  </div>
                  <div className="sensor-info">
                    <span className="sensor-lbl">Est. Reserve</span>
                    <span className="sensor-val" style={{ color: isLow ? "var(--amber)" : "var(--text)" }}>
                      {estDays}
                    </span>
                  </div>
                </div>
              </div>

              {/* Refill Recommendation Banner */}
              {isLow && (
                <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "10px", padding: "10px 12px", fontSize: "12px", color: "var(--amber)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span>Refill recommended within 48h to prevent supply lock</span>
                </div>
              )}

              {/* Action Button */}
              <button
                className="refill-action-btn btn-refill-normal"
                disabled={refillingId === tank.id || percent >= 100}
                onClick={() => handleRefill(tank.id, tank.name)}
              >
                <RefreshCw size={16} className={refillingId === tank.id ? "spin" : ""} />
                {refillingId === tank.id ? "Refilling Bulk Stock..." : `Replenish Vault (+10,000L)`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Depot Storage Inventory Overview Table */}
      <div className="telemetry-table-card">
        <div className="table-toolbar">
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", margin: "0 0 4px 0", color: "var(--text)" }}>
              Depot Storage Vault Telemetry Manifest
            </h3>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-dim)" }}>
              Live telemetry sensor feed for all underground bulk fuel storage units.
            </p>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="telemetry-table">
            <thead>
              <tr>
                <th>Vault Identifier</th>
                <th>Fuel Grade</th>
                <th>Current Level</th>
                <th>Safety Threshold</th>
                <th>Storage Load Meter</th>
                <th>Sensors</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTanks.map((tank) => {
                const fuel = fuelOf(tank.fuelCode);
                const percent = Math.round((tank.current / tank.capacity) * 100);
                const isLow = tank.current <= tank.threshold;
                const isCritical = percent <= 20;

                return (
                  <tr key={tank.id}>
                    <td>
                      <div style={{ fontWeight: "700", color: "var(--text)" }}>{tank.name}</div>
                      <span className="mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        ID: {tank.id}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          backgroundColor: fuel?.color ? `${fuel.color}22` : "rgba(255,94,0,0.15)",
                          color: fuel?.color || "var(--orange)",
                          border: `1px solid ${fuel?.color || "var(--orange)"}44`,
                          fontSize: "12px",
                          fontWeight: "700",
                          padding: "3px 9px",
                          borderRadius: "6px",
                          display: "inline-block",
                        }}
                      >
                        {fuel?.name || tank.fuelCode}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: "700", color: "var(--text)" }}>{tank.current.toLocaleString()} L</span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>
                        / {tank.capacity.toLocaleString()} L
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: "600", color: "var(--text-dim)" }}>{tank.threshold.toLocaleString()} L</span>
                    </td>
                    <td style={{ minWidth: "160px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ flex: 1, height: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "999px", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${percent}%`,
                              backgroundColor: isCritical ? "var(--red)" : isLow ? "var(--amber)" : fuel?.color || "var(--green)",
                              borderRadius: "999px",
                            }}
                          ></div>
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: "700", width: "36px" }}>{percent}%</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                        <span>{tank.temp}°C</span> • <span>{tank.pressure} Bar</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-indicator-pill ${isCritical ? "critical" : isLow ? "low" : "optimal"}`}>
                        {isCritical ? "CRITICAL" : isLow ? "LOW STOCK" : "OPTIMAL"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        disabled={refillingId === tank.id || percent >= 100}
                        onClick={() => handleRefill(tank.id, tank.name)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "700",
                          background: "var(--panel-alt)",
                          border: "1px solid var(--line)",
                          color: "var(--orange)",
                          cursor: "pointer",
                        }}
                      >
                        +10K Litres
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
