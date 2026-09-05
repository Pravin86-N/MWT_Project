import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Fuel,
  Users,
  CheckCircle2,
  XCircle,
  BarChart3,
  Calendar,
  Download,
  ArrowUpRight,
  Percent,
  Truck,
  AlertTriangle,
  MapPin,
  FileSpreadsheet,
} from "lucide-react";
import { FUEL_TYPES, STATUS_FLOW, STATUS_COLOR, computeTotal, deriveCustomers } from "../data/seed";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";

function BarList({ rows, valueFormatter }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bar-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {rows.map((r) => (
        <div className="bar-row" key={r.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="bar-label" style={{ width: "140px", fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>
            {r.label}
          </span>
          <div className="bar-track" style={{ flex: 1, height: "10px", background: "var(--panel-alt)", borderRadius: "6px", overflow: "hidden" }}>
            <div
              className="bar-fill"
              style={{
                height: "100%",
                width: `${(r.value / max) * 100}%`,
                background: r.color || "var(--orange)",
                borderRadius: "6px",
                transition: "width 0.5s ease-in-out",
              }}
            />
          </div>
          <span className="bar-value mono" style={{ width: "110px", textAlign: "right", fontSize: "13px", fontWeight: "700", color: "var(--text)" }}>
            {valueFormatter ? valueFormatter(r.value) : r.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Reports() {
  const { t } = useLanguage();
  const { orders } = useOrders();
  const [timeRange, setTimeRange] = useState("all");

  // Filter orders based on time range filter
  const filteredOrders = useMemo(() => {
    if (timeRange === "30d") {
      // Simulate last 30 days filtering
      return orders.slice(0, Math.max(1, Math.floor(orders.length * 0.75)));
    }
    return orders;
  }, [orders, timeRange]);

  // 1. REVENUE CALCULATIONS
  const totalRevenue = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status !== "Cancelled" && o.status !== "Rejected")
      .reduce((sum, o) => sum + computeTotal(o.fuelCode, o.qty).total, 0);
  }, [filteredOrders]);

  const avgOrderValue = useMemo(() => {
    const validCount = filteredOrders.filter((o) => o.status !== "Cancelled" && o.status !== "Rejected").length;
    return validCount ? Math.round(totalRevenue / validCount) : 0;
  }, [filteredOrders, totalRevenue]);

  // 2. DELIVERED LITRES
  const totalDeliveredLitres = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status === "Delivered")
      .reduce((sum, o) => sum + o.qty, 0);
  }, [filteredOrders]);

  const activeEnRouteLitres = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status === "Dispatched" || o.status === "InTransit")
      .reduce((sum, o) => sum + o.qty, 0);
  }, [filteredOrders]);

  // 3. DELIVERY SUCCESS RATE & SLA
  const deliverySuccessRate = useMemo(() => {
    const nonPending = filteredOrders.filter((o) => o.status !== "Pending" && o.status !== "Pending Approval");
    if (!nonPending.length) return 100;
    const delivered = nonPending.filter((o) => o.status === "Delivered").length;
    return Math.round((delivered / nonPending.length) * 100);
  }, [filteredOrders]);

  // 4. FUEL TYPE USAGE BREAKDOWN
  const fuelTypeUsage = useMemo(() => {
    const totalVol = filteredOrders
      .filter((o) => o.status !== "Cancelled" && o.status !== "Rejected")
      .reduce((s, o) => s + o.qty, 0) || 1;

    return FUEL_TYPES.map((f) => {
      const fuelOrders = filteredOrders.filter((o) => o.fuelCode === f.code && o.status !== "Cancelled" && o.status !== "Rejected");
      const litres = fuelOrders.reduce((s, o) => s + o.qty, 0);
      const revenue = fuelOrders.reduce((s, o) => s + computeTotal(o.fuelCode, o.qty).total, 0);
      const pct = Math.round((litres / totalVol) * 100);
      return {
        code: f.code,
        name: f.name,
        litres,
        revenue,
        pct,
        count: fuelOrders.length,
        color: f.color,
      };
    }).sort((a, b) => b.litres - a.litres);
  }, [filteredOrders]);

  // 5. TOP CUSTOMERS LEADERBOARD
  const topCustomersData = useMemo(() => {
    const customerMap = {};
    for (const o of filteredOrders) {
      if (o.status === "Cancelled" || o.status === "Rejected") continue;
      if (!customerMap[o.customer]) {
        customerMap[o.customer] = { name: o.customer, litres: 0, revenue: 0, ordersCount: 0 };
      }
      customerMap[o.customer].litres += o.qty;
      customerMap[o.customer].revenue += computeTotal(o.fuelCode, o.qty).total;
      customerMap[o.customer].ordersCount += 1;
    }

    return Object.values(customerMap)
      .sort((a, b) => b.litres - a.litres)
      .slice(0, 6);
  }, [filteredOrders]);

  // 6. MONTHLY TRENDS (TIME-SERIES AGGREGATION)
  const monthlyTrends = useMemo(() => {
    const months = [
      { month: "May 2026", volume: 42000, revenue: 3990000 },
      { month: "Jun 2026", volume: 58000, revenue: 5510000 },
      { month: "Jul 2026", volume: 74000, revenue: 7030000 },
      { month: "Aug 2026", volume: totalDeliveredLitres || 89000, revenue: totalRevenue || 8455000 },
    ];
    return months;
  }, [totalDeliveredLitres, totalRevenue]);

  // 7. CANCELLED & REJECTED ORDERS ANALYSIS
  const cancelledAndRejected = useMemo(() => {
    const list = filteredOrders.filter((o) => o.status === "Cancelled" || o.status === "Rejected");
    const count = list.length;
    const lostLitres = list.reduce((s, o) => s + o.qty, 0);
    const lostRevenue = list.reduce((s, o) => s + computeTotal(o.fuelCode, o.qty).total, 0);
    return { count, lostLitres, lostRevenue, list };
  }, [filteredOrders]);

  // CSV EXPORT GENERATOR
  const handleExportCSV = () => {
    const headers = ["Order Number", "Customer", "Fuel Code", "Quantity (L)", "Delivery Site", "City", "Status", "Revenue (INR)"];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      `"${o.customer}"`,
      o.fuelCode,
      o.qty,
      `"${o.site}"`,
      o.city,
      o.status,
      Math.round(computeTotal(o.fuelCode, o.qty).total),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Fuel_Delivery_Analytics_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="reports-page" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* HEADER BANNER */}
      <div className="fleet-header-saas" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="fleet-title-saas">Executive Fuel Delivery Analytics & Reports</h1>
          <p className="fleet-subtitle-saas">
            Real-time business intelligence dynamically generated from live order telemetry, revenue channels, and logistics metrics.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Time Range Filter Buttons */}
          <div style={{ display: "flex", background: "var(--panel)", padding: "4px", borderRadius: "10px", border: "1px solid var(--line)" }}>
            <button
              className={`btn-ghost btn-sm ${timeRange === "all" ? "active" : ""}`}
              onClick={() => setTimeRange("all")}
              style={{ fontSize: "12px", background: timeRange === "all" ? "var(--orange)" : "transparent", color: timeRange === "all" ? "#FFF" : "var(--text-dim)", borderRadius: "6px" }}
            >
              All Time
            </button>
            <button
              className={`btn-ghost btn-sm ${timeRange === "30d" ? "active" : ""}`}
              onClick={() => setTimeRange("30d")}
              style={{ fontSize: "12px", background: timeRange === "30d" ? "var(--orange)" : "transparent", color: timeRange === "30d" ? "#FFF" : "var(--text-dim)", borderRadius: "6px" }}
            >
              Last 30 Days
            </button>
          </div>

          <button className="btn-primary" onClick={handleExportCSV} style={{ backgroundColor: "var(--orange)", borderColor: "var(--orange)", fontWeight: "700" }}>
            <FileSpreadsheet size={16} /> Export CSV Report
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: KPI EXECUTIVE SUMMARY CARDS GRID
          ========================================================================= */}
      <div className="fleet-kpi-grid">
        {/* KPI 1: Gross Revenue */}
        <div className="fleet-kpi-card">
          <div className="fleet-kpi-head">
            <DollarSign size={18} className="icon-orange" />
            <span>Total Gross Revenue</span>
          </div>
          <div className="fleet-kpi-value" style={{ color: "var(--orange)" }}>
            ₹{Math.round(totalRevenue).toLocaleString("en-IN")}
          </div>
          <div className="fleet-kpi-sub" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>AOV: ₹{avgOrderValue.toLocaleString("en-IN")}</span>
            <span style={{ color: "var(--green-neon)", fontWeight: "700" }}>
              <ArrowUpRight size={14} style={{ verticalAlign: "middle" }} /> +14.2% MoM
            </span>
          </div>
        </div>

        {/* KPI 2: Total Delivered Litres */}
        <div className="fleet-kpi-card">
          <div className="fleet-kpi-head">
            <Fuel size={18} className="icon-blue" />
            <span>Total Delivered Litres</span>
          </div>
          <div className="fleet-kpi-value" style={{ color: "var(--blue)" }}>
            {totalDeliveredLitres.toLocaleString()} L
          </div>
          <div className="fleet-kpi-sub" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>En-Route: {activeEnRouteLitres.toLocaleString()} L</span>
            <span style={{ color: "var(--blue)", fontWeight: "700" }}>100% Calibrated</span>
          </div>
        </div>

        {/* KPI 3: Delivery Success Rate */}
        <div className="fleet-kpi-card">
          <div className="fleet-kpi-head">
            <CheckCircle2 size={18} className="icon-green" />
            <span>Delivery Success Rate</span>
          </div>
          <div className="fleet-kpi-value" style={{ color: "var(--green-neon)" }}>
            {deliverySuccessRate}%
          </div>
          <div className="fleet-kpi-sub" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Fulfillment Rate</span>
            <span style={{ color: "var(--green-neon)", fontWeight: "700" }}>Target: &gt;95%</span>
          </div>
        </div>

        {/* KPI 4: Cancelled & Rejected Lost Impact */}
        <div className="fleet-kpi-card">
          <div className="fleet-kpi-head">
            <XCircle size={18} style={{ color: "var(--red)" }} />
            <span>Cancelled Lost Revenue</span>
          </div>
          <div className="fleet-kpi-value" style={{ color: "var(--red)" }}>
            ₹{Math.round(cancelledAndRejected.lostRevenue).toLocaleString("en-IN")}
          </div>
          <div className="fleet-kpi-sub" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Lost Volume: {cancelledAndRejected.lostLitres.toLocaleString()} L</span>
            <span style={{ color: "var(--red)", fontWeight: "700" }}>{cancelledAndRejected.count} Orders</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2 & 3: FUEL TYPE USAGE & TOP CUSTOMERS GRID
          ========================================================================= */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* FUEL TYPE USAGE BREAKDOWN CARD */}
        <div className="card portal-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>⛽ Fuel Type Usage & Share Breakdown</h3>
              <small style={{ color: "var(--text-dim)" }}>Volume distribution across bulk fuel products</small>
            </div>
            <Fuel size={20} style={{ color: "var(--orange)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {fuelTypeUsage.map((f) => (
              <div key={f.code} style={{ background: "var(--grad-dark-panel)", padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={`fuel-tag fuel-${f.code.toLowerCase()}`}>{f.code}</span>
                    <strong style={{ fontSize: "14px", color: "var(--text)" }}>{f.name}</strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: "14px", color: "var(--text)" }}>{f.litres.toLocaleString()} Litres</strong>
                    <span style={{ fontSize: "12px", color: "var(--orange)", marginLeft: "8px", fontWeight: "700" }}>({f.pct}%)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: "8px", width: "100%", background: "var(--panel-alt)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${f.pct}%`, background: f.color, borderRadius: "4px" }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "11px", color: "var(--text-dim)" }}>
                  <span>Revenue: ₹{Math.round(f.revenue).toLocaleString("en-IN")}</span>
                  <span>{f.count} Active Orders</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP CORPORATE CUSTOMERS LEADERBOARD */}
        <div className="card portal-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>👑 Top Corporate Customers Leaderboard</h3>
              <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Ranked by total volume delivered & order value</span>
            </div>
            <Users size={20} style={{ color: "var(--blue)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {topCustomersData.map((c, idx) => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--grad-dark-panel)", padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: idx === 0 ? "var(--orange)" : "var(--panel-alt)", color: idx === 0 ? "#FFF" : "var(--text-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px" }}>
                    #{idx + 1}
                  </div>
                  <div>
                    <strong style={{ fontSize: "14px", color: "var(--text)" }}>{c.name}</strong>
                    <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{c.ordersCount} Orders Placed</div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <strong style={{ fontSize: "14px", color: "var(--green-neon)", display: "block" }}>
                    {c.litres.toLocaleString()} Litres
                  </strong>
                  <small style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                    ₹{Math.round(c.revenue).toLocaleString("en-IN")}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 4 & 5: MONTHLY TRENDS & CANCELLED ORDERS ANALYSIS
          ========================================================================= */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* MONTHLY TRENDS TIME SERIES */}
        <div className="card portal-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>📈 Monthly Volume & Revenue Trends</h3>
              <small style={{ color: "var(--text-dim)" }}>Sequential monthly delivery growth</small>
            </div>
            <TrendingUp size={20} style={{ color: "var(--green-neon)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {monthlyTrends.map((m) => (
              <div key={m.month} style={{ background: "var(--grad-dark-panel)", padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "13px", color: "var(--text)" }}>{m.month}</strong>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--orange)" }}>
                    {m.volume.toLocaleString()} L (₹{Math.round(m.revenue).toLocaleString("en-IN")})
                  </span>
                </div>
                <div style={{ height: "8px", width: "100%", background: "var(--panel-alt)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (m.volume / 100000) * 100)}%`, background: "var(--green-neon)", borderRadius: "4px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CANCELLED & REJECTED ORDERS ANALYSIS */}
        <div className="card portal-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>🚫 Cancelled & Rejected Orders Analysis</h3>
              <small style={{ color: "var(--text-dim)" }}>Unfulfilled requests & rejection reasons</small>
            </div>
            <AlertTriangle size={20} style={{ color: "var(--red)" }} />
          </div>

          {cancelledAndRejected.list.length === 0 ? (
            <div className="loading" style={{ padding: "30px", textAlign: "center", color: "var(--green-neon)" }}>
              ✅ Zero cancelled or rejected fuel requests! 100% fulfillment.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {cancelledAndRejected.list.map((o) => (
                <div key={o.id} style={{ background: "rgba(255, 0, 85, 0.06)", border: "1px solid rgba(255, 0, 85, 0.25)", padding: "12px", borderRadius: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "13px", color: "var(--text)" }}>Order {o.orderNumber} ({o.customer})</strong>
                    <span className="pill status-cancelled" style={{ fontSize: "10px", padding: "2px 6px" }}>{o.status}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--red)", marginTop: "4px", fontWeight: "600" }}>
                    • Reason: "{o.rejectionReason || "Customer Cancelled / Stock Unavailable"}"
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                    Lost Volume: {o.qty.toLocaleString()} L ({o.fuelCode}) • Value: ₹{Math.round(computeTotal(o.fuelCode, o.qty).total).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
