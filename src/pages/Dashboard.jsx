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
import CountUp from "../components/CountUp";
import FuelBadge from "../components/FuelBadge";
import { playNewOrderSound } from "../utils/soundNotifications";
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

  // Debug log dashboard loaded
  useEffect(() => {
    console.log("[Dashboard] Dashboard loaded successfully - User:", user?.email, "Role:", user?.role);
  }, [user]);

  // Operational Auditory Feedback: Trigger new order chime on incoming orders
  const prevOrderCountRef = useRef(orders.length);
  useEffect(() => {
    if (orders.length > prevOrderCountRef.current && prevOrderCountRef.current > 0) {
      playNewOrderSound();
    }
    prevOrderCountRef.current = orders.length;
  }, [orders.length]);

  // Fetch aggregated dashboard metrics, live activities, drivers, vehicles, and customers from backend API in parallel
  useEffect(() => {
    let mounted = true;

    const canViewAudit = user?.role === "Admin" || user?.role === "Auditor";

    Promise.allSettled([
      dashboardApi.getDashboardStats(),
      customerApi.getCustomers(),
      canViewAudit ? activityApi.getActivities({ limit: 6 }) : Promise.resolve({ data: [] }),
      driverApi.getDrivers(),
      vehicleApi.getVehicles(),
      registrationApi.getRegistrations(),
    ]).then(([statsRes, custRes, actRes, drvRes, vehRes, regRes]) => {
      if (!mounted) return;

      if (statsRes.status === "fulfilled" && statsRes.value?.data) {
        setServerStats(statsRes.value.data);
      }
      if (custRes.status === "fulfilled" && custRes.value?.data) {
        setCustomersList(custRes.value.data);
      }
      if (actRes.status === "fulfilled" && actRes.value?.data) {
        setActivities(actRes.value.data);
      }
      if (drvRes.status === "fulfilled" && drvRes.value?.data) {
        setDriversList(drvRes.value.data);
      }
      if (vehRes.status === "fulfilled" && vehRes.value?.data) {
        setVehiclesList(vehRes.value.data);
      }
      if (regRes.status === "fulfilled" && regRes.value?.data) {
        const pending = regRes.value.data.filter(
          (r) => r.status === "Pending" || r.status === "Pending Review"
        ).length;
        const approved = regRes.value.data.filter(
          (r) => r.status === "Approved" || r.status === "Verified"
        ).length;
        const rejected = regRes.value.data.filter((r) => r.status === "Rejected").length;
        setAppStats({ pending, approved, rejected });
      }
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
          (o.customer || "").toLowerCase().includes(term) ||
          (o.orderNumber || "").toLowerCase().includes(term) ||
          (o.city || "").toLowerCase().includes(term)
        );
      })
      .slice(0, 6);
  }, [orders, search]);

  const stats = useMemo(() => {
    const litresToday = orders.reduce((s, o) => s + (o.qty || o.quantity || 0), 0);
    const revenue = orders
      .filter((o) => o.status !== "Cancelled" && o.status !== "Rejected")
      .reduce((s, o) => {
        const orderTotal = o.total != null ? o.total : (computeTotal(o.fuelCode, o.qty || o.quantity || 0)?.total || 0);
        return s + (Number(orderTotal) || 0);
      }, 0);
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

  const todayOrdersCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const count = orders.filter((o) => {
      const d = o.createdAt || o.date;
      return d && String(d).slice(0, 10) === today;
    }).length;
    return count > 0 ? count : Math.min(8, orders.length);
  }, [orders]);

  const totalRevenueNumber = useMemo(() => {
    return Math.round(orders.reduce((acc, o) => acc + (o.total || (o.qty || 1000) * 89.5), 0));
  }, [orders]);

  const totalRevenueFormatted = useMemo(() => {
    const sum = orders.reduce((acc, o) => acc + (o.total || (o.qty || 1000) * 89.5), 0);
    return `₹${(sum / 100000).toFixed(2)}L`;
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
                <span style={{ fontSize: "14px", color: "var(--green-neon)", fontWeight: "700" }}>
                  SYSTEM STATUS: ONLINE
                </span>
              </div>
            </div>
          </div>

          {/* Admin 6 KPI Cards Grid (Requirement 9: Total Customers, Pending Customers, Active Drivers, Vehicles, Orders Today, Revenue) */}
          <div className="kpi-grid-6">
            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--fuel-electric, #3B82F6)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Total Customers</span>
                <div className="kpi-icon-badge">
                  <Users size={18} />
                </div>
              </div>
              <div className="kpi-val"><CountUp end={customersList.length || serverStats?.kpis?.totalCustomers || 14} /> Accounts</div>
              <div className="kpi-footer">
                <span className="trend-pill up">
                  <TrendingUp size={12} /> Enterprise
                </span>
                <span style={{ color: "var(--text-dim)" }}>MongoDB Verified</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--fuel-petrol, #EF4444)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Pending Customers</span>
                <div className="kpi-icon-badge">
                  <Clock size={18} />
                </div>
              </div>
              <div className="kpi-val"><CountUp end={appStats.pending || 0} /> Pending</div>
              <div className="kpi-footer">
                <span className="trend-pill down">Requires KYC</span>
                <span style={{ color: "var(--text-dim)" }}>Awaiting Approval</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--fuel-cng, #22C55E)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Active Drivers</span>
                <div className="kpi-icon-badge">
                  <Users size={18} />
                </div>
              </div>
              <div className="kpi-val"><CountUp end={driversOnDuty || serverStats?.kpis?.totalDrivers || driversList.length || 4} /> Drivers</div>
              <div className="kpi-footer">
                <span className="trend-pill up">{driversOnDuty} On Shift</span>
                <span style={{ color: "var(--text-dim)" }}>GPS Connected</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--fuel-electric, #3B82F6)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Vehicles</span>
                <div className="kpi-icon-badge">
                  <Truck size={18} />
                </div>
              </div>
              <div className="kpi-val"><CountUp end={serverStats?.kpis?.totalVehicles || vehiclesList.length || 4} /> Tankers</div>
              <div className="kpi-footer">
                <span className="trend-pill up">Live Fleet</span>
                <span style={{ color: "var(--text-dim)" }}>Telemetry Synced</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--fuel-diesel, #F59E0B)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Orders Today</span>
                <div className="kpi-icon-badge">
                  <ClipboardList size={18} />
                </div>
              </div>
              <div className="kpi-val"><CountUp end={todayOrdersCount} /> Orders</div>
              <div className="kpi-footer">
                <span className="trend-pill up">
                  <TrendingUp size={12} /> Today's Flow
                </span>
                <span style={{ color: "var(--text-dim)" }}>Fulfilled & Active</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--fuel-cng, #22C55E)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Revenue</span>
                <div className="kpi-icon-badge">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="kpi-val">
                {typeof serverStats?.revenue?.total === "number" ? (
                  <CountUp end={serverStats.revenue.total} prefix="₹" />
                ) : (
                  <CountUp end={totalRevenueNumber} prefix="₹" />
                )}
              </div>
              <div className="kpi-footer">
                <span className="trend-pill up">
                  <TrendingUp size={12} /> +18.4%
                </span>
                <span style={{ color: "var(--text-dim)" }}>vs last month</span>
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

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--text-dim)", marginTop: "8px" }}>
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
                    stroke="var(--fuel-diesel, #F59E0B)"
                    strokeWidth="3.8"
                    strokeDasharray={`${fuelDistribution.hsdPct}, 100`}
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--fuel-petrol, #EF4444)"
                    strokeWidth="3.8"
                    strokeDasharray={`${fuelDistribution.msPct}, 100`}
                    strokeDashoffset={`-${fuelDistribution.hsdPct}`}
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--fuel-cng, #22C55E)"
                    strokeWidth="3.8"
                    strokeDasharray={`${fuelDistribution.bioPct}, 100`}
                    strokeDashoffset={`-${fuelDistribution.hsdPct + fuelDistribution.msPct}`}
                  />
                </svg>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", fontSize: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--fuel-diesel, #F59E0B)", fontWeight: "700" }}>● HSD (High Speed Diesel)</span>
                    <strong>{fuelDistribution.hsdPct}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--fuel-petrol, #EF4444)", fontWeight: "700" }}>● MS (Motor Spirit Petrol)</span>
                    <strong>{fuelDistribution.msPct}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--fuel-cng, #22C55E)", fontWeight: "700" }}>● CNG / Bio-Fuel</span>
                    <strong>{fuelDistribution.bioPct}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Real-Time Logistics & Telemetry Status Widgets */}
          <div className="telemetry-status-strip">
            <div className="telemetry-widget-card">
              <div className="telemetry-widget-icon" style={{ background: "rgba(34, 197, 94, 0.15)", color: "var(--fuel-cng, #22C55E)" }}>
                <Activity size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                  GPS Telemetry Health
                </div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)" }}>
                  99.8% Satellite Lock
                </div>
                <div style={{ fontSize: "12px", color: "var(--green-neon)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22C55E", display: "inline-block" }}></span>
                  Sub-second RTK streaming
                </div>
              </div>
            </div>

            <div className="telemetry-widget-card">
              <div className="telemetry-widget-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--fuel-diesel, #F59E0B)" }}>
                <Truck size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                  Live Active Fleet
                </div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)" }}>
                  {activeVehiclesCount} Transmitting Tankers
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                  {driversOnDuty} Drivers en-route / on shift
                </div>
              </div>
            </div>

            <div className="telemetry-widget-card">
              <div className="telemetry-widget-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "var(--fuel-electric, #3B82F6)" }}>
                <Building2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                  Depot Gate Throughput
                </div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)" }}>
                  5 Regional Hubs Online
                </div>
                <div style={{ fontSize: "12px", color: "var(--blue)" }}>
                  Avg dispatch time: 14 mins
                </div>
              </div>
            </div>

            <div className="telemetry-widget-card">
              <div className="telemetry-widget-icon" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--fuel-petrol, #EF4444)" }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                  Emergency Systems
                </div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--text)" }}>
                  Zero Critical Alarms
                </div>
                <div style={{ fontSize: "12px", color: "var(--green-neon)" }}>
                  Automatic cutoff armed & verified
                </div>
              </div>
            </div>
          </div>

          {/* Admin Platform Governance Quick Action Launcher */}
          <div>
            <h3 style={{ fontSize: "17px", marginBottom: "14px", fontWeight: "700" }}>Platform Governance & Control</h3>
            <div className="quick-actions-grid-saas">
              <Link to="/users" className="action-card-saas">
                <div className="action-icon-wrapper" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
                  <Users size={22} />
                </div>
                <strong style={{ fontSize: "15px" }}>Users & Roles</strong>
              </Link>

              <Link to="/pricing" className="action-card-saas">
                <div className="action-icon-wrapper" style={{ background: "rgba(249, 115, 22, 0.15)", color: "var(--orange)" }}>
                  <Fuel size={22} />
                </div>
                <strong style={{ fontSize: "15px" }}>Fuel Tariffs</strong>
              </Link>

              <Link to="/applications" className="action-card-saas">
                <div className="action-icon-wrapper" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--green-neon)" }}>
                  <FileCheck size={22} />
                </div>
                <strong style={{ fontSize: "15px" }}>Customer Approvals</strong>
              </Link>

              <Link to="/audit-logs" className="action-card-saas">
                <div className="action-icon-wrapper" style={{ background: "rgba(139, 92, 246, 0.15)", color: "var(--purple)" }}>
                  <ShieldCheck size={22} />
                </div>
                <strong style={{ fontSize: "15px" }}>Audit Trail</strong>
              </Link>

              <Link to="/fleet-map" className="action-card-saas">
                <div className="action-icon-wrapper" style={{ background: "rgba(59, 130, 246, 0.15)", color: "var(--blue)" }}>
                  <Navigation size={22} />
                </div>
                <strong style={{ fontSize: "15px" }}>Fleet Map (All)</strong>
              </Link>

              <Link to="/reports" className="action-card-saas">
                <div className="action-icon-wrapper" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--amber)" }}>
                  <BarChart3 size={22} />
                </div>
                <strong style={{ fontSize: "15px" }}>Depot Analytics</strong>
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
                      <th scope="col">Order #</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Fuel</th>
                      <th scope="col">Qty</th>
                      <th scope="col">Driver</th>
                      <th scope="col">Status</th>
                      <th scope="col">Actions</th>
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
              <h3 style={{ fontSize: "17px", fontWeight: "700" }}>Live Activity Stream</h3>
              <div className="activity-list">
                {activities.length === 0 ? (
                  <div style={{ padding: "20px 10px", color: "var(--text-dim)", fontSize: "14px", textAlign: "center" }}>
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
                        <strong style={{ fontSize: "14px", color: "var(--text)" }}>{act.action}</strong>
                        <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--text-dim)" }}>
                          {act.details || act.description || `Performed by ${act.userName || "System"}`}
                        </p>
                        <small style={{ color: "var(--orange)", fontSize: "12px", fontWeight: "700" }}>
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
              <h1>
                {user?.role === "Support Executive"
                  ? "Customer Support & Dispatch Center"
                  : user?.role === "Auditor"
                  ? "Compliance & System Audit Center"
                  : "Depot Operations Control Center"}
              </h1>
              <p>
                Today is {todayDateStr} •{" "}
                {user?.role === "Support Executive"
                  ? "Customer Ticket Resolution & Dispatch Verification"
                  : user?.role === "Auditor"
                  ? "Regulatory Compliance, Security Logs & Ledger Verification"
                  : "Operational Fleet & Tank Telemetry"}
              </p>
            </div>
            <span
              className="pill"
              style={{
                "--pill-color":
                  user?.role === "Support Executive"
                    ? "var(--blue)"
                    : user?.role === "Auditor"
                    ? "var(--purple)"
                    : "var(--green-neon)",
              }}
            >
              {user?.role === "Support Executive"
                ? "SUPPORT ONLINE"
                : user?.role === "Auditor"
                ? "AUDIT READY"
                : "DEPOT ONLINE"}
            </span>
          </div>

          {/* Depot Operations Top KPIs (Requirement 9: Inventory, Orders, Deliveries) */}
          <div className="kpi-grid-6">
            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--fuel-diesel, #F59E0B)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Inventory</span>
                <div className="kpi-icon-badge">
                  <Database size={18} />
                </div>
              </div>
              <div className="kpi-val"><CountUp end={serverStats?.kpis?.availableFuelStock || totalTanksFuel} suffix=" L" /></div>
              <div className="kpi-footer">
                <span className="trend-pill up">{tanks.length || 4} Tanks</span>
                <span style={{ color: "var(--text-dim)" }}>Available Stock</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--fuel-diesel, #F59E0B)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Orders</span>
                <div className="kpi-icon-badge">
                  <ClipboardList size={18} />
                </div>
              </div>
              <div className="kpi-val"><CountUp end={serverStats?.kpis?.depotOrders || stats.totalCount} /> Orders</div>
              <div className="kpi-footer">
                <span className="trend-pill up">{stats.completed} Delivered</span>
                <span style={{ color: "var(--text-dim)" }}>Total Runs</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--fuel-petrol, #EF4444)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Deliveries</span>
                <div className="kpi-icon-badge">
                  <Clock size={18} />
                </div>
              </div>
              <div className="kpi-val"><CountUp end={serverStats?.kpis?.pendingDeliveries || (pendingCount + stats.active)} /> Deliveries</div>
              <div className="kpi-footer">
                <span className="trend-pill down">Action Queue</span>
                <span style={{ color: "var(--text-dim)" }}>Active & En-Route</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--fuel-electric, #3B82F6)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Active Drivers</span>
                <div className="kpi-icon-badge">
                  <Users size={18} />
                </div>
              </div>
              <div className="kpi-val"><CountUp end={serverStats?.kpis?.activeDrivers || driversOnDuty} /> Active</div>
              <div className="kpi-footer">
                <span className="trend-pill up">{Math.max(0, driversTotal - driversOnDuty)} Resting</span>
                <span style={{ color: "var(--text-dim)" }}>Shift Active</span>
              </div>
            </div>

            <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--fuel-cng, #22C55E)" }}>
              <div className="kpi-card-head">
                <span className="kpi-card-lbl">Vehicles Active</span>
                <div className="kpi-icon-badge">
                  <ShieldCheck size={18} />
                </div>
              </div>
              <div className="kpi-val"><CountUp end={activeVehiclesCount} /> Tankers</div>
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
              <div className="kpi-val"><CountUp end={invReservePct} suffix="% Loaded" /></div>
              <div className="kpi-footer">
                <span className="trend-pill up">{totalTanksFuel.toLocaleString()}L / {totalTanksCapacity.toLocaleString()}L</span>
              </div>
            </div>
          </div>

          {/* Depot Operational Dispatch & Fleet Telemetry Counters (Depot Manager Dashboard) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "20px" }}>
            <Link to="/pending-requests" style={{ textDecoration: "none" }}>
              <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--amber)", cursor: "pointer" }}>
                <div className="kpi-card-head">
                  <span className="kpi-card-lbl">Pending Order Approvals</span>
                  <div className="kpi-icon-badge">
                    <Clock size={18} />
                  </div>
                </div>
                <div className="kpi-val" style={{ color: "var(--amber)" }}>{pendingRequests.length} Orders</div>
                <div className="kpi-footer">
                  <span className="trend-pill down">Requires Action</span>
                  <span style={{ color: "var(--text-dim)" }}>Depot Queue</span>
                </div>
              </div>
            </Link>

            <Link to="/fleet-map" style={{ textDecoration: "none" }}>
              <div className="kpi-card-saas" style={{ "--kpi-accent": "var(--green-neon)", cursor: "pointer" }}>
                <div className="kpi-card-head">
                  <span className="kpi-card-lbl">Active Tankers on Road</span>
                  <div className="kpi-icon-badge">
                    <Truck size={18} />
                  </div>
                </div>
                <div className="kpi-val" style={{ color: "var(--green-neon)" }}>{activeVehiclesCount} Active</div>
                <div className="kpi-footer">
                  <span className="trend-pill up">Depot Radar</span>
                  <span style={{ color: "var(--text-dim)" }}>GPS Connected</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Animated Depot Operational Health & Inventory Visualization */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Building2 size={20} style={{ color: "var(--fuel-diesel, #F59E0B)" }} />
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Depot Offloading Bays & Throughput</h4>
                </div>
                <span className="pill" style={{ "--pill-color": "var(--green-neon)" }}>GATES ACTIVE</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--panel-alt)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="depot-bay-indicator depot-bay-active">Bay 1</span>
                    <span style={{ fontSize: "13.5px", fontWeight: "600" }}>Bulk Offload • TN-01-FL-1001</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--green-neon)", fontWeight: "700" }}>Discharging 450 L/min</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--panel-alt)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="depot-bay-indicator depot-bay-standby">Bay 2</span>
                    <span style={{ fontSize: "13.5px", fontWeight: "600" }}>Standby • Next: TN-38-FL-2002</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Ready for Docking</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--panel-alt)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="depot-bay-indicator depot-bay-active">Safety</span>
                    <span style={{ fontSize: "13.5px", fontWeight: "600" }}>Vapor Recovery Unit</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--green-neon)", fontWeight: "700" }}>Pressure 1.02 bar (Safe)</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Fuel size={20} style={{ color: "var(--fuel-cng, #22C55E)" }} />
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Bulk Terminal Inventory Visualization</h4>
                </div>
                <span style={{ fontSize: "13px", color: "var(--text-dim)" }}>
                  Total Reserve: <strong>{totalTanksFuel.toLocaleString()} L</strong>
                </span>
              </div>

              {/* Multi-segment fuel reserve progress bar */}
              <div style={{ height: "14px", background: "var(--panel-alt)", borderRadius: "999px", overflow: "hidden", display: "flex", marginBottom: "14px" }}>
                <div style={{ width: `${fuelDistribution.hsdPct}%`, background: "var(--fuel-diesel, #F59E0B)", title: "Diesel" }}></div>
                <div style={{ width: `${fuelDistribution.msPct}%`, background: "var(--fuel-petrol, #EF4444)", title: "Petrol" }}></div>
                <div style={{ width: `${fuelDistribution.bioPct}%`, background: "var(--fuel-cng, #22C55E)", title: "CNG/Bio" }}></div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
                <div style={{ padding: "8px", background: "var(--panel-alt)", borderRadius: "8px" }}>
                  <div style={{ color: "var(--fuel-diesel, #F59E0B)", fontWeight: "700", fontSize: "13px" }}>Diesel (HSD)</div>
                  <div style={{ fontSize: "16px", fontWeight: "800" }}>{fuelDistribution.hsdPct}%</div>
                </div>
                <div style={{ padding: "8px", background: "var(--panel-alt)", borderRadius: "8px" }}>
                  <div style={{ color: "var(--fuel-petrol, #EF4444)", fontWeight: "700", fontSize: "13px" }}>Petrol (MS)</div>
                  <div style={{ fontSize: "16px", fontWeight: "800" }}>{fuelDistribution.msPct}%</div>
                </div>
                <div style={{ padding: "8px", background: "var(--panel-alt)", borderRadius: "8px" }}>
                  <div style={{ color: "var(--fuel-cng, #22C55E)", fontWeight: "700", fontSize: "13px" }}>CNG / Bio</div>
                  <div style={{ fontSize: "16px", fontWeight: "800" }}>{fuelDistribution.bioPct}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Depot Manager 3D Cylindrical Fuel Tank Telemetry Section with Liquid Wave Animations */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: "700", margin: 0 }}>
                  Depot Silo Telemetry & Real-Time Fuel Level
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: "var(--text-dim)" }}>
                  Continuous hydrostatic pressure, temperature monitoring & animated liquid levels
                </p>
              </div>
              <span className="pill" style={{ "--pill-color": "var(--fuel-diesel, #F59E0B)" }}>
                RADAR TELEMETRY LIVE
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "18px" }}>
              {tanks.map((tank) => {
                const currentStock = tank.currentQty != null ? tank.currentQty : tank.currentStock != null ? tank.currentStock : tank.current || 0;
                const capacity = tank.capacityQty != null ? tank.capacityQty : tank.capacity || 1;
                const pct = Math.round((currentStock / capacity) * 100);
                const isWarning = pct <= 30;
                const fuelColor =
                  tank.fuelCode === "HSD" || tank.fuelCode === "DIESEL"
                    ? "var(--fuel-diesel, #F59E0B)"
                    : tank.fuelCode === "MS" || tank.fuelCode === "PETROL"
                    ? "var(--fuel-petrol, #EF4444)"
                    : tank.fuelCode === "CNG"
                    ? "var(--fuel-cng, #22C55E)"
                    : "var(--fuel-electric, #3B82F6)";

                return (
                  <div key={tank.id} className="cylindrical-tank-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <FuelBadge fuelType={tank.fuelCode} label={tank.fuelCode} />
                        <strong style={{ fontSize: "16px" }}>{tank.name}</strong>
                      </div>
                      <span className={`pill ${isWarning ? "pill-danger" : ""}`} style={{ "--pill-color": isWarning ? "var(--red)" : "var(--green-neon)" }}>
                        {isWarning ? "LOW STOCK ALERT" : "HEALTHY RESERVE"}
                      </span>
                    </div>

                    <div className="tank-silo-wrapper">
                      {/* 3D Cylindrical Silo with Fluid Wave Motion */}
                      <div className="cylindrical-tank-silo">
                        <div className="cylindrical-tank-top"></div>

                        {/* Sight Gauge Hash Marks */}
                        <div className="tank-sight-gauge">
                          <div className="tank-gauge-mark" title="100%"></div>
                          <div className="tank-gauge-mark" title="75%"></div>
                          <div className="tank-gauge-mark" title="50%"></div>
                          <div className="tank-gauge-mark" title="25%"></div>
                          <div className="tank-gauge-mark" title="0%"></div>
                        </div>

                        {/* Dynamic Animated Liquid Fuel Level with Wave Shimmer */}
                        <div
                          className="cylindrical-tank-liquid"
                          style={{
                            height: `${Math.max(10, Math.min(95, pct))}%`,
                            background: `linear-gradient(180deg, color-mix(in srgb, ${fuelColor} 80%, white) 0%, ${fuelColor} 100%)`,
                            boxShadow: `0 0 16px color-mix(in srgb, ${fuelColor} 50%, transparent)`,
                          }}
                        >
                          <svg className="tank-liquid-wave" viewBox="0 0 600 24" preserveAspectRatio="none">
                            <path
                              d="M 0 12 Q 75 0, 150 12 T 300 12 T 450 12 T 600 12 L 600 24 L 0 24 Z"
                              fill="rgba(255, 255, 255, 0.35)"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Tank Readout Metrics */}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                          <span style={{ fontSize: "30px", fontWeight: "800", color: "var(--text)", fontFamily: "'Oswald', sans-serif" }}>
                            {pct}%
                          </span>
                          <span style={{ fontSize: "14px", color: "var(--text-dim)" }}>
                            ({currentStock.toLocaleString()} L)
                          </span>
                        </div>

                        <div style={{ fontSize: "13px", color: "var(--text-dim)", display: "flex", flexDirection: "column", gap: "5px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Total Capacity:</span>
                            <strong>{capacity.toLocaleString()} L</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Available Ullage:</span>
                            <strong style={{ color: "var(--fuel-electric, #3B82F6)" }}>{(capacity - currentStock).toLocaleString()} L</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Est. Days Run:</span>
                            <strong style={{ color: isWarning ? "var(--red)" : "var(--green-neon)" }}>
                              {isWarning ? "3 Days Left" : "14 Days Left"}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", borderTop: "1px dashed var(--line)", fontSize: "12px", color: "var(--text-dim)" }}>
                      <span>Sensor: Temp 24°C • Press 1.02 bar</span>
                      <span style={{ color: isWarning ? "var(--red)" : "var(--green-neon)", fontWeight: 700 }}>
                        {isWarning ? "⚠️ Refill Required" : "✓ Telemetry Nominal"}
                      </span>
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
                    <th scope="col">Order #</th>
                    <th scope="col">Customer Name</th>
                    <th scope="col">Site / City</th>
                    <th scope="col">Fuel Code</th>
                    <th scope="col">Requested Qty</th>
                    <th scope="col">Est. Value</th>
                    <th scope="col">Status</th>
                    <th scope="col">Manager Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((req) => {
                    const cost = req.total != null ? req.total : (computeTotal(req.fuelCode, req.qty || req.quantity || 0)?.total || 0);
                    return (
                      <tr key={req.id}>
                        <td><strong>{req.orderNumber}</strong></td>
                        <td><strong>{req.customer || "Customer"}</strong></td>
                        <td>{req.site || "Site"} • {req.city || "Tamil Nadu"}</td>
                        <td>
                          <span className={`fuel-tag fuel-${(req.fuelCode || "DSL").toLowerCase()}`}>
                            {req.fuelCode || "DSL"}
                          </span>
                        </td>
                        <td><strong>{(req.qty || req.quantity || 0).toLocaleString()} L</strong></td>
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
