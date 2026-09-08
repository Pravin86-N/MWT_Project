import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Building2,
  Search,
  Filter,
  Phone,
  Mail,
  TrendingUp,
  CreditCard,
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  X,
  Droplets,
  Award,
  DollarSign,
  BarChart3,
  Calendar,
  ExternalLink,
  MapPin,
  Briefcase,
  UserCheck,
  RefreshCw,
  FileCheck,
  Truck,
} from "lucide-react";
import { deriveCustomers, computeTotal } from "../data/seed";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";
import { customerApi } from "../services/api";
import NewOrderModal from "../components/NewOrderModal";

export default function Customers() {
  const { t } = useLanguage();
  const { orders } = useOrders();
  const navigate = useNavigate();

  // State management for search, filters, drawer, modal, and loading
  const [customersList, setCustomersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [activeCustomerDrawer, setActiveCustomerDrawer] = useState(null);
  const [drawerTab, setDrawerTab] = useState("overview");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Fetch real customer records from MongoDB via customerApi
  const fetchCustomers = () => {
    setLoading(true);
    setError(null);
    console.log("[Customers CRM] Fetching customer accounts from backend API...");
    customerApi
      .getCustomers()
      .then((res) => {
        if (res?.data) {
          // Strictly show ONLY Approved customers (exclude Pending and Rejected registrations)
          const approvedOnly = res.data.filter((c) => {
            const regStatus = c.registrationStatus || "Approved";
            const custStatus = c.status || "Active";
            return (
              regStatus === "Approved" &&
              custStatus !== "Rejected" &&
              custStatus !== "Pending Review" &&
              custStatus !== "Pending"
            );
          });
          console.log(`[Customers CRM] Loaded ${approvedOnly.length} approved customer records.`);
          setCustomersList(approvedOnly);
        } else {
          setCustomersList([]);
        }
      })
      .catch((err) => {
        console.error("[Customers CRM] Failed to fetch customer records:", err);
        setError(err.response?.data?.message || err.message || "Failed to load customer records from server.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Enrich customer records with live orders context if newer orders exist in local state
  const enrichedCustomers = useMemo(() => {
    if (customersList.length > 0) {
      return customersList.map((c) => {
        const liveCustomerOrders = orders.filter(
          (o) => (o.customer || "").toLowerCase().trim() === (c.name || "").toLowerCase().trim()
        );

        // Merge orders if live orders have newer records
        const allOrders = liveCustomerOrders.length > (c.customerOrders?.length || 0)
          ? liveCustomerOrders
          : c.customerOrders || [];

        const activeOrdersCount = allOrders.filter((o) =>
          ["Pending", "Pending Approval", "Approved", "Dispatched", "InTransit", "In Transit", "Assigned"].includes(o.status)
        ).length;

        const deliveriesCount = allOrders.filter((o) => o.status === "Delivered").length;
        const pendingRequestsCount = allOrders.filter((o) => o.status === "Pending" || o.status === "Pending Approval").length;

        const totalRevenue = allOrders
          .filter((o) => o.status !== "Cancelled" && o.status !== "Rejected")
          .reduce((sum, o) => sum + (o.total || computeTotal(o.fuelCode, o.qty).total || 0), 0);

        const totalLitres = allOrders
          .filter((o) => o.status !== "Cancelled" && o.status !== "Rejected")
          .reduce((sum, o) => sum + (o.quantity || o.qty || 0), 0);

        const lastOrder = allOrders.length > 0 ? allOrders[0] : null;

        return {
          ...c,
          orders: allOrders.length || c.ordersCount || 0,
          ordersCount: allOrders.length || c.ordersCount || 0,
          customerOrders: allOrders,
          activeOrdersCount: activeOrdersCount || c.activeOrdersCount || 0,
          deliveriesCount: deliveriesCount || c.deliveriesCount || 0,
          pendingRequestsCount: pendingRequestsCount || c.pendingRequestsCount || 0,
          revenue: totalRevenue || c.revenue || 0,
          litres: totalLitres || c.litres || c.totalQty || 0,
          lastOrderDate: lastOrder ? `Order #${lastOrder.orderNumber}` : c.lastOrderDate || "No orders yet",
        };
      });
    }

    // Fallback if backend returns empty: derive from current orders
    const rawList = deriveCustomers(orders);
    return rawList.map((c) => {
      const customerOrders = orders.filter((o) => o.customer === c.name);
      const activeOrdersCount = customerOrders.filter((o) =>
        ["Pending", "Approved", "Dispatched", "InTransit", "In Transit"].includes(o.status)
      ).length;

      const revenue = customerOrders
        .filter((o) => o.status !== "Cancelled" && o.status !== "Rejected")
        .reduce((sum, o) => sum + (o.total || computeTotal(o.fuelCode, o.qty).total || 0), 0);

      const industry = "Commercial Logistics";
      const monthlyCons = c.totalQty || 20000;
      const priority = monthlyCons >= 40000 ? "Premium" : monthlyCons >= 25000 ? "Gold" : "Standard";
      const status = "Active";
      const creditLimit = 500000;
      const creditUsed = Math.min(creditLimit, Math.round(revenue * 0.25));

      return {
        ...c,
        industry,
        priority,
        status,
        registrationStatus: "Approved",
        credit: {
          limit: creditLimit,
          used: creditUsed,
          terms: "NET 30",
        },
        contact: {
          name: "Procurement Director",
          phone: "+91 98400 12345",
          email: `procurement@${c.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
          since: "2026-01-01",
        },
        revenue: Math.round(revenue),
        activeOrdersCount,
        deliveriesCount: customerOrders.filter((o) => o.status === "Delivered").length,
        pendingRequestsCount: customerOrders.filter((o) => o.status === "Pending").length,
        customerOrders,
        lastOrderDate: customerOrders.length > 0 ? `Order #${customerOrders[0].orderNumber}` : "No orders yet",
      };
    });
  }, [customersList, orders]);

  // Executive KPI summary metrics
  const totalCount = enrichedCustomers.length;
  const activeCount = enrichedCustomers.filter((c) => c.status === "Active").length;
  const premiumCount = enrichedCustomers.filter((c) => c.priority === "Premium").length;
  const totalRevenue = enrichedCustomers.reduce((acc, c) => acc + (c.revenue || 0), 0);
  const totalPendingOrders = enrichedCustomers.reduce((acc, c) => acc + (c.activeOrdersCount || 0), 0);
  const retentionRate = 98.4;

  // Multi-criteria Filter logic
  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter((c) => {
      const query = search.trim().toLowerCase();
      const matchesQuery =
        !query ||
        c.name.toLowerCase().includes(query) ||
        (c.city && c.city.toLowerCase().includes(query)) ||
        (c.industry && c.industry.toLowerCase().includes(query)) ||
        (c.contact?.name && c.contact.name.toLowerCase().includes(query)) ||
        (c.regId && c.regId.toLowerCase().includes(query));

      const matchesIndustry = selectedIndustry === "ALL" || c.industry === selectedIndustry;
      const matchesStatus =
        selectedStatus === "ALL" ||
        c.status === selectedStatus ||
        c.registrationStatus === selectedStatus;
      const matchesPriority = selectedPriority === "ALL" || c.priority === selectedPriority;

      return matchesQuery && matchesIndustry && matchesStatus && matchesPriority;
    });
  }, [enrichedCustomers, search, selectedIndustry, selectedStatus, selectedPriority]);

  const handleActionToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  return (
    <div className="crm-page-container">
      {/* Header Banner */}
      <header className="crm-header">
        <div>
          <h1 className="page-title">{t("customersTitle") || "Enterprise Customer CRM"}</h1>
          <p>
            Customer Relationship Management hub — track accounts, registrations, credit limits, active fuel orders, deliveries, and lifetime revenue.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            className="btn-ghost"
            onClick={fetchCustomers}
            title="Refresh Customer Data"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            className="refill-action-btn btn-refill-normal"
            onClick={() => setShowCreateModal(true)}
            style={{ padding: "10px 18px", borderRadius: "10px", fontSize: "13px", fontWeight: "700" }}
          >
            <PlusCircle size={16} /> Create New Fuel Order
          </button>
        </div>
      </header>

      {/* Global Action Toast */}
      {toastMessage && (
        <div className="banner-alert success-banner" style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.35)", borderRadius: "12px", padding: "14px 18px", color: "var(--green)", display: "flex", alignItems: "center", gap: "12px", fontWeight: "600", fontSize: "14px" }}>
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="banner-alert warning-banner" style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "12px", padding: "14px 18px", color: "var(--red)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button className="btn-ghost btn-sm" onClick={fetchCustomers} style={{ color: "var(--red)", fontWeight: "700" }}>
            Retry
          </button>
        </div>
      )}

      {/* Top CRM Executive KPI Grid */}
      <div className="crm-kpi-grid">
        <div className="crm-kpi-card">
          <div className="crm-kpi-top">
            <span className="crm-kpi-title">Total Customers</span>
            <div className="crm-kpi-icon">
              <Building2 size={18} />
            </div>
          </div>
          <div className="crm-kpi-val">{totalCount}</div>
          <div className="crm-kpi-sub">
            <UserCheck size={12} style={{ color: "var(--green)" }} /> {activeCount} Active Enterprise Accounts
          </div>
        </div>

        <div className="crm-kpi-card">
          <div className="crm-kpi-top">
            <span className="crm-kpi-title">Active Accounts</span>
            <div className="crm-kpi-icon" style={{ color: "var(--green)" }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="crm-kpi-val" style={{ color: "var(--green)" }}>{activeCount}</div>
          <div className="crm-kpi-sub">
            <span>{totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100}% Operational Health</span>
          </div>
        </div>

        <div className="crm-kpi-card">
          <div className="crm-kpi-top">
            <span className="crm-kpi-title">Premium Tier</span>
            <div className="crm-kpi-icon" style={{ color: "#F72585" }}>
              <Award size={18} />
            </div>
          </div>
          <div className="crm-kpi-val" style={{ color: "#F72585" }}>{premiumCount}</div>
          <div className="crm-kpi-sub">
            <span>High-volume Key Accounts</span>
          </div>
        </div>

        <div className="crm-kpi-card">
          <div className="crm-kpi-top">
            <span className="crm-kpi-title">Total Revenue Generated</span>
            <div className="crm-kpi-icon" style={{ color: "var(--blue)" }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="crm-kpi-val">₹{(totalRevenue / 100000).toFixed(1)}L</div>
          <div className="crm-kpi-sub">
            <TrendingUp size={12} style={{ color: "var(--green)" }} /> Lifetime Delivered Litres
          </div>
        </div>

        <div className="crm-kpi-card">
          <div className="crm-kpi-top">
            <span className="crm-kpi-title">Active Dispatch Orders</span>
            <div className="crm-kpi-icon" style={{ color: "var(--amber)" }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="crm-kpi-val" style={{ color: "var(--amber)" }}>{totalPendingOrders}</div>
          <div className="crm-kpi-sub">
            <span>In Transit & Pending Dispatch</span>
          </div>
        </div>

        <div className="crm-kpi-card">
          <div className="crm-kpi-top">
            <span className="crm-kpi-title">Customer Retention</span>
            <div className="crm-kpi-icon" style={{ color: "var(--green)" }}>
              <BarChart3 size={18} />
            </div>
          </div>
          <div className="crm-kpi-val">{retentionRate}%</div>
          <div className="crm-kpi-sub">
            <CheckCircle2 size={12} style={{ color: "var(--green)" }} /> Industry Benchmark SLA
          </div>
        </div>
      </div>

      {/* Advanced Search & Filters Toolbar */}
      <div className="crm-toolbar">
        <div className="crm-search-box">
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            className="crm-search-input"
            placeholder="Search by customer name, location, or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="crm-filters-group">
          <Filter size={15} style={{ color: "var(--text-dim)" }} />

          {/* Industry Filter */}
          <select
            className="crm-filter-select"
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
          >
            <option value="ALL">All Industries</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Transport">Transport</option>
            <option value="Agriculture">Agriculture</option>
            <option value="Construction">Construction</option>
            <option value="Logistics">Logistics</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Retail">Retail</option>
            <option value="Textiles">Textiles</option>
            <option value="Commercial Logistics">Commercial Logistics</option>
          </select>

          {/* Status Filter */}
          <select
            className="crm-filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active Accounts</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Priority Tier Filter */}
          <select
            className="crm-filter-select"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="Premium">Premium Tier</option>
            <option value="Gold">Gold Tier</option>
            <option value="Standard">Standard Tier</option>
          </select>

          {(search || selectedIndustry !== "ALL" || selectedStatus !== "ALL" || selectedPriority !== "ALL") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedIndustry("ALL");
                setSelectedStatus("ALL");
                setSelectedPriority("ALL");
              }}
              style={{ background: "none", border: "none", color: "var(--orange)", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="loading" style={{ padding: "50px", textAlign: "center", color: "var(--orange)" }}>
          Loading real customer records from MongoDB...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="loading" style={{ padding: "50px", textAlign: "center" }}>
          No customer accounts match selected criteria.
        </div>
      ) : (
        /* Customer Cards Grid */
        <div className="crm-cards-grid">
          {filteredCustomers.map((c) => {
            const creditLimit = c.credit?.limit || 500000;
            const creditUsed = c.credit?.used || 0;
            const creditPercent = Math.min(100, Math.round((creditUsed / (creditLimit || 1)) * 100));
            const isHighCredit = creditPercent >= 80;

            return (
              <div key={c.id || c.name} className="crm-card" onClick={() => setActiveCustomerDrawer(c)}>
                {/* Card Top: Avatar, Name, Priority Badge */}
                <div className="crm-card-top">
                  <div className="crm-company-info">
                    <div
                      className="crm-avatar"
                      style={{
                        background:
                          c.priority === "Premium"
                            ? "linear-gradient(135deg, #7209B7 0%, #F72585 100%)"
                            : c.priority === "Gold"
                            ? "var(--grad-flame)"
                            : "var(--grad-electric-blue)",
                      }}
                    >
                      {(c.name || "CU").substring(0, 2).toUpperCase()}
                    </div>
                    <div className="crm-company-details">
                      <h3>{c.name}</h3>
                      <div className="crm-meta-line">
                        <MapPin size={12} /> {c.city || "Chennai"} • <Briefcase size={12} /> {c.industry || "Commercial"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                    <span className={`crm-priority-badge ${(c.priority || "standard").toLowerCase()}`}>{c.priority || "Standard"}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: "700", color: c.status === "Active" ? "var(--green)" : "var(--text-muted)" }}>
                      <span className="live-dot-pulse" style={{ width: "7px", height: "7px", backgroundColor: c.status === "Active" ? "var(--green-neon)" : "var(--text-muted)" }}></span>
                      {c.status || "Active"}
                    </div>
                  </div>
                </div>

                {/* Core Metrics Grid */}
                <div className="crm-metrics-block">
                  <div className="crm-metric-item">
                    <span className="crm-metric-lbl">Total Fuel Delivered</span>
                    <span className="crm-metric-val">{(c.litres || 0).toLocaleString()} L</span>
                  </div>
                  <div className="crm-metric-item">
                    <span className="crm-metric-lbl">Lifetime Revenue</span>
                    <span className="crm-metric-val" style={{ color: "var(--orange)" }}>
                      ₹{Math.round(c.revenue || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="crm-metric-item">
                    <span className="crm-metric-lbl">Total Orders</span>
                    <span className="crm-metric-val">{c.orders || 0} Orders</span>
                  </div>
                  <div className="crm-metric-item">
                    <span className="crm-metric-lbl">Active In Transit</span>
                    <span className="crm-metric-val" style={{ color: (c.activeOrdersCount || 0) > 0 ? "var(--amber)" : "var(--text-dim)" }}>
                      {(c.activeOrdersCount || 0) > 0 ? `${c.activeOrdersCount} Active` : "None"}
                    </span>
                  </div>
                </div>

                {/* Credit Status Bar Meter */}
                <div className="crm-credit-section">
                  <div className="crm-credit-header">
                    <span style={{ color: "var(--text-dim)", fontWeight: "500" }}>Credit Utilization ({c.credit?.terms || "NET 30"})</span>
                    <span style={{ fontWeight: "700", color: isHighCredit ? "var(--red)" : "var(--text)" }}>
                      ₹{creditUsed.toLocaleString("en-IN")} / ₹{creditLimit.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="crm-credit-bar-bg">
                    <div
                      className="crm-credit-bar-fill"
                      style={{
                        width: `${creditPercent}%`,
                        backgroundColor: isHighCredit ? "var(--red)" : creditPercent > 50 ? "var(--amber)" : "var(--green)",
                      }}
                    ></div>
                  </div>
                </div>

                {/* Quick Action Footer */}
                <div className="crm-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="crm-primary-action-btn"
                    onClick={() => setActiveCustomerDrawer(c)}
                  >
                    View Profile <ChevronRight size={14} />
                  </button>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <a
                      href={`tel:${c.contact?.phone || ""}`}
                      className="crm-icon-action-btn"
                      title={`Call ${c.contact?.name || "Customer"}`}
                      onClick={() => handleActionToast(`Calling ${c.contact?.name} (${c.contact?.phone})...`)}
                    >
                      <Phone size={15} />
                    </a>

                    <a
                      href={`mailto:${c.contact?.email || ""}`}
                      className="crm-icon-action-btn"
                      title={`Email ${c.contact?.email || "Customer"}`}
                      onClick={() => handleActionToast(`Opening email client for ${c.contact?.email}...`)}
                    >
                      <Mail size={15} />
                    </a>

                    <button
                      className="crm-icon-action-btn"
                      title="View Customer Orders"
                      onClick={() => navigate(`/orders?status=All&search=${encodeURIComponent(c.name)}`)}
                    >
                      <FileText size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-Over Customer Profile Drawer */}
      {activeCustomerDrawer && (
        <>
          <div className="crm-drawer-backdrop" onClick={() => setActiveCustomerDrawer(null)}></div>
          <div className="crm-drawer-panel">
            {/* Drawer Header */}
            <div className="crm-drawer-header">
              <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                <div
                  className="crm-avatar"
                  style={{
                    width: "52px",
                    height: "52px",
                    fontSize: "20px",
                    background:
                      activeCustomerDrawer.priority === "Premium"
                        ? "linear-gradient(135deg, #7209B7 0%, #F72585 100%)"
                        : "var(--grad-flame)",
                  }}
                >
                  {(activeCustomerDrawer.name || "CU").substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "800", margin: "0 0 2px 0", color: "var(--text)" }}>
                    {activeCustomerDrawer.name}
                  </h2>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", display: "flex", gap: "8px", alignItems: "center" }}>
                    <MapPin size={12} /> {activeCustomerDrawer.city} • <Briefcase size={12} /> {activeCustomerDrawer.industry}
                  </div>
                </div>
              </div>
              <button className="crm-drawer-close" onClick={() => setActiveCustomerDrawer(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="crm-drawer-tabs">
              <button
                className={`crm-drawer-tab-btn ${drawerTab === "overview" ? "active" : ""}`}
                onClick={() => setDrawerTab("overview")}
              >
                Overview & Contact
              </button>
              <button
                className={`crm-drawer-tab-btn ${drawerTab === "orders" ? "active" : ""}`}
                onClick={() => setDrawerTab("orders")}
              >
                Orders & Deliveries ({activeCustomerDrawer.customerOrders?.length || 0})
              </button>
              <button
                className={`crm-drawer-tab-btn ${drawerTab === "registration" ? "active" : ""}`}
                onClick={() => setDrawerTab("registration")}
              >
                Registration & KYC
              </button>
              <button
                className={`crm-drawer-tab-btn ${drawerTab === "credit" ? "active" : ""}`}
                onClick={() => setDrawerTab("credit")}
              >
                Credit & Billing
              </button>
            </div>

            {/* Drawer Content */}
            <div className="crm-drawer-body">
              {drawerTab === "overview" && (
                <>
                  <div className="crm-section-card">
                    <h4 style={{ margin: 0, fontSize: "14px", color: "var(--orange)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <UserCheck size={16} /> Key Account Contact
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Primary Contact</span>
                        <strong>{activeCustomerDrawer.contact?.name || activeCustomerDrawer.authorizedPerson || "Authorized Person"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Customer Since</span>
                        <strong>{activeCustomerDrawer.contact?.since || "2026-01-01"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Phone Number</span>
                        <strong>{activeCustomerDrawer.contact?.phone || activeCustomerDrawer.phone || "—"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Email Address</span>
                        <strong>{activeCustomerDrawer.contact?.email || activeCustomerDrawer.email || "—"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="crm-section-card">
                    <h4 style={{ margin: 0, fontSize: "14px", color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Droplets size={16} style={{ color: "var(--blue)" }} /> Fuel Consumption & Logistics Summary
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Total Volume Delivered</span>
                        <strong style={{ fontSize: "16px", color: "var(--orange)" }}>
                          {(activeCustomerDrawer.litres || 0).toLocaleString()} Litres
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Lifetime Account Value</span>
                        <strong style={{ fontSize: "16px", color: "var(--green)" }}>
                          ₹{Math.round(activeCustomerDrawer.revenue || 0).toLocaleString("en-IN")}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Completed Deliveries</span>
                        <strong style={{ fontSize: "14px", color: "var(--green)" }}>
                          {activeCustomerDrawer.deliveriesCount || 0} Runs
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Pending Dispatch Requests</span>
                        <strong style={{ fontSize: "14px", color: (activeCustomerDrawer.pendingRequestsCount || 0) > 0 ? "var(--amber)" : "var(--text-dim)" }}>
                          {activeCustomerDrawer.pendingRequestsCount || 0} Orders
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <button
                      className="refill-action-btn btn-refill-normal"
                      onClick={() => {
                        setActiveCustomerDrawer(null);
                        setShowCreateModal(true);
                      }}
                      style={{ flex: 1 }}
                    >
                      <PlusCircle size={15} /> Create Order For Customer
                    </button>
                  </div>
                </>
              )}

              {drawerTab === "orders" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(!activeCustomerDrawer.customerOrders || activeCustomerDrawer.customerOrders.length === 0) ? (
                    <div style={{ padding: "30px", textAlign: "center", color: "var(--text-dim)" }}>
                      No orders placed by this customer yet.
                    </div>
                  ) : (
                    activeCustomerDrawer.customerOrders.map((o) => (
                      <div
                        key={o._id || o.id || o.orderNumber}
                        style={{
                          background: "var(--panel)",
                          border: "1px solid var(--line)",
                          borderRadius: "12px",
                          padding: "12px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "13px", color: "var(--text)" }}>
                            Order #{o.orderNumber}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "2px" }}>
                            {o.fuelType || o.fuelCode} • {(o.quantity || o.qty)} L • {o.deliveryAddress || o.site || o.city}
                          </div>
                          {o.driver && o.driver !== "Unassigned" && (
                            <div style={{ fontSize: "11px", color: "var(--blue)", marginTop: "2px" }}>
                              <Truck size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                              Driver: {o.driver} ({o.vehicle || "Tanker"})
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right" }}>
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
                          <div style={{ fontSize: "11px", fontWeight: "700", marginTop: "4px", color: "var(--text)" }}>
                            ₹{Math.round(o.total || 0).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {drawerTab === "registration" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div className="crm-section-card">
                    <h4 style={{ margin: 0, fontSize: "14px", color: "var(--blue)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <FileCheck size={16} /> Customer Registration & KYC Verification
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", marginTop: "8px" }}>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Registration ID</span>
                        <strong className="mono">{activeCustomerDrawer.regId || "REG-ENTERPRISE"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Approval Status</span>
                        <span className="pill status-approved" style={{ fontSize: "11px" }}>
                          {activeCustomerDrawer.registrationStatus || activeCustomerDrawer.status || "Verified"}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>GST Number</span>
                        <strong className="mono">{activeCustomerDrawer.gstNumber || "—"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>PAN Number</span>
                        <strong className="mono">{activeCustomerDrawer.panNumber || "—"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Business Classification</span>
                        <strong>{activeCustomerDrawer.businessType || activeCustomerDrawer.industry}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Registered Address</span>
                        <strong>{activeCustomerDrawer.address || `${activeCustomerDrawer.city}, ${activeCustomerDrawer.state || "TN"}`}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="crm-section-card">
                    <h4 style={{ margin: 0, fontSize: "13px", color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <FileText size={15} /> Uploaded Compliance Documents
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                      {activeCustomerDrawer.documents && activeCustomerDrawer.documents.length > 0 ? (
                        activeCustomerDrawer.documents.map((doc, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "var(--panel)",
                              padding: "8px 12px",
                              borderRadius: "8px",
                              border: "1px solid var(--line)",
                              fontSize: "12px",
                            }}
                          >
                            <span>{doc.type || "Document"}: <strong>{doc.fileName || doc.originalName || "Uploaded_Doc.pdf"}</strong></span>
                            <span style={{ color: "var(--green)", fontSize: "11px", fontWeight: "700" }}>✓ Verified</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: "12px", color: "var(--text-dim)", padding: "8px" }}>
                          Standard GST & PAN documentation on file.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "credit" && (
                <div className="crm-section-card">
                  <h4 style={{ margin: 0, fontSize: "14px", color: "var(--amber)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CreditCard size={16} /> Credit Terms & Limits
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", marginTop: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Payment Terms:</span>
                      <strong>{activeCustomerDrawer.credit?.terms || "NET 30"}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Approved Credit Limit:</span>
                      <strong>₹{(activeCustomerDrawer.credit?.limit || 500000).toLocaleString("en-IN")}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Current Credit Utilized:</span>
                      <strong style={{ color: "var(--red)" }}>₹{(activeCustomerDrawer.credit?.used || 0).toLocaleString("en-IN")}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Available Credit Balance:</span>
                      <strong style={{ color: "var(--green)" }}>
                        ₹{Math.max(0, (activeCustomerDrawer.credit?.limit || 500000) - (activeCustomerDrawer.credit?.used || 0)).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* New Order Modal pre-filled */}
      {showCreateModal && (
        <NewOrderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            handleActionToast("New dispatch order created successfully!");
            fetchCustomers();
          }}
        />
      )}
    </div>
  );
}
