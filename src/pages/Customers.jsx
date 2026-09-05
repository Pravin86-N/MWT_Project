import React, { useMemo, useState } from "react";
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
} from "lucide-react";
import { deriveCustomers } from "../data/seed";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";
import NewOrderModal from "../components/NewOrderModal";

// Industry mappings for realistic CRM profile data
const INDUSTRY_MAP = {
  "Chennai Steel Works": "Manufacturing",
  "Om Sri Hospital": "Healthcare",
  "Suresh Transports": "Transport",
  "Anand Apartments": "Real Estate",
  "Green Valley Farms": "Agriculture",
  "Sunrise Construction": "Construction",
  "Kavin LPG Retail": "Retail",
  "Nila Textiles": "Textiles",
};

const PRIORITY_MAP = {
  "Chennai Steel Works": "Premium",
  "Om Sri Hospital": "Premium",
  "Suresh Transports": "Gold",
  "Anand Apartments": "Standard",
  "Green Valley Farms": "Standard",
  "Sunrise Construction": "Gold",
  "Kavin LPG Retail": "Standard",
  "Nila Textiles": "Premium",
};

const STATUS_MAP = {
  "Chennai Steel Works": "Active",
  "Om Sri Hospital": "Active",
  "Suresh Transports": "Active",
  "Anand Apartments": "Active",
  "Green Valley Farms": "Active",
  "Sunrise Construction": "Active",
  "Kavin LPG Retail": "Inactive",
  "Nila Textiles": "Active",
};

const CREDIT_MAP = {
  "Chennai Steel Works": { limit: 1000000, used: 342000, terms: "NET 30" },
  "Om Sri Hospital": { limit: 500000, used: 128000, terms: "NET 15" },
  "Suresh Transports": { limit: 750000, used: 520000, terms: "NET 30" },
  "Anand Apartments": { limit: 300000, used: 45000, terms: "NET 15" },
  "Green Valley Farms": { limit: 250000, used: 82000, terms: "NET 15" },
  "Sunrise Construction": { limit: 800000, used: 640000, terms: "NET 30" },
  "Kavin LPG Retail": { limit: 400000, used: 395000, terms: "Prepaid" },
  "Nila Textiles": { limit: 600000, used: 190000, terms: "NET 30" },
};

const CONTACT_MAP = {
  "Chennai Steel Works": { name: "K. R. Sundaram", phone: "+91 98400 99881", email: "procurement@chennaisteel.com", since: "2023-04-15" },
  "Om Sri Hospital": { name: "Dr. A. Meenakshi", phone: "+91 98410 77665", email: "admin@omsrihospital.org", since: "2023-08-10" },
  "Suresh Transports": { name: "Suresh Kumar", phone: "+91 98420 55443", email: "suresh@sureshtransports.in", since: "2024-01-20" },
  "Anand Apartments": { name: "V. Anand", phone: "+91 98430 33221", email: "association@anandapts.com", since: "2024-03-12" },
  "Green Valley Farms": { name: "M. Periasamy", phone: "+91 98440 11990", email: "contact@greenvalleyfarms.in", since: "2024-05-01" },
  "Sunrise Construction": { name: "R. Balakrishnan", phone: "+91 98450 88776", email: "projects@sunrisebuild.com", since: "2023-11-05" },
  "Kavin LPG Retail": { name: "Kavin Raj", phone: "+91 98460 66554", email: "sales@kavinlpg.com", since: "2024-02-18" },
  "Nila Textiles": { name: "S. Natesan", phone: "+91 98470 44332", email: "orders@nilatextiles.com", since: "2023-09-28" },
};

export default function Customers() {
  const { t } = useLanguage();
  const { orders } = useOrders();
  const navigate = useNavigate();

  // State management for search, filters, drawer and modal
  const [search, setSearch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [activeCustomerDrawer, setActiveCustomerDrawer] = useState(null);
  const [drawerTab, setDrawerTab] = useState("overview");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Enrich customer rollup data with CRM metadata
  const enrichedCustomers = useMemo(() => {
    const rawList = deriveCustomers(orders);
    return rawList.map((c) => {
      const customerOrders = orders.filter((o) => o.customer === c.name);
      const activeOrdersCount = customerOrders.filter((o) => ["Pending", "Approved", "Dispatched", "InTransit"].includes(o.status)).length;
      
      // Calculate total revenue generated from delivered/completed orders
      const revenue = customerOrders
        .filter((o) => o.status !== "Cancelled")
        .reduce((sum, o) => sum + o.qty * (o.fuelCode === "DSL" ? 92.4 : o.fuelCode === "PTL" ? 104.8 : 65.0), 0);

      const industry = INDUSTRY_MAP[c.name] || "General Industry";
      const priority = PRIORITY_MAP[c.name] || "Standard";
      const status = STATUS_MAP[c.name] || "Active";
      const credit = CREDIT_MAP[c.name] || { limit: 500000, used: 150000, terms: "NET 30" };
      const contact = CONTACT_MAP[c.name] || { name: "Site Manager", phone: "+91 98400 00000", email: "contact@company.com", since: "2024-01-01" };
      const lastOrder = customerOrders.length > 0 ? customerOrders[customerOrders.length - 1] : null;

      return {
        ...c,
        industry,
        priority,
        status,
        credit,
        contact,
        revenue: Math.round(revenue),
        activeOrdersCount,
        customerOrders,
        lastOrderDate: lastOrder ? `Order #${lastOrder.orderNumber}` : "No recent orders",
      };
    });
  }, [orders]);

  // Executive KPI summary metrics
  const totalCount = enrichedCustomers.length;
  const activeCount = enrichedCustomers.filter((c) => c.status === "Active").length;
  const premiumCount = enrichedCustomers.filter((c) => c.priority === "Premium").length;
  const totalRevenue = enrichedCustomers.reduce((acc, c) => acc + c.revenue, 0);
  const totalPendingOrders = enrichedCustomers.reduce((acc, c) => acc + c.activeOrdersCount, 0);
  const retentionRate = 98.4;

  // Multi-criteria Filter logic
  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter((c) => {
      const query = search.trim().toLowerCase();
      const matchesQuery =
        !query ||
        c.name.toLowerCase().includes(query) ||
        c.city.toLowerCase().includes(query) ||
        c.industry.toLowerCase().includes(query) ||
        c.contact.name.toLowerCase().includes(query);

      const matchesIndustry = selectedIndustry === "ALL" || c.industry === selectedIndustry;
      const matchesStatus = selectedStatus === "ALL" || c.status === selectedStatus;
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
            Customer Relationship Management hub — track accounts, credit limits, active fuel orders, and lifetime revenue.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
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
            <span>{Math.round((activeCount / totalCount) * 100)}% Operational Health</span>
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
            <option value="Real Estate">Real Estate</option>
            <option value="Retail">Retail</option>
            <option value="Textiles">Textiles</option>
          </select>

          {/* Status Filter */}
          <select
            className="crm-filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active Accounts</option>
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

      {/* Customer Cards Grid */}
      <div className="crm-cards-grid">
        {filteredCustomers.map((c) => {
          const creditPercent = Math.round((c.credit.used / c.credit.limit) * 100);
          const isHighCredit = creditPercent >= 80;

          return (
            <div key={c.name} className="crm-card" onClick={() => setActiveCustomerDrawer(c)}>
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
                    {c.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="crm-company-details">
                    <h3>{c.name}</h3>
                    <div className="crm-meta-line">
                      <MapPin size={12} /> {c.city} • <Briefcase size={12} /> {c.industry}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                  <span className={`crm-priority-badge ${c.priority.toLowerCase()}`}>{c.priority}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: "700", color: c.status === "Active" ? "var(--green)" : "var(--text-muted)" }}>
                    <span className="live-dot-pulse" style={{ width: "7px", height: "7px", backgroundColor: c.status === "Active" ? "var(--green-neon)" : "var(--text-muted)" }}></span>
                    {c.status}
                  </div>
                </div>
              </div>

              {/* Core Metrics Grid */}
              <div className="crm-metrics-block">
                <div className="crm-metric-item">
                  <span className="crm-metric-lbl">Total Fuel Delivered</span>
                  <span className="crm-metric-val">{c.litres.toLocaleString()} L</span>
                </div>
                <div className="crm-metric-item">
                  <span className="crm-metric-lbl">Lifetime Revenue</span>
                  <span className="crm-metric-val" style={{ color: "var(--orange)" }}>
                    ₹{c.revenue.toLocaleString()}
                  </span>
                </div>
                <div className="crm-metric-item">
                  <span className="crm-metric-lbl">Total Orders</span>
                  <span className="crm-metric-val">{c.orders} Orders</span>
                </div>
                <div className="crm-metric-item">
                  <span className="crm-metric-lbl">Active In Transit</span>
                  <span className="crm-metric-val" style={{ color: c.activeOrdersCount > 0 ? "var(--amber)" : "var(--text-dim)" }}>
                    {c.activeOrdersCount > 0 ? `${c.activeOrdersCount} Active` : "None"}
                  </span>
                </div>
              </div>

              {/* Credit Status Bar Meter */}
              <div className="crm-credit-section">
                <div className="crm-credit-header">
                  <span style={{ color: "var(--text-dim)", fontWeight: "500" }}>Credit Utilization ({c.credit.terms})</span>
                  <span style={{ fontWeight: "700", color: isHighCredit ? "var(--red)" : "var(--text)" }}>
                    ₹{c.credit.used.toLocaleString()} / ₹{c.credit.limit.toLocaleString()}
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
                    href={`tel:${c.contact.phone}`}
                    className="crm-icon-action-btn"
                    title={`Call ${c.contact.name}`}
                    onClick={() => handleActionToast(`Calling ${c.contact.name} (${c.contact.phone})...`)}
                  >
                    <Phone size={15} />
                  </a>

                  <a
                    href={`mailto:${c.contact.email}`}
                    className="crm-icon-action-btn"
                    title={`Email ${c.contact.email}`}
                    onClick={() => handleActionToast(`Opening email client for ${c.contact.email}...`)}
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
                  {activeCustomerDrawer.name.substring(0, 2).toUpperCase()}
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
                Orders ({activeCustomerDrawer.customerOrders.length})
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
                        <strong>{activeCustomerDrawer.contact.name}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Customer Since</span>
                        <strong>{activeCustomerDrawer.contact.since}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Phone Number</span>
                        <strong>{activeCustomerDrawer.contact.phone}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Email Address</span>
                        <strong>{activeCustomerDrawer.contact.email}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="crm-section-card">
                    <h4 style={{ margin: 0, fontSize: "14px", color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Droplets size={16} style={{ color: "var(--blue)" }} /> Fuel Consumption Summary
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Total Volume Delivered</span>
                        <strong style={{ fontSize: "16px", color: "var(--orange)" }}>{activeCustomerDrawer.litres.toLocaleString()} Litres</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", display: "block", fontSize: "11px" }}>Lifetime Account Value</span>
                        <strong style={{ fontSize: "16px", color: "var(--green)" }}>₹{activeCustomerDrawer.revenue.toLocaleString()}</strong>
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
                  {activeCustomerDrawer.customerOrders.map((o) => (
                    <div
                      key={o.id}
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
                        <div style={{ fontWeight: "700", fontSize: "13px", color: "var(--text)" }}>Order #{o.orderNumber}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                          {o.fuelCode} • {o.qty} Litres • {o.site}
                        </div>
                      </div>
                      <span className="status-indicator-pill optimal" style={{ fontSize: "10px" }}>
                        {o.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {drawerTab === "credit" && (
                <div className="crm-section-card">
                  <h4 style={{ margin: 0, fontSize: "14px", color: "var(--amber)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <CreditCard size={16} /> Credit Terms & Limits
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Payment Terms:</span>
                      <strong>{activeCustomerDrawer.credit.terms}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Approved Credit Limit:</span>
                      <strong>₹{activeCustomerDrawer.credit.limit.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Current Credit Utilized:</span>
                      <strong style={{ color: "var(--red)" }}>₹{activeCustomerDrawer.credit.used.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Available Credit Balance:</span>
                      <strong style={{ color: "var(--green)" }}>
                        ₹{(activeCustomerDrawer.credit.limit - activeCustomerDrawer.credit.used).toLocaleString()}
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
          onSuccess={() => handleActionToast("New dispatch order created successfully!")}
        />
      )}
    </div>
  );
}
