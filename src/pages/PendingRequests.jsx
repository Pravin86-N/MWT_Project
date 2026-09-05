import React, { useState, useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Fuel,
  Building2,
  MapPin,
  Calendar,
  Filter,
  Check,
  X,
  ShieldCheck,
  CreditCard,
  Database,
  ArrowRight,
  Search,
  ArrowUpDown,
  Flame,
  Eye,
  ChevronRight,
  Sparkles,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { computeTotal } from "../data/seed";
import { useOrders } from "../context/OrdersContext";
import { useInventory } from "../context/InventoryContext";
import { useLanguage } from "../context/LanguageContext";
import { useNotifications } from "../context/NotificationContext";

export default function PendingRequests() {
  const { t } = useLanguage();
  const { orders, updateOrder } = useOrders();
  const { hasSufficientStock, tanks } = useInventory();
  const { addNotification } = useNotifications();

  // Local UI state
  const [activeTab, setActiveTab] = useState("Pending"); // "All", "High Priority", "Pending", "Approved", "Rejected"
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date"); // "quantity", "customer", "date", "priority"
  const [selectedRejectRequest, setSelectedRejectRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState("Credit Limit Exceeded");
  const [customReason, setCustomReason] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedDrawerOrder, setExpandedDrawerOrder] = useState(null);

  // All fuel requests (pending, approved, rejected)
  const allRequests = useMemo(() => {
    return orders.map((o) => {
      const isHighPriority = o.qty >= 10000 || o.customer.toLowerCase().includes("hospital") || o.customer.toLowerCase().includes("l&t");
      const customerType = o.customer.toLowerCase().includes("hospital")
        ? "Healthcare"
        : o.customer.toLowerCase().includes("construction") || o.customer.toLowerCase().includes("l&t")
        ? "Industrial"
        : "Corporate";
      const creditStatus = isHighPriority ? "Prime Corporate Credit (Net 30)" : "Standard Account Credit";
      return {
        ...o,
        isHighPriority,
        customerType,
        creditStatus,
      };
    });
  }, [orders]);

  // Dynamic KPI Aggregations
  const pendingRequestsList = useMemo(
    () => allRequests.filter((o) => o.status === "Pending" || o.status === "Pending Approval"),
    [allRequests]
  );

  const totalVolume = useMemo(
    () => pendingRequestsList.reduce((sum, o) => sum + o.qty, 0),
    [pendingRequestsList]
  );

  const totalValue = useMemo(
    () => pendingRequestsList.reduce((sum, o) => sum + computeTotal(o.fuelCode, o.qty).total, 0),
    [pendingRequestsList]
  );

  // Filtered & Sorted requests array
  const filteredRequests = useMemo(() => {
    return allRequests
      .filter((req) => {
        // Tab Filter
        if (activeTab === "Pending" && req.status !== "Pending" && req.status !== "Pending Approval") return false;
        if (activeTab === "High Priority" && !req.isHighPriority) return false;
        if (activeTab === "Approved" && req.status !== "Approved") return false;
        if (activeTab === "Rejected" && req.status !== "Rejected") return false;

        // Search Filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchId = req.orderNumber?.toLowerCase().includes(q);
          const matchCust = req.customer?.toLowerCase().includes(q);
          const matchFuel = req.fuelCode?.toLowerCase().includes(q);
          const matchCity = req.city?.toLowerCase().includes(q);
          const matchSite = req.site?.toLowerCase().includes(q);
          if (!matchId && !matchCust && !matchFuel && !matchCity && !matchSite) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "quantity") return b.qty - a.qty;
        if (sortBy === "customer") return a.customer.localeCompare(b.customer);
        if (sortBy === "priority") return (b.isHighPriority ? 1 : 0) - (a.isHighPriority ? 1 : 0);
        return (b.id || 0) - (a.id || 0); // Date newest
      });
  }, [allRequests, activeTab, searchTerm, sortBy]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(""), 6000);
  };

  const handleApprove = (req) => {
    const tank = tanks.find((t) => t.fuelCode === req.fuelCode);
    const available = tank ? tank.current - (tank.reserved || 0) : 0;

    if (!hasSufficientStock(req.fuelCode, req.qty)) {
      showError(
        `Cannot Approve Order ${req.orderNumber}: Insufficient Depot Stock for ${req.fuelCode}! Available unreserved stock: ${available.toLocaleString()} L, Requested: ${req.qty.toLocaleString()} L`
      );
      return;
    }

    const ok = updateOrder(req.id, {
      status: "Approved",
      approvedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      notification: `Request ${req.orderNumber} APPROVED by Depot Manager. Operational delivery order created! Stock reserved.`,
    });

    if (ok !== false) {
      addNotification({
        title: "Request Approved",
        message: `Your fuel request ${req.orderNumber} for ${req.qty.toLocaleString()} L of ${req.fuelCode} was APPROVED! Operational delivery order created.`,
        category: "request",
        role: "Customer",
        type: "success",
        orderId: req.orderNumber,
      });

      showToast(`Request ${req.orderNumber} for ${req.customer} APPROVED. ${req.qty.toLocaleString()} L ${req.fuelCode} reserved in depot tank!`);
    }
  };

  const handleOpenRejectModal = (req) => {
    setSelectedRejectRequest(req);
    setRejectReason("Credit Limit Exceeded");
    setCustomReason("");
  };

  const handleConfirmReject = (e) => {
    e.preventDefault();
    if (!selectedRejectRequest) return;

    const finalReason = rejectReason === "Custom" ? customReason : rejectReason;
    if (!finalReason.trim()) return;

    updateOrder(selectedRejectRequest.id, {
      status: "Rejected",
      rejectionReason: finalReason,
      rejectedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      notification: `Request ${selectedRejectRequest.orderNumber} REJECTED: ${finalReason}`,
    });

    addNotification({
      title: "Request Rejected",
      message: `Your fuel request ${selectedRejectRequest.orderNumber} was REJECTED by Depot Manager. Reason: "${finalReason}"`,
      category: "request",
      role: "Customer",
      type: "danger",
      orderId: selectedRejectRequest.orderNumber,
    });

    showToast(`Request ${selectedRejectRequest.orderNumber} REJECTED. Customer notified: "${finalReason}"`);
    setSelectedRejectRequest(null);
  };

  return (
    <div className="pending-requests-page" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Header Banner */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="fleet-title-saas" style={{ fontSize: "24px", margin: 0 }}>
            Depot Manager Approval Center
          </h1>
          <p className="fleet-subtitle-saas" style={{ fontSize: "13px", marginTop: "3px" }}>
            Enterprise Bulk Fuel Order Authorization, Credit Verification & Depot Tank Stock Reservation Engine
          </p>
        </div>
        <span
          className="pill"
          style={{
            "--pill-color": "var(--orange)",
            fontSize: "12px",
            padding: "6px 14px",
            background: "rgba(255, 94, 0, 0.15)",
            color: "var(--orange)",
            border: "1px solid rgba(255, 94, 0, 0.3)",
            fontWeight: "800",
          }}
        >
          <Clock size={14} style={{ verticalAlign: "middle", marginRight: "6px" }} />
          {pendingRequestsList.length} PENDING APPROVAL
        </span>
      </header>

      {/* Notifications / Alerts Banners */}
      {toastMessage && (
        <div className="banner-alert success-banner" style={{ borderRadius: "12px", padding: "12px 16px" }}>
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          className="banner-alert danger-banner"
          style={{
            borderRadius: "12px",
            padding: "12px 16px",
            border: "1px solid rgba(255, 0, 85, 0.4)",
            boxShadow: "0 0 20px rgba(255, 0, 85, 0.15)",
          }}
        >
          <AlertTriangle size={18} style={{ color: "var(--red)" }} />
          <strong style={{ color: "var(--red)" }}>{errorMessage}</strong>
        </div>
      )}

      {/* =========================================================================
          REQUIREMENT 1 & 2: 4 EQUAL HEIGHT & WIDTH GLASSMORPHIC KPI CARDS
          ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "16px",
        }}
      >
        {/* KPI Card 1: Pending Requests */}
        <div className="approval-kpi-card">
          <div className="kpi-head">
            <Clock size={20} style={{ color: "var(--orange)" }} />
            <span className="kpi-title">Pending Requests</span>
          </div>
          <div className="kpi-value-box">
            <span className="kpi-val" style={{ color: "var(--orange)" }}>
              {pendingRequestsList.length}
            </span>
            <small className="kpi-unit">Requests</small>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend trend-amber">⚡ Requires Manager Action</span>
          </div>
        </div>

        {/* KPI Card 2: Requested Volume */}
        <div className="approval-kpi-card">
          <div className="kpi-head">
            <Fuel size={20} style={{ color: "var(--blue)" }} />
            <span className="kpi-title">Requested Volume</span>
          </div>
          <div className="kpi-value-box">
            <span className="kpi-val" style={{ color: "var(--blue)" }}>
              {totalVolume.toLocaleString()}
            </span>
            <small className="kpi-unit">Litres</small>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend trend-blue">🛢️ Depot Stock Unreserved</span>
          </div>
        </div>

        {/* KPI Card 3: Estimated Revenue */}
        <div className="approval-kpi-card">
          <div className="kpi-head">
            <CreditCard size={20} style={{ color: "var(--green-neon)" }} />
            <span className="kpi-title">Estimated Revenue</span>
          </div>
          <div className="kpi-value-box">
            <span className="kpi-val" style={{ color: "var(--green-neon)" }}>
              ₹{(totalValue / 100000).toFixed(1)} L
            </span>
            <small className="kpi-unit">Net 30</small>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend trend-green">💳 Corporate Credit Terms</span>
          </div>
        </div>

        {/* KPI Card 4: Depot Readiness */}
        <div className="approval-kpi-card">
          <div className="kpi-head">
            <ShieldCheck size={20} style={{ color: "var(--amber)" }} />
            <span className="kpi-title">Depot Readiness</span>
          </div>
          <div className="kpi-value-box">
            <span className="kpi-val" style={{ color: "var(--amber)" }}>
              100%
            </span>
            <small className="kpi-unit">Operational</small>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend trend-amber">🚛 4 Fleet Tankers Ready</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          REQUIREMENT 9, 10, 11: FILTER TABS, SEARCH BAR & SORT TOOLBAR
          ========================================================================= */}
      <div className="approval-toolbar">
        {/* Filter Tabs */}
        <div className="toolbar-tabs">
          {["Pending", "High Priority", "All Requests", "Approved", "Rejected"].map((tab) => {
            const isActive = activeTab === tab;
            const getTabCount = () => {
              if (tab === "Pending") return pendingRequestsList.length;
              if (tab === "High Priority") return allRequests.filter((r) => r.isHighPriority).length;
              if (tab === "Approved") return allRequests.filter((r) => r.status === "Approved").length;
              if (tab === "Rejected") return allRequests.filter((r) => r.status === "Rejected").length;
              return allRequests.length;
            };

            return (
              <button
                key={tab}
                className={`tab-btn ${isActive ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "High Priority" && <Flame size={14} style={{ color: "var(--orange)" }} />}
                <span>{tab}</span>
                <span className="tab-count">{getTabCount()}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort Actions */}
        <div className="toolbar-actions">
          {/* Search Bar */}
          <div className="search-box">
            <Search size={15} style={{ color: "var(--text-dim)" }} />
            <input
              type="text"
              placeholder="Search request #, customer, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-btn" onClick={() => setSearchTerm("")}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="sort-box">
            <ArrowUpDown size={14} style={{ color: "var(--orange)" }} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date">Sort: Date (Newest)</option>
              <option value="quantity">Sort: Quantity (High to Low)</option>
              <option value="priority">Sort: Priority First</option>
              <option value="customer">Sort: Customer Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* =========================================================================
          REQUIREMENT 5, 6, 7: STRUCTURED REQUEST CARDS GRID
          ========================================================================= */}
      <div className="approval-cards-container">
        {filteredRequests.length === 0 ? (
          <div className="empty-state-card">
            <CheckCircle2 size={40} style={{ color: "var(--green-neon)", marginBottom: "8px" }} />
            <h3>No Fuel Requests Found</h3>
            <p>No requests match the selected filter criteria or search query.</p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const cost = computeTotal(req.fuelCode, req.qty).total;
            const isPending = req.status === "Pending" || req.status === "Pending Approval";
            const isApproved = req.status === "Approved";
            const isRejected = req.status === "Rejected";

            return (
              <div
                key={req.id}
                className={`enterprise-request-card ${req.isHighPriority ? "high-priority-border" : ""}`}
              >
                {/* Card Header Bar */}
                <div className="req-card-head">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="req-id-badge">{req.orderNumber}</span>
                    {req.isHighPriority && (
                      <span className="priority-badge">
                        <Flame size={13} /> HIGH PRIORITY
                      </span>
                    )}
                    <span className="customer-type-tag">{req.customerType}</span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPending && <span className="status-badge badge-pending">⏱️ PENDING APPROVAL</span>}
                    {isApproved && <span className="status-badge badge-approved">✓ APPROVED</span>}
                    {isRejected && <span className="status-badge badge-rejected">✕ REJECTED</span>}
                  </div>
                </div>

                {/* Card Main Content Grid */}
                <div className="req-card-body">
                  {/* Column 1: Customer & Site */}
                  <div className="req-col">
                    <span className="col-label">Customer & Delivery Site</span>
                    <div className="cust-title">
                      <Building2 size={16} style={{ color: "var(--orange)", flexShrink: 0 }} />
                      <strong>{req.customer}</strong>
                    </div>
                    <div className="site-sub">
                      <MapPin size={13} style={{ color: "var(--blue)" }} />
                      <span>{req.site} • {req.city}</span>
                    </div>
                  </div>

                  {/* Column 2: Fuel & Volume */}
                  <div className="req-col">
                    <span className="col-label">Fuel Product & Quantity</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                      <span className={`fuel-tag fuel-${req.fuelCode.toLowerCase()}`}>{req.fuelCode}</span>
                      <strong className="qty-highlight">{req.qty.toLocaleString()} L</strong>
                    </div>
                    <small className="cost-tag">Est. Value: ₹{Math.round(cost).toLocaleString("en-IN")}</small>
                  </div>

                  {/* Column 3: Requested Slot & Credit */}
                  <div className="req-col">
                    <span className="col-label">Time Slot & Credit Check</span>
                    <div className="slot-tag">
                      <Calendar size={13} />
                      <span>{req.slot || "Today (09:00 - 12:00)"}</span>
                    </div>
                    <div className="credit-status-tag">
                      <ShieldCheck size={13} style={{ color: "var(--green-neon)" }} />
                      <span>{req.creditStatus}</span>
                    </div>
                  </div>

                  {/* Column 4: Equal-Sized Action Buttons */}
                  <div className="req-col req-actions-col">
                    <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                      <button
                        className="btn-details-ghost"
                        onClick={() => setExpandedDrawerOrder(expandedDrawerOrder === req.id ? null : req.id)}
                        title="View Depot Verification Details"
                      >
                        <Eye size={15} /> Details
                      </button>

                      {isPending ? (
                        <>
                          <button
                            className="btn-approve-modern"
                            onClick={() => handleApprove(req)}
                          >
                            <Check size={16} /> Approve
                          </button>
                          <button
                            className="btn-reject-modern"
                            onClick={() => handleOpenRejectModal(req)}
                          >
                            <X size={16} /> Reject
                          </button>
                        </>
                      ) : (
                        <div style={{ fontSize: "12px", color: "var(--text-dim)", alignSelf: "center" }}>
                          {isApproved && <span style={{ color: "var(--green-neon)" }}>Processed at {req.approvedAt || "Today"}</span>}
                          {isRejected && <span style={{ color: "var(--red)" }}>Reason: {req.rejectionReason}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* =========================================================================
                    REQUIREMENT 8: EXPANDABLE REQUEST DETAILS DRAWER / PANEL
                    ========================================================================= */}
                {expandedDrawerOrder === req.id && (
                  <div className="req-drawer-expanded">
                    <div className="drawer-grid">
                      {/* Tank Stock Availability Check */}
                      <div className="drawer-box">
                        <div className="drawer-title">
                          <Database size={15} style={{ color: "var(--orange)" }} />
                          <span>Depot Tank Stock Verification</span>
                        </div>
                        <div className="drawer-content">
                          {(() => {
                            const tank = tanks.find((t) => t.fuelCode === req.fuelCode);
                            const available = tank ? tank.current - (tank.reserved || 0) : 0;
                            const isEnough = available >= req.qty;
                            return (
                              <div>
                                <div style={{ fontSize: "13px", fontWeight: "700" }}>
                                  Unreserved Tank Volume:{" "}
                                  <span style={{ color: isEnough ? "var(--green-neon)" : "var(--red)" }}>
                                    {available.toLocaleString()} L
                                  </span>
                                </div>
                                <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "3px" }}>
                                  Required: {req.qty.toLocaleString()} L • Status:{" "}
                                  {isEnough ? (
                                    <strong style={{ color: "var(--green-neon)" }}>✓ Stock Available for Reservation</strong>
                                  ) : (
                                    <strong style={{ color: "var(--red)" }}>⚠️ Insufficient Stock! Refill Required</strong>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Customer Credit Line Breakdown */}
                      <div className="drawer-box">
                        <div className="drawer-title">
                          <CreditCard size={15} style={{ color: "var(--blue)" }} />
                          <span>Corporate Credit Account Terms</span>
                        </div>
                        <div className="drawer-content">
                          <div style={{ fontSize: "13px", fontWeight: "700" }}>Net-30 Corporate Billing Account</div>
                          <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "3px" }}>
                            Credit Limit: ₹5,00,000 • Used: ₹1,46,200 • Available:{" "}
                            <strong style={{ color: "var(--green-neon)" }}>₹3,53,800 (Approved)</strong>
                          </div>
                        </div>
                      </div>

                      {/* Delivery Address & GPS Coordinates */}
                      <div className="drawer-box">
                        <div className="drawer-title">
                          <MapPin size={15} style={{ color: "var(--amber)" }} />
                          <span>Delivery Address & Slot</span>
                        </div>
                        <div className="drawer-content">
                          <div style={{ fontSize: "13px", fontWeight: "700" }}>{req.site}, {req.city}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "3px" }}>
                            Requested Slot: {req.slot || "Today 09:00 - 12:00"} • Dedicated GPS Telemetry Route
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* REJECTION REASON MODAL */}
      {selectedRejectRequest && (
        <div className="modal-backdrop" onClick={() => setSelectedRejectRequest(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleConfirmReject} style={{ maxWidth: "480px" }}>
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={20} style={{ color: "var(--red)" }} />
                <h3 style={{ margin: "0", color: "var(--red)" }}>Reject Fuel Request</h3>
              </div>
              <button type="button" className="icon-btn" onClick={() => setSelectedRejectRequest(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "10px 0 0", fontSize: "14px", color: "var(--text-dim)" }}>
              Request: <strong style={{ color: "var(--text)" }}>{selectedRejectRequest.orderNumber}</strong> ({selectedRejectRequest.customer})
            </div>

            <label className="field" style={{ marginTop: "14px" }}>
              <span>Select Rejection Reason</span>
              <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
                <option value="Credit Limit Exceeded">Credit Limit Exceeded</option>
                <option value="Depot Stock Unavailable">Depot Stock Unavailable</option>
                <option value="Unserviceable Delivery Location">Unserviceable Delivery Location</option>
                <option value="Incomplete Customer Verification">Incomplete Customer Verification</option>
                <option value="Custom">Other Custom Reason...</option>
              </select>
            </label>

            {rejectReason === "Custom" && (
              <label className="field">
                <span>Custom Rejection Rationale</span>
                <textarea
                  rows="3"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter specific reason to notify the customer..."
                  required
                />
              </label>
            )}

            <div style={{ background: "rgba(255, 0, 85, 0.1)", border: "1px solid rgba(255, 0, 85, 0.3)", padding: "12px", borderRadius: "10px", fontSize: "12px", color: "#FFA1B8" }}>
              <strong>Customer Notification Note:</strong> The selected rejection reason will be saved on the customer's portal timeline and sent as a real-time notification alert.
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button type="button" className="btn-secondary full" onClick={() => setSelectedRejectRequest(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary full" style={{ backgroundColor: "var(--red)", borderColor: "var(--red)" }}>
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
