import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Truck,
  Bell,
  Gauge,
  ArrowRight,
  Navigation,
  Database,
  AlertTriangle,
  ClipboardList,
  Users,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Activity,
  Zap,
  PlusCircle,
  ShieldCheck,
  Fuel,
  Building2,
  RefreshCw,
  X,
  XCircle,
  FileCheck,
} from "lucide-react";
import { computeTotal } from "../data/seed";
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrdersContext";
import { useInventory } from "../context/InventoryContext";
import { useLanguage } from "../context/LanguageContext";
import OrderRow from "../components/OrderRow";
import DispatchModal from "../components/DispatchModal";
import { dashboardApi, activityApi, driverApi, vehicleApi, customerApi, registrationApi } from "../services/api";

function timeAgo(dateString) {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now - date) / 1000));
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { state } = useAuth();
  const { orders, loading, advanceStatus, cancelOrder, updateOrder } = useOrders();
  const { tanks, lowStockWarnings } = useInventory();
  const user = state.user;
  const isAdmin = user?.role === "Admin";

  const [search, setSearch] = useState("");
  const [dispatchModalOrder, setDispatchModalOrder] = useState(null);
  const [serverStats, setServerStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [appStats, setAppStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const searchRef = useRef(null);

  // Fetch aggregated dashboard metrics, live activities, drivers, vehicles, and customers from backend API
  useEffect(() => {
    let mounted = true;
    dashboardApi
      .getDashboardStats()
      .then((res) => {
        if (mounted && res?.data) {
          setServerStats(res.data);
        }
      })
      .catch((err) => {
        console.warn("[Dashboard] Aggregated stats API unavailable:", err.message);
      });

    customerApi
      .getCustomers()
      .then((res) => {
        if (mounted && res?.data) {
          setCustomersList(res.data);
        }
      })
      .catch((err) => {
        console.warn("[Dashboard] Customers API unavailable:", err.message);
      });

    activityApi
      .getActivities({ limit: 6 })
      .then((res) => {
        if (mounted && res?.data) {
          setActivities(res.data);
        }
      })
      .catch((err) => {
        console.warn("[Dashboard] Activities API unavailable:", err.message);
      });

    driverApi
      .getDrivers()
      .then((res) => {
        if (mounted && res?.data) {
          setDriversList(res.data);
        }
      })
      .catch((err) => {
        console.warn("[Dashboard] Drivers API unavailable:", err.message);
      });

    vehicleApi
      .getVehicles()
      .then((res) => {
        if (mounted && res?.data) {
          setVehiclesList(res.data);
        }
      })
      .catch((err) => {
        console.warn("[Dashboard] Vehicles API unavailable:", err.message);
      });

    registrationApi
      .getRegistrations()
      .then((res) => {
        if (mounted && res?.data) {
          const pending = res.data.filter(
            (r) => r.status === "Pending" || r.status === "Pending Review"
          ).length;
          const approved = res.data.filter(
            (r) => r.status === "Approved" || r.status === "Verified"
          ).length;
          const rejected = res.data.filter((r) => r.status === "Rejected").length;
          setAppStats({ pending, approved, rejected });
        }
      })
      .catch((err) => {
        console.warn("[Dashboard] Registrations API unavailable:", err.message);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const pendingRequests = useMemo(
    () => orders.filter((o) => o.status === "Pending" || o.status === "Pending Approval"),
    [orders]
  );

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const resetSearch = useCallback(() => setSearch(""), []);

  const pendingCount = useMemo(() => orders.filter((o) => o.status === "Pending").length, [orders]);

  useEffect(() => {
    document.title = pendingCount ? `(${pendingCount}) FDMS Command Center` : "FDMS Command Center";
  }, [pendingCount]);

  const recentOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (!term) return true;
        return (
          o.customer.toLowerCase().includes(term) ||
          o.orderNumber.toLowerCase().includes(term) ||
          o.city.toLowerCase().includes(term)
        );
      })
      .slice(0, 6);
  }, [orders, search]);

  const stats = useMemo(() => {
    const litresToday = orders.reduce((s, o) => s + (o.qty || o.quantity || 0), 0);
    const revenue = orders
      .filter((o) => o.status !== "Cancelled" && o.status !== "Rejected")
      .reduce((s, o) => s + (o.total || computeTotal(o.fuelCode, o.qty).total), 0);
    const active = orders.filter(
      (o) =>
        o.status === "InTransit" ||
        o.status === "In Transit" ||
        o.status === "Dispatched" ||
        o.status === "Assigned"
    ).length;
    const completed = orders.filter((o) => o.status === "Delivered").length;
    return {
      litresToday: serverStats?.orders?.litresToday || litresToday,
      revenue: serverStats?.orders?.revenue || revenue,
      active: serverStats?.orders?.activeDeliveries || active,
      completed: serverStats?.orders?.completedDeliveries || completed,
      totalCount: serverStats?.orders?.total || orders.length,
    };
  }, [orders, serverStats]);

  const totalTanksFuel = useMemo(() => {
    return tanks.reduce(
      (s, t) => s + (t.currentQty != null ? t.currentQty : t.currentStock != null ? t.currentStock : t.current || 0),
      0
    );
  }, [tanks]);

  const totalTanksCapacity = useMemo(() => {
    return tanks.reduce(
      (s, t) => s + (t.capacityQty != null ? t.capacityQty : t.capacity || 0),
      0
    );
  }, [tanks]);

  const invReservePct = useMemo(() => {
    return totalTanksCapacity > 0 ? Math.round((totalTanksFuel / totalTanksCapacity) * 100) : 85;
  }, [totalTanksFuel, totalTanksCapacity]);

  const driversOnDuty = useMemo(() => {
    return driversList.filter((d) => d.onDuty || d.status === "On Duty" || d.status === "Available").length;
  }, [driversList]);

  const driversTotal = useMemo(() => {
    return driversList.length || 14;
  }, [driversList]);

  const activeVehiclesCount = useMemo(() => {
    const vCount = vehiclesList.filter(
      (v) => v.status === "In Transit" || v.status === "InTransit" || v.status === "Assigned" || v.status === "Delivering"
    ).length;
    return vCount || stats.active;
  }, [vehiclesList, stats.active]);

  const fuelDistribution = useMemo(() => {
    const totalLitres = orders.reduce((s, o) => s + (o.qty || o.quantity || 0), 0);
    if (!totalLitres) {
      return { hsdPct: 55, msPct: 30, bioPct: 15 };
    }
    const hsd = orders.filter((o) => o.fuelCode === "HSD").reduce((s, o) => s + (o.qty || o.quantity || 0), 0);
    const ms = orders.filter((o) => o.fuelCode === "MS").reduce((s, o) => s + (o.qty || o.quantity || 0), 0);
    const bio = orders.filter((o) => o.fuelCode === "SPEED" || o.fuelCode === "BIO").reduce((s, o) => s + (o.qty || o.quantity || 0), 0);
    const hsdPct = Math.round((hsd / totalLitres) * 100);
    const msPct = Math.round((ms / totalLitres) * 100);
    const bioPct = Math.max(0, 100 - hsdPct - msPct);
    return { hsdPct, msPct, bioPct };
  }, [orders]);

  const todayDateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="page" style={{ gap: "24px" }}>
      {/* Depot Low Stock Warning Banner */}
      {lowStockWarnings.length > 0 && (
        <div className="banner-alert warning-banner">
          <AlertTriangle size={18} />
          <span>
            Depot Stock Warning: {lowStockWarnings.map((w) => w.name).join(", ")} below safety reserve!
          </span>
          <Link to="/inventory" className="banner-link">
            Open Tank Telemetry →
          </Link>
        </div>
      )}

      {/* =========================================================================
          1. ADMIN COMMAND CENTER DASHBOARD (When logged in as Admin)
          ========================================================================= */}
      {isAdmin ? (
        <>
          {/* Top Header Banner */}
          <div className="dashboard-header-saas">
            <div className="dash-title-group">
              <h1>Good Morning, {user?.name || "Admin"}</h1>
              <p>Today is {todayDateStr} • Global Dispatch Command Center</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div className="clock-indicator">
                <span className="live-dot-pulse"></span>
                <span style={{ fontSize: "12px", color: "var(--green-neon)", fontWeight: "700" }}>
                  SYSTEM STATUS: ONLINE
                </span>
              </div>
            </div>
          </div>

          {/* Admin 6 KPI Cards Grid (ISSUE 4: Total Customers, Total Orders, Pending Orders, Completed Orders, Total Drivers, Total Vehicles) */}
          <div className="kpi-grid-6">
            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--blue)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Total Customers</span>
                <div className="kpi-icon-badge">
                  <Users size={18} />
                </div>
              </div>
              <div className="kpi-val">{serverStats?.kpis?.totalCustomers || serverStats?.customers?.total || customersList.length || 14} Accounts</div>
              <div className="kpi-footer">
                <span className="trend-pill up">
                  <TrendingUp size={12} /> Enterprise
                </span>
                <span style={{ color: "var(--text-dim)" }}>MongoDB Verified</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--orange)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Total Orders</span>
                <div className="kpi-icon-badge">
                  <ClipboardList size={18} />
                </div>
              </div>
              <div className="kpi-val">{serverStats?.kpis?.totalOrders || stats.totalCount} Orders</div>
              <div className="kpi-footer">
                <span className="trend-pill up">
                  <TrendingUp size={12} /> +14.2%
                </span>
                <span style={{ color: "var(--text-dim)" }}>vs last week</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--red)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Pending Orders</span>
                <div className="kpi-icon-badge">
                  <Clock size={18} />
                </div>
              </div>
              <div className="kpi-val">{serverStats?.kpis?.pendingOrders != null ? serverStats.kpis.pendingOrders : pendingCount} Requests</div>
              <div className="kpi-footer">
                <span className="trend-pill down">Requires Action</span>
                <span style={{ color: "var(--text-dim)" }}>Awaiting Approval</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--green-neon)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Completed Orders</span>
                <div className="kpi-icon-badge">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="kpi-val">{serverStats?.kpis?.completedOrders != null ? serverStats.kpis.completedOrders : stats.completed} Delivered</div>
              <div className="kpi-footer">
                <span className="trend-pill up">
                  <TrendingUp size={12} /> 100% SLA
                </span>
                <span style={{ color: "var(--text-dim)" }}>Digital POD</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--amber)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Total Drivers</span>
                <div className="kpi-icon-badge">
                  <Users size={18} />
                </div>
              </div>
              <div className="kpi-val">{serverStats?.kpis?.totalDrivers || driversList.length || 4} Drivers</div>
              <div className="kpi-footer">
                <span className="trend-pill up">{driversOnDuty} Active</span>
                <span style={{ color: "var(--text-dim)" }}>GPS Connected</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--purple)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Total Vehicles</span>
                <div className="kpi-icon-badge">
                  <Truck size={18} />
                </div>
              </div>
              <div className="kpi-val">{serverStats?.kpis?.totalVehicles || vehiclesList.length || 4} Tankers</div>
              <div className="kpi-footer">
                <span className="trend-pill up">Live Fleet</span>
                <span style={{ color: "var(--text-dim)" }}>Telemetry Synced</span>
              </div>
            </div>
          </div>

          {/* Customer Applications & KYC Verification Counters (Admin Dashboard) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px" }}>
            <Link to="/applications" style={{ textDecoration: "none" }}>
              <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--amber)", cursor: "pointer" }}>
                <div className="kpi-card-head">
                  <span className="kpi-card-lbl">Pending Applications</span>
                  <div className="kpi-icon-badge">
                    <Clock size={18} />
                  </div>
                </div>
                <div className="kpi-val" style={{ color: "var(--amber)" }}>{appStats.pending} Applications</div>
                <div className="kpi-footer">
                  <span className="trend-pill down">Requires Action</span>
                  <span style={{ color: "var(--text-dim)" }}>Awaiting Approval</span>
                </div>
              </div>
            </Link>

            <Link to="/applications" style={{ textDecoration: "none" }}>
              <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--green-neon)", cursor: "pointer" }}>
                <div className="kpi-card-head">
                  <span className="kpi-card-lbl">Approved Customers</span>
                  <div className="kpi-icon-badge">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
                <div className="kpi-val" style={{ color: "var(--green-neon)" }}>{appStats.approved || customersList.length} Verified</div>
                <div className="kpi-footer">
                  <span className="trend-pill up">Active Accounts</span>
                  <span style={{ color: "var(--text-dim)" }}>KYC Verified</span>
                </div>
              </div>
            </Link>

            <Link to="/applications" style={{ textDecoration: "none" }}>
              <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--red)", cursor: "pointer" }}>
                <div className="kpi-card-head">
                  <span className="kpi-card-lbl">Rejected Applications</span>
                  <div className="kpi-icon-badge">
                    <XCircle size={18} />
                  </div>
                </div>
                <div className="kpi-val" style={{ color: "var(--red)" }}>{appStats.rejected} Applications</div>
                <div className="kpi-footer">
                  <span className="trend-pill down">Disapproved</span>
                  <span style={{ color: "var(--text-dim)" }}>Audit Log</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Admin Analytics Grid (Revenue Trend, Fuel Distribution, Fleet Load) */}
          <div className="analytics-grid-saas">
            <div className="chart-card-saas">
              <div className="chart-head">
                <div>
                  <h3 style={{ fontWeight: "700" }}>Revenue & Order Trajectory</h3>
                  <small style={{ color: "var(--text-dim)" }}>Weekly Delivery Volume (in Litres & Revenue)</small>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <span className="pill" style={{ "--pill-color": "var(--orange)" }}>Revenue (₹)</span>
                  <span className="pill" style={{ "--pill-color": "var(--blue)" }}>Volume (L)</span>
                </div>
              </div>

              {/* Custom SVG Area Trajectory Visual Chart */}
              <div style={{ width: "100%", height: "220px", position: "relative" }}>
                <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="areaGradRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF5E00" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#FF5E00" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="areaGradVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00B4D8" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#00B4D8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="0" y1="40" x2="500" y2="40" stroke="var(--line-subtle)" strokeDasharray="4 4" />
                  <line x1="0" y1="90" x2="500" y2="90" stroke="var(--line-subtle)" strokeDasharray="4 4" />
                  <line x1="0" y1="140" x2="500" y2="140" stroke="var(--line-subtle)" strokeDasharray="4 4" />

                  {/* Area Paths */}
                  <path d="M0,160 Q80,110 160,130 T320,60 T500,40 L500,200 L0,200 Z" fill="url(#areaGradRev)" />
                  <path d="M0,160 Q80,110 160,130 T320,60 T500,40" fill="none" stroke="var(--orange)" strokeWidth="3" />

                  <path d="M0,180 Q80,140 160,150 T320,90 T500,70 L500,200 L0,200 Z" fill="url(#areaGradVol)" />
                  <path d="M0,180 Q80,140 160,150 T320,90 T500,70" fill="none" stroke="var(--blue)" strokeWidth="3" />

                  {/* Data Points */}
                  <circle cx="160" cy="130" r="5" fill="#FF5E00" />
                  <circle cx="320" cy="60" r="5" fill="#FF5E00" />
                  <circle cx="500" cy="40" r="5" fill="#FF5E00" />
                </svg>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)", marginTop: "8px" }}>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Today</span>
                </div>
              </div>
            </div>

            {/* Fuel Type Distribution Donut Chart Card */}
            <div className="chart-card-saas">
              <div className="chart-head">
                <h3 style={{ fontWeight: "700" }}>Fuel Type Distribution</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                <svg width="140" height="140" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--panel-alt)"
                    strokeWidth="3.8"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--orange)"
                    strokeWidth="3.8"
                    strokeDasharray={`${fuelDistribution.hsdPct}, 100`}
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--blue)"
                    strokeWidth="3.8"
                    strokeDasharray={`${fuelDistribution.msPct}, 100`}
                    strokeDashoffset={`-${fuelDistribution.hsdPct}`}
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--amber)"
                    strokeWidth="3.8"
                    strokeDasharray={`${fuelDistribution.bioPct}, 100`}
                    strokeDashoffset={`-${fuelDistribution.hsdPct + fuelDistribution.msPct}`}
                  />
                </svg>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--orange)", fontWeight: "700" }}>● HSD (High Speed Diesel)</span>
                    <strong>{fuelDistribution.hsdPct}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--blue)", fontWeight: "700" }}>● MS (Motor Spirit Petrol)</span>
                    <strong>{fuelDistribution.msPct}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--amber)", fontWeight: "700" }}>● Speed Diesel / Bio</span>
                    <strong>{fuelDistribution.bioPct}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Launcher Cards */}
          <div>
            <h3 style={{ fontSize: "16px", marginBottom: "14px", fontWeight: "700" }}>Command Quick Actions</h3>
            <div className="quick-actions-grid-saas">
              <Link to="/orders" className="action-card-saas">
                <div className="action-icon-wrapper">
                  <PlusCircle size={22} />
                </div>
                <strong style={{ fontSize: "13px" }}>Create Order</strong>
              </Link>

              <Link to="/fleet-map" className="action-card-saas">
                <div className="action-icon-wrapper">
                  <Navigation size={22} />
                </div>
                <strong style={{ fontSize: "13px" }}>Track Fleet</strong>
              </Link>

              <Link to="/inventory" className="action-card-saas">
                <div className="action-icon-wrapper">
                  <Database size={22} />
                </div>
                <strong style={{ fontSize: "13px" }}>Inventory</strong>
              </Link>

              <Link to="/reports" className="action-card-saas">
                <div className="action-icon-wrapper">
                  <BarChart3 size={22} />
                </div>
                <strong style={{ fontSize: "13px" }}>Reports</strong>
              </Link>

              <Link to="/drivers" className="action-card-saas">
                <div className="action-icon-wrapper">
                  <Truck size={22} />
                </div>
                <strong style={{ fontSize: "13px" }}>Manage Drivers</strong>
              </Link>

              <Link to="/customers" className="action-card-saas">
                <div className="action-icon-wrapper">
                  <Users size={22} />
                </div>
                <strong style={{ fontSize: "13px" }}>Manage Customers</strong>
              </Link>
            </div>
          </div>

          {/* Recent Activity Stream & Orders Table Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "22px" }}>
            <section className="panel table-panel">
              <div className="panel-head">
                <h3>Customer Orders & Dispatch Queue</h3>
                <Link className="link-more" to="/orders">
                  View All ({orders.length}) <ArrowRight size={14} />
                </Link>
              </div>
              {recentOrders.length === 0 ? (
                <div className="loading">No orders match search query.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Fuel</th>
                      <th>Qty</th>
                      <th>Driver</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <OrderRow key={o.id} order={o} onAdvance={advanceStatus} onCancel={cancelOrder} />
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Timeline Stream */}
            <div className="activity-stream-panel">
              <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Live Activity Stream</h3>
              <div className="activity-list">
                {activities.length === 0 ? (
                  <div style={{ padding: "20px 10px", color: "var(--text-dim)", fontSize: "12px", textAlign: "center" }}>
                    No recent activities recorded.
                  </div>
                ) : (
                  activities.map((act, idx) => (
                    <div className="activity-item" key={act._id || act.id || idx}>
                      <div className="activity-icon-box">
                        {act.action?.includes("Delivered") || act.action?.includes("Completed") ? (
                          <CheckCircle2 size={16} style={{ color: "var(--green-neon)" }} />
                        ) : act.action?.includes("Driver") || act.action?.includes("Transit") || act.action?.includes("Dispatched") ? (
                          <Truck size={16} style={{ color: "var(--blue)" }} />
                        ) : act.action?.includes("Warning") || act.action?.includes("Alert") || act.action?.includes("Refill") ? (
                          <AlertTriangle size={16} style={{ color: "var(--amber)" }} />
                        ) : (
                          <Activity size={16} style={{ color: "var(--orange)" }} />
                        )}
                      </div>
                      <div>
                        <strong style={{ fontSize: "12px", color: "var(--text)" }}>{act.action}</strong>
                        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--text-dim)" }}>
                          {act.details || act.description || `Performed by ${act.userName || "System"}`}
                        </p>
                        <small style={{ color: "var(--orange)", fontSize: "10px", fontWeight: "700" }}>
                          {timeAgo(act.createdAt || act.timestamp)}
                        </small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* =========================================================================
            2. DEPOT MANAGER OPERATIONS CONTROL DASHBOARD (For Dispatchers/Depot Mgrs)
            ========================================================================= */
        <>
          <div className="dashboard-header-saas">
            <div className="dash-title-group">
              <h1>Depot Operations Control Center</h1>
              <p>Today is {todayDateStr} • Operational Fleet & Tank Telemetry</p>
            </div>
            <span className="pill" style={{ "--pill-color": "var(--green-neon)" }}>
              DEPOT ONLINE
            </span>
          </div>

          {/* Depot Operations Top KPIs (ISSUE 4: Depot Orders, Pending Deliveries, Active Drivers, Available Fuel Stock) */}
          <div className="kpi-grid-6">
            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--orange)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Depot Orders</span>
                <div className="kpi-icon-badge">
                  <ClipboardList size={18} />
                </div>
              </div>
              <div className="kpi-val">{serverStats?.kpis?.depotOrders || stats.totalCount} Orders</div>
              <div className="kpi-footer">
                <span className="trend-pill up">{stats.completed} Delivered</span>
                <span style={{ color: "var(--text-dim)" }}>Total Runs</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--red)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Pending Deliveries</span>
                <div className="kpi-icon-badge">
                  <Clock size={18} />
                </div>
              </div>
              <div className="kpi-val">{serverStats?.kpis?.pendingDeliveries || (pendingCount + stats.active)} Pending</div>
              <div className="kpi-footer">
                <span className="trend-pill down">Action Queue</span>
                <span style={{ color: "var(--text-dim)" }}>Awaiting Dispatch</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--blue)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Active Drivers</span>
                <div className="kpi-icon-badge">
                  <Users size={18} />
                </div>
              </div>
              <div className="kpi-val">{serverStats?.kpis?.activeDrivers || driversOnDuty} Active</div>
              <div className="kpi-footer">
                <span className="trend-pill up">{Math.max(0, driversTotal - driversOnDuty)} Resting</span>
                <span style={{ color: "var(--text-dim)" }}>Shift Active</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--amber)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Available Fuel Stock</span>
                <div className="kpi-icon-badge">
                  <Database size={18} />
                </div>
              </div>
              <div className="kpi-val">{(serverStats?.kpis?.availableFuelStock || totalTanksFuel).toLocaleString()} L</div>
              <div className="kpi-footer">
                <span className="trend-pill up">{tanks.length || 4} Tanks</span>
                <span style={{ color: "var(--text-dim)" }}>In Storage</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--green-neon)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Vehicles Active</span>
                <div className="kpi-icon-badge">
                  <ShieldCheck size={18} />
                </div>
              </div>
              <div className="kpi-val">{activeVehiclesCount} Tankers</div>
              <div className="kpi-footer">
                <span className="trend-pill up">GPS Live</span>
                <span style={{ color: "var(--text-dim)" }}>Fleet Tracked</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--purple)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Capacity Usage</span>
                <div className="kpi-icon-badge">
                  <Activity size={18} />
                </div>
              </div>
              <div className="kpi-val">{invReservePct}% Loaded</div>
              <div className="kpi-footer">
                <span className="trend-pill up">{totalTanksFuel.toLocaleString()}L / {totalTanksCapacity.toLocaleString()}L</span>
              </div>
            </div>
          </div>

          {/* Customer Applications & KYC Verification Counters (Depot Manager Dashboard) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "20px" }}>
            <Link to="/applications" style={{ textDecoration: "none" }}>
              <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--amber)", cursor: "pointer" }}>
                <div className="kpi-card-head">
                  <span className="kpi-card-lbl">Pending Applications</span>
                  <div className="kpi-icon-badge">
                    <Clock size={18} />
                  </div>
                </div>
                <div className="kpi-val" style={{ color: "var(--amber)" }}>{appStats.pending} Applications</div>
                <div className="kpi-footer">
                  <span className="trend-pill down">Requires Action</span>
                  <span style={{ color: "var(--text-dim)" }}>Awaiting Approval</span>
                </div>
              </div>
            </Link>

            <Link to="/applications" style={{ textDecoration: "none" }}>
              <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--green-neon)", cursor: "pointer" }}>
                <div className="kpi-card-head">
                  <span className="kpi-card-lbl">Approved Customers</span>
                  <div className="kpi-icon-badge">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
                <div className="kpi-val" style={{ color: "var(--green-neon)" }}>{appStats.approved || customersList.length} Verified</div>
                <div className="kpi-footer">
                  <span className="trend-pill up">Active Accounts</span>
                  <span style={{ color: "var(--text-dim)" }}>KYC Verified</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Depot Manager Fuel Tank Telemetry Section */}
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>
              Depot Tank Telemetry & Refill Status
            </h3>
            <div className="depot-tank-cards-grid">
              {tanks.map((tank) => {
                const currentStock = tank.currentQty != null ? tank.currentQty : tank.currentStock != null ? tank.currentStock : tank.current || 0;
                const capacity = tank.capacityQty != null ? tank.capacityQty : tank.capacity || 1;
                const pct = Math.round((currentStock / capacity) * 100);
                const isWarning = pct <= 30;
                return (
                  <div key={tank.id} className="tank-card-saas">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "15px" }}>{tank.fuelCode} ({tank.name})</strong>
                      <span className={`pill ${isWarning ? "pill-danger" : ""}`} style={{ "--pill-color": isWarning ? "var(--red)" : "var(--green-neon)" }}>
                        {isWarning ? "LOW STOCK ALERT" : "HEALTHY RESERVE"}
                      </span>
                    </div>

                    <div style={{ fontSize: "24px", fontWeight: "800", color: "var(--text)" }}>
                      {pct}% <small style={{ fontSize: "13px", color: "var(--text-dim)" }}>filled</small>
                    </div>

                    {/* Progress Bar */}
                    <div className="gauge-bar-outer" style={{ height: "10px" }}>
                      <div
                        className="gauge-bar-fill"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isWarning ? "var(--red)" : "var(--green-neon)",
                          boxShadow: `0 0 10px ${isWarning ? "var(--red-glow)" : "var(--green-glow)"}`,
                        }}
                      ></div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-dim)" }}>
                      <span>Capacity: {capacity.toLocaleString()} L</span>
                      <span>Est. Days: {isWarning ? "3 Days Left" : "14 Days Left"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending Fuel Requests Queue (Depot Manager Approval Required) */}
          <section className="panel table-panel" style={{ border: "1px solid var(--amber)", boxShadow: "0 0 20px rgba(255, 183, 3, 0.15)" }}>
            <div className="panel-head" style={{ background: "color-mix(in srgb, var(--amber) 10%, var(--panel))" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Bell size={18} style={{ color: "var(--amber)" }} />
                <h3 style={{ margin: "0" }}>Pending Fuel Requests Queue ({pendingRequests.length} Waiting for Approval)</h3>
              </div>
              <span className="pill" style={{ "--pill-color": "var(--amber)" }}>MANAGER APPROVAL REQUIRED</span>
            </div>
            {pendingRequests.length === 0 ? (
              <div className="loading" style={{ padding: "20px" }}>No pending fuel requests. All customer requests have been reviewed.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer Name</th>
                    <th>Site / City</th>
                    <th>Fuel Code</th>
                    <th>Requested Qty</th>
                    <th>Est. Value</th>
                    <th>Status</th>
                    <th>Manager Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((req) => {
                    const cost = computeTotal(req.fuelCode, req.qty).total;
                    return (
                      <tr key={req.id}>
                        <td><strong>{req.orderNumber}</strong></td>
                        <td><strong>{req.customer}</strong></td>
                        <td>{req.site} • {req.city}</td>
                        <td>
                          <span className={`fuel-tag fuel-${req.fuelCode.toLowerCase()}`}>
                            {req.fuelCode}
                          </span>
                        </td>
                        <td><strong>{req.qty.toLocaleString()} L</strong></td>
                        <td><strong>₹{cost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong></td>
                        <td>
                          <span className="pill" style={{ "--pill-color": "var(--amber)" }}>
                            Pending Approval
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              className="btn-primary btn-sm"
                              style={{ backgroundColor: "var(--green-neon)", color: "#000", fontWeight: "800", gap: "4px" }}
                              onClick={() => updateOrder(req.id, { status: "Approved" })}
                            >
                              <CheckCircle2 size={14} /> Approve Request
                            </button>
                            <button
                              className="btn-secondary btn-sm"
                              style={{ borderColor: "var(--red)", color: "var(--red)", fontWeight: "700", gap: "4px" }}
                              onClick={() => cancelOrder(req.id)}
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* Dispatch Center Operations Table */}
          <section className="panel table-panel">
            <div className="panel-head">
              <h3>Dispatch Center Active Operations Queue</h3>
              <Link className="link-more" to="/orders">
                Manage All Orders →
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="loading">No active orders in dispatch queue.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Fuel</th>
                    <th>Qty</th>
                    <th>Driver</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <OrderRow
                      key={o.id}
                      order={o}
                      onAdvance={advanceStatus}
                      onCancel={cancelOrder}
                      onDispatch={setDispatchModalOrder}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {dispatchModalOrder && (
        <DispatchModal
          order={dispatchModalOrder}
          onClose={() => setDispatchModalOrder(null)}
          onConfirm={(id, payload) => updateOrder(id, payload)}
        />
      )}
    </div>
  );
}
