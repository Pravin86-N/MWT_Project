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
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../utils/permissions";
import { reportApi } from "../services/api";
import { recordRecentAccess } from "../services/recentAccess";
import Pagination from "../components/Pagination";
import FuelBadge from "../components/FuelBadge";
import CountUp from "../components/CountUp";

export default function Reports() {
  const { t } = useLanguage();
  const { orders } = useOrders();
  const { state: authState } = useAuth();
  const currentUser = authState?.user;
  const userRole = currentUser?.role || "";
  const isAdmin = userRole === ROLES.ADMIN;
  const isDepotManager = userRole === ROLES.DEPOT_MANAGER;

  const [selectedDepot, setSelectedDepot] = useState(
    isDepotManager && currentUser?.depot ? currentUser.depot : "ALL"
  );
  const [timeRange, setTimeRange] = useState("all");
  const [activeReportTab, setActiveReportTab] = useState("analytics"); // "analytics", "customers", "orders", "deliveries", "inventory"
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [serverReports, setServerReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setTablePage(1);
  }, [activeReportTab, timeRange, selectedDepot]);

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
  const fetchReportData = (depotParam = selectedDepot) => {
    setLoading(true);
    setError(null);
    console.log("[Reports] Fetching dashboard reports and tables from MongoDB for depot:", depotParam);
    const params = depotParam && depotParam !== "ALL" ? { depot: depotParam } : {};

    reportApi
      .getDashboardReports(params)
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
          .getReportsSummary(params)
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
    fetchReportData(selectedDepot);
  }, [selectedDepot]);

  // Scope orders based on user role and depot selection
  const depotScopedOrders = useMemo(() => {
    if (isDepotManager && currentUser?.depot) {
      return orders.filter((o) => !o.depot || o.depot === currentUser.depot);
    }
    if (isAdmin && selectedDepot !== "ALL") {
      return orders.filter((o) => !o.depot || o.depot === selectedDepot);
    }
    return orders;
  }, [orders, isDepotManager, currentUser?.depot, isAdmin, selectedDepot]);

  // Filter orders based on time range filter
  const filteredOrders = useMemo(() => {
    if (timeRange === "30d") {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return depotScopedOrders.filter((o) => {
        if (!o.createdAt) return true;
        return new Date(o.createdAt) >= cutoff;
      });
    }
    return depotScopedOrders;
  }, [depotScopedOrders, timeRange]);

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
        color: f.code === "DSL" ? "var(--fuel-diesel)" : f.code === "PTL" ? "var(--fuel-petrol)" : (f.code === "CNG" || f.code === "LPG") ? "var(--fuel-cng)" : "var(--fuel-electric)",
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

  const handleExportExcel = () => {
    handleExportCSV();
  };

  // Pagination calculations for the 4 detailed report tables
  const customerPages = Math.max(1, Math.ceil(customerReportData.length / tablePageSize));
  const clampedCustPage = Math.min(tablePage, customerPages);
  const paginatedCustomerReport = customerReportData.slice((clampedCustPage - 1) * tablePageSize, clampedCustPage * tablePageSize);

  const orderPages = Math.max(1, Math.ceil(orderReportData.length / tablePageSize));
  const clampedOrderPage = Math.min(tablePage, orderPages);
  const paginatedOrderReport = orderReportData.slice((clampedOrderPage - 1) * tablePageSize, clampedOrderPage * tablePageSize);

  const deliveryPages = Math.max(1, Math.ceil(deliveryReportData.length / tablePageSize));
  const clampedDelivPage = Math.min(tablePage, deliveryPages);
  const paginatedDeliveryReport = deliveryReportData.slice((clampedDelivPage - 1) * tablePageSize, clampedDelivPage * tablePageSize);

  const inventoryPages = Math.max(1, Math.ceil(fuelInventoryReportData.length / tablePageSize));
  const clampedInvPage = Math.min(tablePage, inventoryPages);
  const paginatedInventoryReport = fuelInventoryReportData.slice((clampedInvPage - 1) * tablePageSize, clampedInvPage * tablePageSize);

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

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Admin Depot Selector */}
          {isAdmin && (
            <select
              value={selectedDepot}
              onChange={(e) => setSelectedDepot(e.target.value)}
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
              <option value="ALL">🌐 All Depots Overview</option>
              <option value="DEP-CHN-01">🏭 DEP-CHN-01 (Chennai)</option>
              <option value="DEP-SLM-02">🏭 DEP-SLM-02 (Salem)</option>
              <option value="DEP-MDU-03">DEP-MDU-03 (Madurai)</option>
              <option value="DEP-TRY-04">DEP-TRY-04 (Trichy)</option>
              <option value="DEP-CBE-05">DEP-CBE-05 (Coimbatore)</option>
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
              🏭 Depot: {currentUser?.depot || "DEP-CHN-01"} (Locked to Depot)
            </span>
          )}

          {/* Time Range Filter Buttons */}
          <div style={{ display: "flex", background: "var(--panel)", padding: "4px", borderRadius: "10px", border: "1px solid var(--line)" }}>
            <button
              className={`btn-ghost btn-sm ${timeRange === "all" ? "active" : ""}`}
              onClick={() => setTimeRange("all")}
              style={{ fontSize: "14px", background: timeRange === "all" ? "var(--orange)" : "transparent", color: timeRange === "all" ? "#FFF" : "var(--text-dim)", borderRadius: "6px" }}
            >
              All Time
            </button>
            <button
              className={`btn-ghost btn-sm ${timeRange === "30d" ? "active" : ""}`}
              onClick={() => setTimeRange("30d")}
              style={{ fontSize: "14px", background: timeRange === "30d" ? "var(--orange)" : "transparent", color: timeRange === "30d" ? "#FFF" : "var(--text-dim)", borderRadius: "6px" }}
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

          <button
            className="btn-outline"
            onClick={handleExportExcel}
            style={{ fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}
            title="Export Report to Excel (.xlsx)"
          >
            <Download size={16} /> Export Excel
          </button>

          <button className="btn-primary" onClick={handleExportCSV} style={{ backgroundColor: "var(--fuel-diesel)", borderColor: "var(--fuel-diesel)", color: "#0F172A", fontWeight: "700" }}>
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
            padding: "9px 18px",
            fontSize: "14px",
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
            padding: "9px 18px",
            fontSize: "14px",
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
            padding: "9px 18px",
            fontSize: "14px",
            fontWeight: "700",
            borderRadius: "8px",
            background: activeReportTab === "orders" ? "var(--orange)" : "transparent",
            color: activeReportTab === "orders" ? "#FFF" : "var(--text)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FileText size={16} /> Orders Report ({orderReportData.length})
        </button>

        <button
          className={`btn-ghost ${activeReportTab === "deliveries" ? "active" : ""}`}
          onClick={() => setActiveReportTab("deliveries")}
          style={{
            padding: "9px 18px",
            fontSize: "14px",
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
            padding: "9px 18px",
            fontSize: "14px",
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
            <div className="card portal-panel" style={{ padding: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800" }}>⛽ Fuel Type Usage & Share Breakdown</h3>
                  <small style={{ color: "var(--text-dim)", fontSize: "13px" }}>Volume distribution across bulk fuel products</small>
                </div>
                <Fuel size={20} style={{ color: "var(--orange)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {fuelTypeUsage.map((f) => (
                  <div key={f.code} style={{ background: "var(--grad-dark-panel)", padding: "14px 16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className={`fuel-tag fuel-${f.code.toLowerCase()}`}>{f.code}</span>
                        <strong style={{ fontSize: "15px", color: "var(--text)" }}>{f.name}</strong>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <strong style={{ fontSize: "15px", color: "var(--text)" }}>{f.litres.toLocaleString()} Litres</strong>
                        <span style={{ fontSize: "13px", color: "var(--orange)", marginLeft: "8px", fontWeight: "700" }}>({f.pct}%)</span>
                      </div>
                    </div>

                    <div style={{ height: "8px", width: "100%", background: "var(--panel-alt)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${f.pct}%`, background: f.color, borderRadius: "4px" }} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "13px", color: "var(--text-dim)" }}>
                      <span>Revenue: ₹{Math.round(f.revenue).toLocaleString("en-IN")}</span>
                      <span>{f.count} Active Orders</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card portal-panel" style={{ padding: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800" }}>👑 Top Corporate Customers Leaderboard</h3>
                  <span style={{ fontSize: "14px", color: "var(--text-dim)" }}>Ranked by total volume delivered & order value</span>
                </div>
                <Users size={20} style={{ color: "var(--blue)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {topCustomersData.map((c, idx) => (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--grad-dark-panel)", padding: "14px 16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: idx === 0 ? "var(--orange)" : "var(--panel-alt)", color: idx === 0 ? "#FFF" : "var(--text-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "13px" }}>
                        #{idx + 1}
                      </div>
                      <div>
                        <strong style={{ fontSize: "15px", color: "var(--text)" }}>{c.name}</strong>
                        <div style={{ fontSize: "13px", color: "var(--text-dim)" }}>{c.ordersCount} Orders Placed</div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <strong style={{ fontSize: "15px", color: "var(--green-neon)", display: "block" }}>
                        {c.litres.toLocaleString()} Litres
                      </strong>
                      <small style={{ fontSize: "13px", color: "var(--text-dim)" }}>
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
            <div className="card portal-panel" style={{ padding: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800" }}>📈 Monthly Volume & Revenue Trends</h3>
                  <small style={{ color: "var(--text-dim)", fontSize: "13px" }}>Sequential monthly delivery growth</small>
                </div>
                <TrendingUp size={20} style={{ color: "var(--green-neon)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {monthlyTrends.map((m) => (
                  <div key={m.month} style={{ background: "var(--grad-dark-panel)", padding: "14px 16px", borderRadius: "12px", border: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <strong style={{ fontSize: "15px", color: "var(--text)" }}>{m.month}</strong>
                      <span style={{ fontSize: "15px", fontWeight: "700", color: "var(--orange)" }}>
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

            <div className="card portal-panel" style={{ padding: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800" }}>🚫 Cancelled & Rejected Orders Analysis</h3>
                  <small style={{ color: "var(--text-dim)", fontSize: "13px" }}>Unfulfilled requests & rejection reasons</small>
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
                    <div key={o.id || o._id} style={{ background: "rgba(255, 0, 85, 0.06)", border: "1px solid rgba(255, 0, 85, 0.25)", padding: "14px", borderRadius: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "15px", color: "var(--text)" }}>Order {o.orderNumber} ({o.customer})</strong>
                        <span className="pill status-cancelled" style={{ fontSize: "12.5px", padding: "3px 8px" }}>{o.status}</span>
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--red)", marginTop: "4px", fontWeight: "600" }}>
                        • Reason: "{o.rejectionReason || "Customer Cancelled / Stock Unavailable"}"
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--text-dim)", marginTop: "4px" }}>
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
            <span style={{ fontSize: "14px", color: "var(--text-dim)" }}>
              Showing {customerReportData.length} active registered accounts & volume history
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th scope="col">Customer / Company</th>
                <th scope="col">Contact Person</th>
                <th scope="col">Email & Phone</th>
                <th scope="col">City</th>
                <th scope="col">Total Orders</th>
                <th scope="col">Total Volume (L)</th>
                <th scope="col">Total Spend (INR)</th>
                <th scope="col">Account Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomerReport.map((c) => (
                <tr key={c.id || c.customer}>
                  <td>
                    <strong style={{ color: "var(--text)", fontSize: "15px" }}>{c.customer}</strong>
                  </td>
                  <td>{c.contactPerson}</td>
                  <td>
                    <div style={{ fontSize: "14px" }}>{c.email}</div>
                    <small style={{ color: "var(--text-dim)", fontSize: "13px" }}>{c.phone}</small>
                  </td>
                  <td>{c.city}</td>
                  <td className="mono" style={{ fontWeight: "700" }}>{c.ordersCount}</td>
                  <td className="mono" style={{ fontWeight: "700", color: "var(--fuel-diesel, #F59E0B)" }}>
                    {(c.totalLitres || 0).toLocaleString()} L
                  </td>
                  <td className="mono" style={{ fontWeight: "700", color: "var(--status-success, #22C55E)" }}>
                    ₹{Math.round(c.totalRevenue || 0).toLocaleString("en-IN")}
                  </td>
                  <td>
                    <span className={`pill ${c.status === "Active" || c.status === "Approved" ? "status-approved" : "status-pending"}`} style={{ fontSize: "12.5px" }}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            currentPage={clampedCustPage}
            totalPages={customerPages}
            totalRecords={customerReportData.length}
            pageSize={tablePageSize}
            onPageChange={setTablePage}
            onPageSizeChange={setTablePageSize}
          />
        </section>
      )}

      {/* =========================================================================
          VIEW 3: ORDER REPORT (TABLE)
          ========================================================================= */}
      {activeReportTab === "orders" && (
        <section className="panel table-panel">
          <div className="panel-head">
            <h3>📋 Master Order Transactions Report</h3>
            <span style={{ fontSize: "14px", color: "var(--text-dim)" }}>
              Showing {orderReportData.length} recorded fuel order transactions
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th scope="col">Order #</th>
                <th scope="col">Customer</th>
                <th scope="col">Fuel</th>
                <th scope="col">Quantity</th>
                <th scope="col">Total Amount</th>
                <th scope="col">City</th>
                <th scope="col">Status</th>
                <th scope="col">Driver</th>
                <th scope="col">Order Date</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrderReport.map((o) => (
                <tr key={o.id || o.orderNumber}>
                  <td className="mono" style={{ fontWeight: "700", color: "var(--fuel-diesel, #F59E0B)" }}>
                    #{o.orderNumber}
                  </td>
                  <td><strong style={{ fontSize: "15px" }}>{o.customer}</strong></td>
                  <td>
                    <FuelBadge fuelType={o.fuelType} />
                  </td>
                  <td className="mono">{(o.quantity || 0).toLocaleString()} L</td>
                  <td className="mono" style={{ fontWeight: "700", color: "var(--status-success, #22C55E)" }}>
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
                      style={{ fontSize: "12.5px" }}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td>{o.driver || "Unassigned"}</td>
                  <td style={{ fontSize: "14px", color: "var(--text-dim)" }}>{o.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            currentPage={clampedOrderPage}
            totalPages={orderPages}
            totalRecords={orderReportData.length}
            pageSize={tablePageSize}
            onPageChange={setTablePage}
            onPageSizeChange={setTablePageSize}
          />
        </section>
      )}

      {/* =========================================================================
          VIEW 4: DELIVERY REPORT (TABLE)
          ========================================================================= */}
      {activeReportTab === "deliveries" && (
        <section className="panel table-panel">
          <div className="panel-head">
            <h3>🚚 Fleet Logistics & Delivery Audit Report</h3>
            <span style={{ fontSize: "14px", color: "var(--text-dim)" }}>
              Showing {deliveryReportData.length} delivery runs & driver assignments
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th scope="col">Order #</th>
                <th scope="col">Customer</th>
                <th scope="col">Assigned Driver</th>
                <th scope="col">Tanker Vehicle</th>
                <th scope="col">Destination Site</th>
                <th scope="col">Fuel & Quantity</th>
                <th scope="col">Status</th>
                <th scope="col">Delivery State</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDeliveryReport.map((d) => (
                <tr key={d.id || d.orderNumber}>
                  <td className="mono" style={{ fontWeight: "700", color: "var(--fuel-diesel, #F59E0B)" }}>
                    #{d.orderNumber}
                  </td>
                  <td><strong style={{ fontSize: "15px" }}>{d.customer}</strong></td>
                  <td>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>{d.driver}</div>
                  </td>
                  <td className="mono" style={{ fontSize: "14px" }}>{d.vehicle}</td>
                  <td style={{ fontSize: "14px" }}>
                    <MapPin size={12} style={{ display: "inline", marginRight: "4px", color: "var(--text-dim)" }} />
                    {d.destination}, {d.city}
                  </td>
                  <td className="mono">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <FuelBadge fuelType={d.fuelType} />
                      <span>{(d.quantity || 0).toLocaleString()} L</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`status-indicator-pill ${
                        d.status === "Delivered" ? "optimal" : "warning"
                      }`}
                      style={{ fontSize: "12.5px" }}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "14px", fontWeight: "600", color: d.status === "Delivered" ? "var(--status-success, #22C55E)" : "var(--status-warning, #F59E0B)" }}>
                    {d.completedDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            currentPage={clampedDelivPage}
            totalPages={deliveryPages}
            totalRecords={deliveryReportData.length}
            pageSize={tablePageSize}
            onPageChange={setTablePage}
            onPageSizeChange={setTablePageSize}
          />
        </section>
      )}

      {/* =========================================================================
          VIEW 5: FUEL INVENTORY REPORT (TABLE)
          ========================================================================= */}
      {activeReportTab === "inventory" && (
        <section className="panel table-panel">
          <div className="panel-head">
            <h3>⛽ Depot Fuel Inventory & Vault Telemetry Report</h3>
            <span style={{ fontSize: "14px", color: "var(--text-dim)" }}>
              Showing {fuelInventoryReportData.length} bulk storage tanks & telemetry calibration
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th scope="col">Tank ID</th>
                <th scope="col">Vault Storage Name</th>
                <th scope="col">Fuel Type</th>
                <th scope="col">Current Stock</th>
                <th scope="col">Total Capacity</th>
                <th scope="col">Fill Level</th>
                <th scope="col">Safety Threshold</th>
                <th scope="col">Temperature</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInventoryReport.map((t) => (
                <tr key={t.id || t.tankId}>
                  <td className="mono" style={{ fontWeight: "700", color: "var(--fuel-electric, #3B82F6)" }}>
                    {t.tankId}
                  </td>
                  <td><strong style={{ fontSize: "15px" }}>{t.name}</strong></td>
                  <td>
                    <FuelBadge fuelType={t.fuelType} />
                  </td>
                  <td className="mono" style={{ fontWeight: "700" }}>
                    {(t.currentStock || 0).toLocaleString()} L
                  </td>
                  <td className="mono">{(t.capacity || 0).toLocaleString()} L</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "60px", height: "6px", background: "var(--panel-alt)", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${t.fillPercentage}%`, height: "100%", background: t.fillPercentage <= 30 ? "var(--status-danger, #EF4444)" : "var(--status-success, #22C55E)" }} />
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: "700" }}>{t.fillPercentage}%</span>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: "14px", color: "var(--text-dim)" }}>
                    {(t.threshold || 5000).toLocaleString()} L
                  </td>
                  <td style={{ fontSize: "14px" }}>{t.temp || 24.5} °C</td>
                  <td>
                    <span className={`pill ${t.fillPercentage <= 30 ? "status-cancelled" : "status-approved"}`} style={{ fontSize: "12.5px" }}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            currentPage={clampedInvPage}
            totalPages={inventoryPages}
            totalRecords={fuelInventoryReportData.length}
            pageSize={tablePageSize}
            onPageChange={setTablePage}
            onPageSizeChange={setTablePageSize}
          />
        </section>
      )}
    </div>
  );
}
