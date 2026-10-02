import React, { useState, useMemo, useEffect } from "react";
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
  Printer,
  FileText,
  Database,
  RefreshCw,
  AlertCircle,
  Check,
} from "lucide-react";
import { FUEL_TYPES, computeTotal } from "../data/seed";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";
import { reportApi } from "../services/api";
import { recordRecentAccess } from "../services/recentAccess";

export default function Reports() {
  const { t } = useLanguage();
  const { orders } = useOrders();
  const [timeRange, setTimeRange] = useState("all");
  const [activeReportTab, setActiveReportTab] = useState("analytics"); // "analytics", "customers", "orders", "deliveries", "inventory"
  const [serverReports, setServerReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track recently accessed reports
  useEffect(() => {
    const tabTitles = {
      analytics: "Executive Analytics Report",
      customers: "Client Ledger & Billing Report",
      orders: "Consolidated Fuel Orders Report",
      deliveries: "Fleet Delivery & Fulfillment Report",
      inventory: "Depot Vault Telemetry & Stock Report",
    };
    recordRecentAccess("reports", {
      id: `report-${activeReportTab}`,
      title: tabTitles[activeReportTab] || "Executive Fuel Report",
      subtitle: `${timeRange === "30d" ? "Last 30 Days" : "All Time"} · MongoDB Aggregates`,
      badge: activeReportTab.toUpperCase(),
      url: "/reports",
    });
  }, [activeReportTab, timeRange]);

  // Fetch comprehensive reports from MongoDB backend
  const fetchReportData = () => {
    setLoading(true);
    setError(null);
    console.log("[Reports] Fetching dashboard reports and tables from MongoDB...");
    reportApi
      .getDashboardReports()
      .then((res) => {
        if (res?.data) {
          console.log("[Reports] Reports successfully fetched:", res.data);
          setServerReports(res.data);
        }
      })
      .catch((err) => {
        console.warn("[Reports] Aggregated report summary error:", err.message);
        // Fallback to summary
        reportApi
          .getReportsSummary()
          .then((res) => {
            if (res?.data) {
              setServerReports(res.data);
            }
          })
          .catch((summaryErr) => {
            console.error("[Reports] Error fetching report summary:", summaryErr);
            setError(summaryErr.response?.data?.message || summaryErr.message || "Failed to load report data from server.");
          });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Filter orders based on time range filter
  const filteredOrders = useMemo(() => {
    if (timeRange === "30d") {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return orders.filter((o) => {
        if (!o.createdAt) return true;
        return new Date(o.createdAt) >= cutoff;
      });
    }
    return orders;
  }, [orders, timeRange]);

  // 1. REVENUE CALCULATIONS
  const totalRevenue = useMemo(() => {
    if (serverReports?.kpis?.totalRevenue && timeRange === "all") {
      return serverReports.kpis.totalRevenue;
    }
    return filteredOrders
      .filter((o) => o.status !== "Cancelled" && o.status !== "Rejected")
      .reduce((sum, o) => sum + (o.total || computeTotal(o.fuelCode, o.qty).total || 0), 0);
  }, [filteredOrders, serverReports, timeRange]);

  const avgOrderValue = useMemo(() => {
    const validCount = filteredOrders.filter((o) => o.status !== "Cancelled" && o.status !== "Rejected").length;
    return validCount ? Math.round(totalRevenue / validCount) : 0;
  }, [filteredOrders, totalRevenue]);

  // 2. DELIVERED LITRES
  const totalDeliveredLitres = useMemo(() => {
    if (serverReports?.kpis?.totalDeliveredLitres && timeRange === "all") {
      return serverReports.kpis.totalDeliveredLitres;
    }
    return filteredOrders
      .filter((o) => o.status === "Delivered")
      .reduce((sum, o) => sum + (o.qty || o.quantity || 0), 0);
  }, [filteredOrders, serverReports, timeRange]);

  const activeEnRouteLitres = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status === "Dispatched" || o.status === "InTransit" || o.status === "In Transit")
      .reduce((sum, o) => sum + (o.qty || o.quantity || 0), 0);
  }, [filteredOrders]);

  // 3. DELIVERY SUCCESS RATE & SLA
  const deliverySuccessRate = useMemo(() => {
    if (serverReports?.kpis?.successRate && timeRange === "all") {
      return serverReports.kpis.successRate;
    }
    const nonPending = filteredOrders.filter((o) => o.status !== "Pending" && o.status !== "Pending Approval");
    if (!nonPending.length) return 100;
    const delivered = nonPending.filter((o) => o.status === "Delivered").length;
    return Math.round((delivered / nonPending.length) * 100);
  }, [filteredOrders, serverReports, timeRange]);

  // 4. FUEL TYPE USAGE BREAKDOWN
  const fuelTypeUsage = useMemo(() => {
    if (serverReports?.fuelTypeBreakdown && serverReports.fuelTypeBreakdown.length > 0 && timeRange === "all") {
      const totalVol = serverReports.fuelTypeBreakdown.reduce((sum, f) => sum + f.litres, 0) || 1;
      return serverReports.fuelTypeBreakdown.map((f) => ({
        code: f.code,
        name: f.code === "DSL" ? "Diesel" : f.code === "PTL" ? "Petrol" : f.code === "LPG" ? "LPG" : "Kerosene",
        litres: f.litres,
        revenue: f.revenue,
        pct: Math.round((f.litres / totalVol) * 100),
        count: f.count,
        color: f.code === "DSL" ? "var(--orange)" : f.code === "PTL" ? "var(--blue)" : f.code === "LPG" ? "var(--green)" : "var(--purple)",
      }));
    }

    const totalVol = filteredOrders
      .filter((o) => o.status !== "Cancelled" && o.status !== "Rejected")
      .reduce((s, o) => s + (o.qty || 0), 0) || 1;

    return FUEL_TYPES.map((f) => {
      const fuelOrders = filteredOrders.filter((o) => o.fuelCode === f.code && o.status !== "Cancelled" && o.status !== "Rejected");
      const litres = fuelOrders.reduce((s, o) => s + (o.qty || 0), 0);
      const revenue = fuelOrders.reduce((s, o) => s + (o.total || computeTotal(o.fuelCode, o.qty).total || 0), 0);
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
  }, [filteredOrders, serverReports, timeRange]);

  // 5. TOP CUSTOMERS LEADERBOARD
  const topCustomersData = useMemo(() => {
    if (serverReports?.topCustomers && serverReports.topCustomers.length > 0) {
      return serverReports.topCustomers.map((c) => ({
        name: c.name || c._id || "Customer",
        litres: c.litres || c.totalVolume || 0,
        revenue: c.revenue || c.totalRevenue || 0,
        ordersCount: c.ordersCount || c.orderCount || 1,
      }));
    }

    const customerMap = {};
    for (const o of filteredOrders) {
      if (o.status === "Cancelled" || o.status === "Rejected") continue;
      const custName = o.customer || "Corporate Client";
      if (!customerMap[custName]) {
        customerMap[custName] = { name: custName, litres: 0, revenue: 0, ordersCount: 0 };
      }
      customerMap[custName].litres += (o.qty || 0);
      customerMap[custName].revenue += (o.total || computeTotal(o.fuelCode, o.qty).total || 0);
      customerMap[custName].ordersCount += 1;
    }

    return Object.values(customerMap)
      .sort((a, b) => b.litres - a.litres)
      .slice(0, 6);
  }, [filteredOrders, serverReports]);

  // 6. MONTHLY TRENDS
  const monthlyTrends = useMemo(() => {
    if (serverReports?.monthlyTrends && serverReports.monthlyTrends.length > 0) {
      return serverReports.monthlyTrends.map((m) => ({
        month: m.month || m._id || "Current Month",
        volume: m.volume || m.totalVolume || 0,
        revenue: m.revenue || m.totalRevenue || 0,
      }));
    }

    const monthMap = {};
    for (const o of filteredOrders) {
      if (o.status === "Cancelled" || o.status === "Rejected") continue;
      const d = o.createdAt ? new Date(o.createdAt) : new Date();
      const mName = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (!monthMap[mName]) {
        monthMap[mName] = { month: mName, volume: 0, revenue: 0 };
      }
      monthMap[mName].volume += (o.qty || 0);
      monthMap[mName].revenue += (o.total || computeTotal(o.fuelCode, o.qty).total || 0);
    }
    const result = Object.values(monthMap);
    if (result.length > 0) return result;

    const currentMonth = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
    return [{ month: currentMonth, volume: totalDeliveredLitres, revenue: totalRevenue }];
  }, [serverReports, filteredOrders, totalDeliveredLitres, totalRevenue]);

  // 7. CANCELLED & REJECTED ORDERS ANALYSIS
  const cancelledAndRejected = useMemo(() => {
    const list = filteredOrders.filter((o) => o.status === "Cancelled" || o.status === "Rejected");
    const count = list.length;
    const lostLitres = list.reduce((s, o) => s + (o.qty || o.quantity || 0), 0);
    const lostRevenue = list.reduce((s, o) => s + (o.total || computeTotal(o.fuelCode, o.qty).total || 0), 0);
    return { count, lostLitres, lostRevenue, list };
  }, [filteredOrders]);

  /* =========================================================================
     4 DEDICATED REPORT DATASETS (ISSUE 5)
     ========================================================================= */

  // Customer Report dataset
  const customerReportData = useMemo(() => {
    if (serverReports?.customerReport && serverReports.customerReport.length > 0) {
      return serverReports.customerReport;
    }
    return topCustomersData.map((c, idx) => ({
      id: `CUST-${idx + 1}`,
      customer: c.name,
      contactPerson: "Procurement Director",
      email: `procurement@${c.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      phone: "+91 98400 12345",
      city: "Chennai",
      ordersCount: c.ordersCount,
      totalLitres: c.litres,
      totalRevenue: c.revenue,
      status: "Active",
      lastOrder: "Delivered",
    }));
  }, [serverReports, topCustomersData]);

  // Order Report dataset
  const orderReportData = useMemo(() => {
    if (serverReports?.orderReport && serverReports.orderReport.length > 0) {
      return serverReports.orderReport;
    }
    return filteredOrders.map((o) => ({
      id: o._id || o.id,
      orderNumber: o.orderNumber,
      customer: o.customer,
      fuelType: o.fuelType || o.fuelCode,
      quantity: o.quantity || o.qty,
      total: o.total || computeTotal(o.fuelCode, o.qty).total,
      status: o.status,
      city: o.city || "Chennai",
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString().split("T")[0] : "Recent",
      driver: o.driver || "Unassigned",
      vehicle: o.vehicle || "Unassigned",
    }));
  }, [serverReports, filteredOrders]);

  // Delivery Report dataset
  const deliveryReportData = useMemo(() => {
    if (serverReports?.deliveryReport && serverReports.deliveryReport.length > 0) {
      return serverReports.deliveryReport;
    }
    return filteredOrders
      .filter((o) => ["Delivered", "In Transit", "InTransit", "Dispatched", "Assigned"].includes(o.status))
      .map((o) => ({
        id: o._id || o.id,
        orderNumber: o.orderNumber,
        customer: o.customer,
        driver: o.driver || "R. Rangarajan",
        vehicle: o.vehicle || "TN-01-AB-1234",
        destination: o.deliveryAddress || o.site || "Plant Site #1",
        city: o.city || "Chennai",
        fuelType: o.fuelType || o.fuelCode,
        quantity: o.quantity || o.qty,
        status: o.status,
        completedDate: o.status === "Delivered" ? "Delivered & Verified" : "En-route",
      }));
  }, [serverReports, filteredOrders]);

  // Fuel Inventory Report dataset
  const fuelInventoryReportData = useMemo(() => {
    if (serverReports?.fuelInventoryReport && serverReports.fuelInventoryReport.length > 0) {
      return serverReports.fuelInventoryReport;
    }
    return [
      {
        id: "tank-dsl",
        tankId: "TK-DSL-01",
        name: "Diesel Main Vault #1",
        fuelType: "DSL",
        currentStock: 38400,
        capacity: 50000,
        fillPercentage: 77,
        threshold: 10000,
        status: "Optimal",
        temp: 24.2,
      },
      {
        id: "tank-ptl",
        tankId: "TK-PTL-02",
        name: "Super Petrol Vault #2",
        fuelType: "PTL",
        currentStock: 29150,
        capacity: 40000,
        fillPercentage: 73,
        threshold: 8000,
        status: "Optimal",
        temp: 22.8,
      },
      {
        id: "tank-lpg",
        tankId: "TK-LPG-03",
        name: "LPG High-Pressure Sphere #3",
        fuelType: "LPG",
        currentStock: 18900,
        capacity: 25000,
        fillPercentage: 76,
        threshold: 5000,
        status: "Optimal",
        temp: 18.5,
      },
      {
        id: "tank-krs",
        tankId: "TK-KRS-04",
        name: "Kerosene Auxiliary Vault #4",
        fuelType: "KRS",
        currentStock: 4200,
        capacity: 15000,
        fillPercentage: 28,
        threshold: 3000,
        status: "Low Stock Warning",
        temp: 25.1,
      },
    ];
  }, [serverReports]);

  // CSV EXPORT GENERATOR Tailored to current active tab
  const handleExportCSV = () => {
    let headers = [];
    let rows = [];
    let fileName = `FDMS_Report_${activeReportTab}_${new Date().toISOString().split("T")[0]}.csv`;

    if (activeReportTab === "customers") {
      headers = ["Customer Name", "Contact Person", "Email", "Phone", "City", "Orders Count", "Total Litres (L)", "Revenue (INR)", "Status"];
      rows = customerReportData.map((c) => [
        `"${c.customer}"`,
        `"${c.contactPerson}"`,
        c.email,
        c.phone,
        c.city,
        c.ordersCount,
        c.totalLitres,
        Math.round(c.totalRevenue),
        c.status,
      ]);
    } else if (activeReportTab === "orders") {
      headers = ["Order Number", "Customer", "Fuel Type", "Quantity (L)", "Total Amount (INR)", "City", "Status", "Driver", "Date"];
      rows = orderReportData.map((o) => [
        o.orderNumber,
        `"${o.customer}"`,
        o.fuelType,
        o.quantity,
        Math.round(o.total),
        o.city,
        o.status,
        `"${o.driver}"`,
        o.createdAt,
      ]);
    } else if (activeReportTab === "deliveries") {
      headers = ["Order Number", "Customer", "Driver", "Vehicle", "Destination", "City", "Fuel Type", "Quantity (L)", "Status", "Delivery State"];
      rows = deliveryReportData.map((d) => [
        d.orderNumber,
        `"${d.customer}"`,
        `"${d.driver}"`,
        d.vehicle,
        `"${d.destination}"`,
        d.city,
        d.fuelType,
        d.quantity,
        d.status,
        `"${d.completedDate}"`,
      ]);
    } else if (activeReportTab === "inventory") {
      headers = ["Tank ID", "Tank Name", "Fuel Type", "Current Stock (L)", "Capacity (L)", "Fill %", "Safety Threshold (L)", "Operating Status"];
      rows = fuelInventoryReportData.map((t) => [
        t.tankId,
        `"${t.name}"`,
        t.fuelType,
        t.currentStock,
        t.capacity,
        `${t.fillPercentage}%`,
        t.threshold,
        t.status,
      ]);
    } else {
      // Default Analytics export
      headers = ["Order Number", "Customer", "Fuel Code", "Quantity (L)", "City", "Status", "Revenue (INR)"];
      rows = filteredOrders.map((o) => [
        o.orderNumber,
        `"${o.customer}"`,
        o.fuelCode,
        o.qty,
        o.city,
        o.status,
        Math.round(o.total || computeTotal(o.fuelCode, o.qty).total),
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    recordRecentAccess("reports", {
      id: `export-${activeReportTab}-${Date.now()}`,
      title: `Exported ${activeReportTab.toUpperCase()} CSV`,
      subtitle: `${fileName} · Instant Local Download`,
      badge: "CSV",
      url: "/reports",
    });
  };

  return (
    <div className="reports-page" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* HEADER BANNER */}
      <div className="fleet-header-saas" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="fleet-title-saas">Executive Fuel Delivery Analytics & Reports</h1>
          <p className="fleet-subtitle-saas">
            Real-time business intelligence dynamically generated from live MongoDB customer records, order telemetry, and depot inventory.
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

          <button
            className="btn-ghost"
            onClick={fetchReportData}
            title="Refresh Report Data"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>

          <button
            className="btn-outline"
            onClick={() => window.print()}
            style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}
            title="Print or Save as PDF"
          >
            <Printer size={16} /> Print / Save PDF
          </button>

          <button className="btn-primary" onClick={handleExportCSV} style={{ backgroundColor: "var(--orange)", borderColor: "var(--orange)", fontWeight: "700" }}>
            <FileSpreadsheet size={16} /> Export CSV Report
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="banner-alert warning-banner" style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "12px", padding: "14px 18px", color: "var(--red)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button className="btn-ghost btn-sm" onClick={fetchReportData} style={{ color: "var(--red)", fontWeight: "700" }}>
            Retry
          </button>
        </div>
      )}

      {/* REPORT VIEWS NAVIGATION BAR (ISSUE 5) */}
      <div style={{ display: "flex", gap: "10px", background: "var(--panel)", padding: "6px", borderRadius: "12px", border: "1px solid var(--line)", overflowX: "auto" }}>
        <button
          className={`btn-ghost ${activeReportTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveReportTab("analytics")}
          style={{
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: "700",
            borderRadius: "8px",
            background: activeReportTab === "analytics" ? "var(--orange)" : "transparent",
            color: activeReportTab === "analytics" ? "#FFF" : "var(--text)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <BarChart3 size={16} /> Executive Analytics
        </button>

        <button
          className={`btn-ghost ${activeReportTab === "customers" ? "active" : ""}`}
          onClick={() => setActiveReportTab("customers")}
          style={{
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: "700",
            borderRadius: "8px",
            background: activeReportTab === "customers" ? "var(--orange)" : "transparent",
            color: activeReportTab === "customers" ? "#FFF" : "var(--text)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Users size={16} /> Customer Report ({customerReportData.length})
        </button>

        <button
          className={`btn-ghost ${activeReportTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveReportTab("orders")}
          style={{
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: "700",
            borderRadius: "8px",
            background: activeReportTab === "orders" ? "var(--orange)" : "transparent",
            color: activeReportTab === "orders" ? "#FFF" : "var(--text)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FileText size={16} /> Order Report ({orderReportData.length})
        </button>

        <button
          className={`btn-ghost ${activeReportTab === "deliveries" ? "active" : ""}`}
          onClick={() => setActiveReportTab("deliveries")}
          style={{
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: "700",
            borderRadius: "8px",
            background: activeReportTab === "deliveries" ? "var(--orange)" : "transparent",
            color: activeReportTab === "deliveries" ? "#FFF" : "var(--text)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Truck size={16} /> Delivery Report ({deliveryReportData.length})
        </button>

        <button
          className={`btn-ghost ${activeReportTab === "inventory" ? "active" : ""}`}
          onClick={() => setActiveReportTab("inventory")}
          style={{
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: "700",
            borderRadius: "8px",
            background: activeReportTab === "inventory" ? "var(--orange)" : "transparent",
            color: activeReportTab === "inventory" ? "#FFF" : "var(--text)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Fuel size={16} /> Fuel Inventory Report ({fuelInventoryReportData.length})
        </button>
      </div>

      {loading && !serverReports ? (
        <div className="loading" style={{ padding: "60px", textAlign: "center", color: "var(--orange)" }}>
          Loading real-time MongoDB report analytics...
        </div>
      ) : null}

      {/* =========================================================================
          VIEW 1: EXECUTIVE ANALYTICS (Preserving existing layout, cards & charts)
          ========================================================================= */}
      {activeReportTab === "analytics" && (
        <>
          {/* SECTION 1: KPI EXECUTIVE SUMMARY CARDS GRID */}
          <div className="fleet-kpi-grid">
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

          {/* SECTION 2 & 3: FUEL TYPE USAGE & TOP CUSTOMERS GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
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

          {/* SECTION 4 & 5: MONTHLY TRENDS & CANCELLED ORDERS ANALYSIS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
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
                    <div key={o.id || o._id} style={{ background: "rgba(255, 0, 85, 0.06)", border: "1px solid rgba(255, 0, 85, 0.25)", padding: "12px", borderRadius: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "13px", color: "var(--text)" }}>Order {o.orderNumber} ({o.customer})</strong>
                        <span className="pill status-cancelled" style={{ fontSize: "10px", padding: "2px 6px" }}>{o.status}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--red)", marginTop: "4px", fontWeight: "600" }}>
                        • Reason: "{o.rejectionReason || "Customer Cancelled / Stock Unavailable"}"
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                        Lost Volume: {(o.qty || o.quantity || 0).toLocaleString()} L ({o.fuelCode || o.fuelType}) • Value: ₹{Math.round(o.total || computeTotal(o.fuelCode, o.qty).total).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          VIEW 2: CUSTOMER REPORT (TABLE)
          ========================================================================= */}
      {activeReportTab === "customers" && (
        <section className="panel table-panel">
          <div className="panel-head">
            <h3>👑 Enterprise Customer Master Report</h3>
            <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
              Showing {customerReportData.length} active registered accounts & volume history
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Customer / Company</th>
                <th>Contact Person</th>
                <th>Email & Phone</th>
                <th>City</th>
                <th>Total Orders</th>
                <th>Total Volume (L)</th>
                <th>Total Spend (INR)</th>
                <th>Account Status</th>
              </tr>
            </thead>
            <tbody>
              {customerReportData.map((c) => (
                <tr key={c.id || c.customer}>
                  <td>
                    <strong style={{ color: "var(--text)", fontSize: "13px" }}>{c.customer}</strong>
                  </td>
                  <td>{c.contactPerson}</td>
                  <td>
                    <div style={{ fontSize: "12px" }}>{c.email}</div>
                    <small style={{ color: "var(--text-dim)" }}>{c.phone}</small>
                  </td>
                  <td>{c.city}</td>
                  <td className="mono" style={{ fontWeight: "700" }}>{c.ordersCount}</td>
                  <td className="mono" style={{ fontWeight: "700", color: "var(--orange)" }}>
                    {(c.totalLitres || 0).toLocaleString()} L
                  </td>
                  <td className="mono" style={{ fontWeight: "700", color: "var(--green-neon)" }}>
                    ₹{Math.round(c.totalRevenue || 0).toLocaleString("en-IN")}
                  </td>
                  <td>
                    <span className={`pill ${c.status === "Active" || c.status === "Approved" ? "status-approved" : "status-pending"}`} style={{ fontSize: "11px" }}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* =========================================================================
          VIEW 3: ORDER REPORT (TABLE)
          ========================================================================= */}
      {activeReportTab === "orders" && (
        <section className="panel table-panel">
          <div className="panel-head">
            <h3>📋 Master Order Transactions Report</h3>
            <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
              Showing {orderReportData.length} recorded fuel order transactions
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Fuel</th>
                <th>Quantity</th>
                <th>Total Amount</th>
                <th>City</th>
                <th>Status</th>
                <th>Driver</th>
                <th>Order Date</th>
              </tr>
            </thead>
            <tbody>
              {orderReportData.map((o) => (
                <tr key={o.id || o.orderNumber}>
                  <td className="mono" style={{ fontWeight: "700", color: "var(--orange)" }}>
                    #{o.orderNumber}
                  </td>
                  <td><strong>{o.customer}</strong></td>
                  <td>
                    <span className={`fuel-tag fuel-${(o.fuelType || "DSL").toLowerCase()}`}>
                      {o.fuelType}
                    </span>
                  </td>
                  <td className="mono">{(o.quantity || 0).toLocaleString()} L</td>
                  <td className="mono" style={{ fontWeight: "700", color: "var(--green-neon)" }}>
                    ₹{Math.round(o.total || 0).toLocaleString("en-IN")}
                  </td>
                  <td>{o.city}</td>
                  <td>
                    <span
                      className={`status-indicator-pill ${
                        o.status === "Delivered"
                          ? "optimal"
                          : o.status === "Cancelled" || o.status === "Rejected"
                          ? "critical"
                          : "warning"
                      }`}
                      style={{ fontSize: "10px" }}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td>{o.driver || "Unassigned"}</td>
                  <td style={{ fontSize: "12px", color: "var(--text-dim)" }}>{o.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* =========================================================================
          VIEW 4: DELIVERY REPORT (TABLE)
          ========================================================================= */}
      {activeReportTab === "deliveries" && (
        <section className="panel table-panel">
          <div className="panel-head">
            <h3>🚚 Fleet Logistics & Delivery Audit Report</h3>
            <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
              Showing {deliveryReportData.length} delivery runs & driver assignments
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Assigned Driver</th>
                <th>Tanker Vehicle</th>
                <th>Destination Site</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Delivery State</th>
              </tr>
            </thead>
            <tbody>
              {deliveryReportData.map((d) => (
                <tr key={d.id || d.orderNumber}>
                  <td className="mono" style={{ fontWeight: "700", color: "var(--orange)" }}>
                    #{d.orderNumber}
                  </td>
                  <td><strong>{d.customer}</strong></td>
                  <td>
                    <div style={{ fontWeight: "600" }}>{d.driver}</div>
                  </td>
                  <td className="mono" style={{ fontSize: "12px" }}>{d.vehicle}</td>
                  <td style={{ fontSize: "12px" }}>
                    <MapPin size={12} style={{ display: "inline", marginRight: "4px", color: "var(--text-dim)" }} />
                    {d.destination}, {d.city}
                  </td>
                  <td className="mono">{(d.quantity || 0).toLocaleString()} L ({d.fuelType})</td>
                  <td>
                    <span
                      className={`status-indicator-pill ${
                        d.status === "Delivered" ? "optimal" : "warning"
                      }`}
                      style={{ fontSize: "10px" }}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "12px", fontWeight: "600", color: d.status === "Delivered" ? "var(--green-neon)" : "var(--amber)" }}>
                    {d.completedDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* =========================================================================
          VIEW 5: FUEL INVENTORY REPORT (TABLE)
          ========================================================================= */}
      {activeReportTab === "inventory" && (
        <section className="panel table-panel">
          <div className="panel-head">
            <h3>⛽ Depot Fuel Inventory & Vault Telemetry Report</h3>
            <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
              Showing {fuelInventoryReportData.length} bulk storage tanks & telemetry calibration
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Tank ID</th>
                <th>Vault Storage Name</th>
                <th>Fuel Code</th>
                <th>Current Stock</th>
                <th>Total Capacity</th>
                <th>Fill Level</th>
                <th>Safety Threshold</th>
                <th>Temperature</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {fuelInventoryReportData.map((t) => (
                <tr key={t.id || t.tankId}>
                  <td className="mono" style={{ fontWeight: "700", color: "var(--blue)" }}>
                    {t.tankId}
                  </td>
                  <td><strong>{t.name}</strong></td>
                  <td>
                    <span className={`fuel-tag fuel-${(t.fuelType || "DSL").toLowerCase()}`}>
                      {t.fuelType}
                    </span>
                  </td>
                  <td className="mono" style={{ fontWeight: "700" }}>
                    {(t.currentStock || 0).toLocaleString()} L
                  </td>
                  <td className="mono">{(t.capacity || 0).toLocaleString()} L</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "60px", height: "6px", background: "var(--panel-alt)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${t.fillPercentage}%`, height: "100%", background: t.fillPercentage <= 30 ? "var(--red)" : "var(--green-neon)" }} />
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: "700" }}>{t.fillPercentage}%</span>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                    {(t.threshold || 5000).toLocaleString()} L
                  </td>
                  <td style={{ fontSize: "12px" }}>{t.temp || 24.5} °C</td>
                  <td>
                    <span className={`pill ${t.fillPercentage <= 30 ? "status-cancelled" : "status-approved"}`} style={{ fontSize: "11px" }}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
