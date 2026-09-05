import React, { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Building2,
  CreditCard,
  Plus,
  Truck,
  CheckCircle2,
  Clock,
  FileText,
  Fuel,
  MapPin,
  ShieldCheck,
  Navigation,
  X,
  ArrowRight,
  Headphones,
  RotateCcw,
  AlertTriangle,
  PhoneCall,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Award,
  TrendingUp,
  Download,
  Calendar,
  Sparkles,
  Zap,
} from "lucide-react";
import { STATUS_FLOW } from "../data/seed";
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";
import NewOrderModal from "../components/NewOrderModal";
import InvoiceModal from "../components/InvoiceModal";
import StatusPill from "../components/StatusPill";

// Custom Leaflet Icons for Customer Live Tracking Map
const createDepotMarkerIcon = () =>
  L.divIcon({
    html: `<div style="background:#FF5E00; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #000; box-shadow:0 0 12px rgba(255,94,0,0.6);"><span style="font-size:18px;">🏭</span></div>`,
    className: "custom-leaflet-icon",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

const createCustomerMarkerIcon = () =>
  L.divIcon({
    html: `<div style="background:#10B981; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #000; box-shadow:0 0 12px rgba(16,185,129,0.6);"><span style="font-size:18px;">🏥</span></div>`,
    className: "custom-leaflet-icon",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

const createTruckMarkerIcon = () =>
  L.divIcon({
    html: `<div style="background:#00B4D8; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #FFF; box-shadow:0 0 16px rgba(0,180,216,0.8);" class="leaflet-pulse-ring"><span style="font-size:20px;">🚛</span></div>`,
    className: "custom-leaflet-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const FAQS = [
  {
    q: "How long does fuel delivery take after placing a request?",
    a: "Standard bulk fuel deliveries are fulfilled within 4 to 6 hours of manager approval. Emergency express dispatches arrive within 2 hours.",
  },
  {
    q: "What payment terms apply to corporate credit accounts?",
    a: "Corporate accounts operate on Net-30 credit terms. Invoices are automatically generated upon digital meter discharge.",
  },
  {
    q: "How can I verify fuel quality & density upon discharge?",
    a: "Every delivery tanker is equipped with calibrated digital density meters. Digital quality certificates are attached to your invoice.",
  },
  {
    q: "Can I schedule recurring automated fuel deliveries?",
    a: "Yes! Contact your dedicated account manager or support hotline to set up automated threshold-based depot refills.",
  },
];

export default function CustomerPortal() {
  const { t } = useLanguage();
  const { state } = useAuth();
  const { orders, addOrder } = useOrders();
  const user = state.user;

  const [modalOpen, setModalOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [prefillData, setPrefillData] = useState(null);
  const [activeTab, setActiveTab] = useState("active");

  // Simulated live moving coordinates for tracking map
  const [tankerPos, setTankerPos] = useState([13.0720, 80.2600]);

  // Filter orders matching logged in customer name
  const myOrders = useMemo(() => {
    if (!user) return orders;
    return orders.filter(
      (o) =>
        o.customer.toLowerCase().includes(user.name.toLowerCase()) ||
        user.name.toLowerCase().includes(o.customer.toLowerCase())
    );
  }, [orders, user]);

  const activeDeliveries = useMemo(
    () => myOrders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled" && o.status !== "Rejected"),
    [myOrders]
  );

  const completedDeliveries = useMemo(
    () => myOrders.filter((o) => o.status === "Delivered"),
    [myOrders]
  );

  const totalLitresOrdered = useMemo(
    () => myOrders.reduce((sum, o) => sum + (o.status !== "Cancelled" && o.status !== "Rejected" ? o.qty : 0), 0),
    [myOrders]
  );

  const latestActiveOrder = activeDeliveries[0] || myOrders[0];

  const creditLimit = user?.creditLimit || 500000;
  const creditUsed = user?.creditUsed || 146200;
  const availableCredit = Math.max(0, creditLimit - creditUsed);
  const creditPercent = Math.round((creditUsed / creditLimit) * 100);

  // Animate live tanker position on live map
  useEffect(() => {
    const timer = setInterval(() => {
      setTankerPos((prev) => {
        const nextLat = prev[0] - 0.001;
        const nextLng = prev[1] - 0.0008;
        if (nextLat <= 13.0610) return [13.0827, 80.2707];
        return [Number(nextLat.toFixed(4)), Number(nextLng.toFixed(4))];
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const handleCreateOrder = (newOrderData) => {
    addOrder({
      ...newOrderData,
      customer: user?.name || "Corporate Customer",
      site: user?.site || "Primary Delivery Site",
      city: user?.city || "Chennai",
    });
    setPrefillData(null);
  };

  const handleOrderAgain = (pastOrder) => {
    setPrefillData({
      fuelCode: pastOrder.fuelCode,
      qty: pastOrder.qty,
    });
    setModalOpen(true);
  };

  // Mock Invoice download handler
  const handleDownloadInvoicePDF = (orderNumber) => {
    alert(`Downloading Tax Invoice PDF for Order ${orderNumber}...`);
  };

  // Check account verification status
  const isVerified = user?.isVerified !== false && user?.status !== "Pending Review";

  return (
    <div className="customer-consumer-portal" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Account Verification Status Alert Banner */}
      {!isVerified && (
        <div style={{ background: "rgba(255, 183, 3, 0.12)", border: "1px solid var(--amber)", borderRadius: "18px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <AlertTriangle size={24} style={{ color: "var(--amber)", flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: "15px", color: "var(--text)" }}>Your company account is under verification.</strong>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--text-dim)" }}>
                Fuel ordering is disabled until manager document review & KYC is completed. <strong style={{ color: "var(--amber)" }}>Status: Pending Review</strong>
              </p>
            </div>
          </div>
          <span className="badge-tag tag-normal" style={{ background: "rgba(255, 183, 3, 0.2)", color: "var(--amber)", borderColor: "var(--amber)" }}>
            Pending Verification
          </span>
        </div>
      )}

      {/* =========================================================================
          1. CUSTOMER WELCOME HERO BANNER (AMAZON / SAAS CONSUMER STYLE)
          ========================================================================= */}
      <div className="cust-hero-banner">
        <div className="cust-hero-main">
          <div className="cust-avatar-badge">
            <Building2 size={36} style={{ color: "var(--orange)" }} />
          </div>
          <div>
            <div className="cust-tier-pill">
              <Award size={14} /> GOLD TIER CORPORATE ACCOUNT
            </div>
            <h1 className="cust-hero-title">
              Welcome Back, {user?.name || "TamilNadu Industrial Corp"}
            </h1>
            <p className="cust-hero-sub">
              <MapPin size={15} style={{ color: "var(--orange)" }} /> {user?.site || "Guindy Industrial Complex"} • {user?.city || "Chennai"}, TN
            </p>
          </div>
        </div>

        {/* Hero Rewards & Stats Strip */}
        <div className="cust-hero-metrics-strip">
          <div className="metric-chip">
            <span className="chip-label"><Sparkles size={13} style={{ color: "var(--amber)" }} /> Loyalty Rewards</span>
            <strong className="chip-value" style={{ color: "var(--amber)" }}>4,850 Pts</strong>
          </div>
          <div className="metric-chip">
            <span className="chip-label"><Fuel size={13} style={{ color: "var(--orange)" }} /> Monthly Fuel Usage</span>
            <strong className="chip-value">48,500 L</strong>
          </div>
          <div className="metric-chip">
            <span className="chip-label"><CreditCard size={13} style={{ color: "var(--blue)" }} /> Available Credit</span>
            <strong className="chip-value" style={{ color: "var(--blue)" }}>₹{availableCredit.toLocaleString("en-IN")}</strong>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. QUICK ACTION CARDS (AMAZON / SWIGGY FAST ACTION HUB)
          ========================================================================= */}
      <div>
        <h3 className="section-title-sm">Quick Self-Service Actions</h3>
        <div className="cust-quick-grid">
          {/* Card 1: Request Fuel */}
          <div
            className="cust-action-card card-orange"
            onClick={() => {
              setPrefillData(null);
              setModalOpen(true);
            }}
          >
            <div className="action-icon-circle bg-orange">
              <Plus size={26} />
            </div>
            <div className="action-text">
              <strong>Request Fuel</strong>
              <small>Order bulk fuel in 60 seconds</small>
            </div>
            <ArrowRight size={18} className="arrow-icon" />
          </div>

          {/* Card 2: Track Order */}
          <div
            className="cust-action-card card-blue"
            onClick={() => {
              const el = document.getElementById("live-order-tracker");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <div className="action-icon-circle bg-blue">
              <Navigation size={26} />
            </div>
            <div className="action-text">
              <strong>Track Delivery</strong>
              <small>Real-time OpenStreetMap radar</small>
            </div>
            <ArrowRight size={18} className="arrow-icon" />
          </div>

          {/* Card 3: Download Invoice */}
          <div
            className="cust-action-card card-green"
            onClick={() => myOrders[0] && setInvoiceOrder(myOrders[0])}
          >
            <div className="action-icon-circle bg-green">
              <Download size={26} />
            </div>
            <div className="action-text">
              <strong>Download Invoice</strong>
              <small>Get GST tax receipts & bills</small>
            </div>
            <ArrowRight size={18} className="arrow-icon" />
          </div>

          {/* Card 4: Support Center */}
          <div
            className="cust-action-card card-purple"
            onClick={() => setSupportModalOpen(true)}
          >
            <div className="action-icon-circle bg-purple">
              <Headphones size={26} />
            </div>
            <div className="action-text">
              <strong>Support Center</strong>
              <small>24/7 Dispatch help hotline</small>
            </div>
            <ArrowRight size={18} className="arrow-icon" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. LIVE ORDER TRACKING SECTION (AMAZON / SWIGGY LIVE MAP TRACKER)
          ========================================================================= */}
      {latestActiveOrder && (
        <div id="live-order-tracker" className="cust-live-tracker-box">
          <div className="tracker-top-bar">
            <div className="tracker-top-info">
              <div className="live-pulse-badge">
                <span className="pulse-dot"></span> LIVE EN-ROUTE DISPATCH
              </div>
              <h2 className="tracker-order-id">
                Order {latestActiveOrder.orderNumber}
              </h2>
              <p className="tracker-sub-text">
                Fuel: <strong>{latestActiveOrder.qty.toLocaleString()} L ({latestActiveOrder.fuelCode})</strong> • Site: <strong>{latestActiveOrder.site} ({latestActiveOrder.city})</strong>
              </p>
            </div>

            <div className="eta-badge-box">
              <Clock size={20} style={{ color: "var(--orange)" }} />
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                  ESTIMATED ARRIVAL
                </div>
                <strong style={{ fontSize: "18px", color: "var(--green-neon)", fontFamily: "'Oswald', sans-serif" }}>
                  ⏱️ 28 Mins (Today, 4:30 PM)
                </strong>
              </div>
            </div>
          </div>

          {/* REAL OPENSTREETMAP LIVE TRACKING CANVAS */}
          <div className="cust-map-container-box">
            <MapContainer
              center={[13.0720, 80.2600]}
              zoom={13}
              zoomControl={false}
              style={{ width: "100%", height: "320px", borderRadius: "16px" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />

              {/* Depot Marker */}
              <Marker position={[13.0827, 80.2707]} icon={createDepotMarkerIcon()}>
                <Popup>📍 Chennai Central Depot</Popup>
              </Marker>

              {/* Customer Site Marker */}
              <Marker position={[13.0600, 80.2500]} icon={createCustomerMarkerIcon()}>
                <Popup>🏥 {latestActiveOrder.site}</Popup>
              </Marker>

              {/* Moving Tanker Marker */}
              <Marker position={tankerPos} icon={createTruckMarkerIcon()}>
                <Popup>
                  🚛 <strong>{latestActiveOrder.vehicle || "TN-01-AB-1234"}</strong><br />
                  Driver: {latestActiveOrder.driver || "R. Rangarajan"}<br />
                  Speed: 64 km/h (En-route)
                </Popup>
              </Marker>

              {/* Glowing Route Polyline */}
              <Polyline
                positions={[
                  [13.0827, 80.2707],
                  tankerPos,
                  [13.0600, 80.2500],
                ]}
                pathOptions={{ color: "#FF5E00", weight: 5, dashArray: "6,6" }}
              />
            </MapContainer>
          </div>

          {/* Assigned Driver & Tanker Details Strip */}
          <div className="driver-telemetry-strip">
            <div className="driver-profile-mini">
              <div className="driver-avatar-circle">👨‍✈️</div>
              <div>
                <strong className="driver-name-str">{latestActiveOrder.driver || "R. Rangarajan"}</strong>
                <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                  Verified Depot Tanker Driver • ⭐ 4.9 Rating
                </div>
              </div>
            </div>

            <div className="driver-actions-mini">
              <span className="tanker-reg-pill">🚛 {latestActiveOrder.vehicle || "TN-01-AB-1234"}</span>
              <a href="tel:+919876543210" className="btn-call-mini">
                <PhoneCall size={14} /> Call Driver
              </a>
            </div>
          </div>

          {/* 5. VISUAL DELIVERY TIMELINE STEPPER */}
          <div className="delivery-timeline-stepper">
            <h4 className="timeline-title">Delivery Progress Lifecycle</h4>
            <div className="stepper-track">
              {STATUS_FLOW.map((step, i) => {
                const currentIdx = STATUS_FLOW.indexOf(latestActiveOrder.status);
                const isDone = i < currentIdx;
                const isCurrent = i === currentIdx;

                return (
                  <div key={step} className={`stepper-node ${isDone ? "completed" : ""} ${isCurrent ? "active" : ""}`}>
                    <div className="stepper-icon">
                      {isDone ? <CheckCircle2 size={16} /> : i + 1}
                    </div>
                    <span className="stepper-label">{t(`status_${step}`)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. ACTIVE & COMPLETED ORDERS (MODERN GLASS CARDS INSTEAD OF PLAIN TABLES)
          ========================================================================= */}
      <div className="cust-orders-section">
        <div className="orders-section-header">
          <div className="tabs-header">
            <button
              className={`tab-btn ${activeTab === "active" ? "active" : ""}`}
              onClick={() => setActiveTab("active")}
            >
              Active Orders ({activeDeliveries.length})
            </button>
            <button
              className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              Order History ({completedDeliveries.length})
            </button>
          </div>

          <button
            className="btn-primary btn-sm"
            onClick={() => {
              setPrefillData(null);
              setModalOpen(true);
            }}
          >
            + Request Fuel
          </button>
        </div>

        {/* Order Cards Grid */}
        <div className="order-cards-grid">
          {(activeTab === "active" ? activeDeliveries : completedDeliveries).map((o) => (
            <div key={o.id} className="glass-order-card">
              <div className="card-top-row">
                <div>
                  <span className="order-num-tag">{o.orderNumber}</span>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>
                    Requested: {o.createdAt || "Aug 28, 2026"}
                  </div>
                </div>
                <StatusPill status={o.status} />
              </div>

              <div className="card-body-row">
                <div className="fuel-detail-chip">
                  <Fuel size={18} style={{ color: "var(--orange)" }} />
                  <div>
                    <strong style={{ fontSize: "16px" }}>{o.qty.toLocaleString()} Litres</strong>
                    <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                      {o.fuelCode} ({o.fuelCode === "DSL" ? "Diesel" : "Petrol"})
                    </div>
                  </div>
                </div>

                <div className="site-detail-chip">
                  <MapPin size={16} style={{ color: "var(--blue)" }} />
                  <span>{o.site} ({o.city})</span>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="card-footer-actions">
                <button
                  className="btn-ghost-sm"
                  onClick={() => setTrackingOrder(o)}
                >
                  <Navigation size={14} style={{ color: "var(--blue)" }} /> Track Order
                </button>

                <button
                  className="btn-ghost-sm"
                  onClick={() => setInvoiceOrder(o)}
                >
                  <FileText size={14} style={{ color: "var(--green)" }} /> Tax Invoice
                </button>

                <button
                  className="btn-ghost-sm"
                  onClick={() => handleOrderAgain(o)}
                  style={{ color: "var(--amber)", fontWeight: 700 }}
                >
                  <RotateCcw size={14} /> Order Again
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          6. RECENT INVOICES SECTION
          ========================================================================= */}
      <div className="cust-invoices-section">
        <h3 className="section-title-sm">Recent Tax Invoices & Downloads</h3>
        <div className="invoices-cards-grid">
          {myOrders.slice(0, 3).map((o, idx) => (
            <div key={o.id} className="invoice-download-card">
              <div className="inv-icon">
                <FileText size={24} style={{ color: "var(--green)" }} />
              </div>
              <div className="inv-details">
                <strong style={{ fontSize: "14px" }}>#INV-2026-08{idx + 1}</strong>
                <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                  Date: Aug {24 + idx}, 2026 • Amount: <strong style={{ color: "var(--text)" }}>₹{(o.qty * 89.5).toLocaleString("en-IN")}</strong>
                </div>
              </div>
              <button
                className="btn-download-pdf"
                onClick={() => handleDownloadInvoicePDF(o.orderNumber)}
              >
                <Download size={14} /> PDF
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          7. CONSUMPTION & SPEND ANALYTICS WIDGET
          ========================================================================= */}
      <div className="cust-analytics-widget">
        <h3 className="section-title-sm">Monthly Consumption & Spend Analytics</h3>
        <div className="analytics-grid-cards">
          <div className="analytics-card">
            <div className="analytics-icon bg-orange">
              <Fuel size={20} />
            </div>
            <div>
              <span className="analytics-lbl">Total Fuel Received</span>
              <strong className="analytics-val">{totalLitresOrdered.toLocaleString()} L</strong>
              <div style={{ fontSize: "11px", color: "var(--green-neon)", marginTop: "2px" }}>
                ↑ 12% vs Previous Month
              </div>
            </div>
          </div>

          <div className="analytics-card">
            <div className="analytics-icon bg-blue">
              <CreditCard size={20} />
            </div>
            <div>
              <span className="analytics-lbl">Total Monthly Spend</span>
              <strong className="analytics-val">₹{(totalLitresOrdered * 89.5).toLocaleString("en-IN")}</strong>
              <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "2px" }}>
                Net-30 Corporate Billing
              </div>
            </div>
          </div>

          <div className="analytics-card">
            <div className="analytics-icon bg-green">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="analytics-lbl">Delivery Success Rate</span>
              <strong className="analytics-val">100%</strong>
              <div style={{ fontSize: "11px", color: "var(--green-neon)", marginTop: "2px" }}>
                Zero Discharge Defect
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TRACK DELIVERY MODAL
          ========================================================================= */}
      {trackingOrder && (
        <div className="modal-backdrop" onClick={() => setTrackingOrder(null)}>
          <div className="modal-card tracking-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="modal-head">
              <div>
                <h3 style={{ margin: 0 }}>Delivery Status: {trackingOrder.orderNumber}</h3>
                <p className="cell-dim" style={{ margin: "2px 0 0" }}>{trackingOrder.customer} • {trackingOrder.site}</p>
              </div>
              <button className="icon-btn" onClick={() => setTrackingOrder(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="tracking-body" style={{ padding: "16px" }}>
              <div className="tracker-badge-box" style={{ display: "flex", gap: "12px", background: "var(--grad-dark-panel)", padding: "14px", borderRadius: "12px", border: "1px solid var(--line)" }}>
                <Truck size={28} className="icon-blue" />
                <div>
                  <strong style={{ color: "var(--text)" }}>Assigned Driver: {trackingOrder.driver || "Pending Manager Assignment"}</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--text-dim)" }}>
                    Vehicle Tanker: <strong style={{ color: "var(--orange)" }}>{trackingOrder.vehicle || "Unassigned"}</strong>
                  </p>
                </div>
              </div>

              <div className="tracking-timeline-box" style={{ marginTop: "16px" }}>
                <h4 style={{ margin: "0 0 12px 0" }}>Dispatch Lifecycle Progress</h4>
                <ol className="timeline">
                  {STATUS_FLOW.map((step, i) => {
                    const currentIdx = STATUS_FLOW.indexOf(trackingOrder.status);
                    const isDone = i <= currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <li
                        key={step}
                        className={`timeline-step ${isDone ? "done" : ""} ${isCurrent ? "active-step" : ""}`}
                      >
                        <div>
                          <strong>{t(`status_${step}`)}</strong>
                          <p className="step-desc">
                            {step === "Pending" && "Fuel request received & pending manager review."}
                            {step === "Approved" && "Credit check passed & depot stock reserved."}
                            {step === "Dispatched" && "Driver and tanker assigned; cargo loaded."}
                            {step === "InTransit" && "Tanker en-route via Tamil Nadu satellite GPS radar."}
                            {step === "Delivered" && "Fuel discharged & digital meter tax receipt issued."}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          24/7 CUSTOMER SUPPORT MODAL
          ========================================================================= */}
      {supportModalOpen && (
        <div className="modal-backdrop" onClick={() => setSupportModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "540px" }}>
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Headphones size={22} style={{ color: "var(--orange)" }} />
                <h3 style={{ margin: 0 }}>24/7 Corporate Dispatch Support</h3>
              </div>
              <button className="icon-btn" onClick={() => setSupportModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "10px 0" }}>
              <div style={{ background: "var(--grad-dark-panel)", border: "1px solid var(--line)", padding: "16px", borderRadius: "14px" }}>
                <div style={{ fontSize: "12px", color: "var(--orange)", fontWeight: "700" }}>
                  TOLL-FREE DISPATCH HOTLINE
                </div>
                <div style={{ fontSize: "22px", fontWeight: "900", color: "#F8FAFC", margin: "4px 0" }}>
                  📞 +91 1800-419-FUEL (3835)
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                  24/7 Emergency Rerouting, Rescheduling & Priority Support
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <MessageSquare size={20} style={{ color: "var(--green-neon)" }} />
                  <div>
                    <strong style={{ fontSize: "14px", color: "#F8FAFC" }}>Live Dispatch Agent Chat</strong>
                    <div style={{ fontSize: "12px", color: "var(--green-neon)" }}>🟢 4 Dispatch Officers Online Now</div>
                  </div>
                </div>
                <button className="btn-primary btn-sm" onClick={() => alert("Connecting to Live Dispatch Chat Agent...")}>
                  Start Chat
                </button>
              </div>

              <div>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: "700" }}>Frequently Asked Questions</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {FAQS.map((faq, i) => (
                    <div
                      key={i}
                      style={{
                        background: "var(--panel)",
                        border: "1px solid var(--line)",
                        borderRadius: "10px",
                        padding: "12px 14px",
                        cursor: "pointer",
                      }}
                      onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: "600", fontSize: "13px" }}>
                        <span>{faq.q}</span>
                        {activeFaq === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                      {activeFaq === i && (
                        <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "var(--text-dim)", lineHeight: "1.4" }}>
                          {faq.a}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "12px" }}>
              <button className="btn-secondary full" onClick={() => setSupportModalOpen(false)}>
                Close Support Center
              </button>
            </div>
          </div>
        </div>
      )}

      <NewOrderModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPrefillData(null);
        }}
        onCreate={handleCreateOrder}
        initialData={prefillData}
      />
      {invoiceOrder && <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
    </div>
  );
}
