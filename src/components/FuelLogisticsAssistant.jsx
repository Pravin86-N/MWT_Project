import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  X,
  Send,
  Sparkles,
  Truck,
  Fuel,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  PackageCheck,
  ChevronDown,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrdersContext";
import { useInventory } from "../context/InventoryContext";

export default function FuelLogisticsAssistant() {
  const { state } = useAuth();
  const user = state?.user || JSON.parse(localStorage.getItem("fdms-user") || "{}");
  const role = (user?.role || "Customer").toLowerCase();
  const isManagerOrAdmin = ["admin", "depot manager", "support executive", "auditor"].includes(role);

  const { orders } = useOrders();
  const { tanks, lowStockWarnings } = useInventory();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, isTyping]);

  // Listen to global open event (e.g. from CustomerPortal "Start Chat" button)
  useEffect(() => {
    const handleOpenEvent = (e) => {
      setIsOpen(true);
      setIsMinimized(false);
      if (e.detail?.initialPrompt) {
        handleQuickPrompt(e.detail.initialPrompt);
      }
    };
    window.addEventListener("open-fuel-assistant", handleOpenEvent);
    return () => window.removeEventListener("open-fuel-assistant", handleOpenEvent);
  }, [orders, tanks]);

  // Initialize greeting on first launch or role detection
  useEffect(() => {
    if (messages.length === 0) {
      if (isManagerOrAdmin) {
        setMessages([
          {
            id: 1,
            sender: "bot",
            text: `👋 Greetings, **${user?.name || "Depot Manager"}**! I am your **AI Fuel Logistics Assistant**. I monitor real-time depot vault levels, telemetry threshold alerts, and active tanker dispatches across Tamil Nadu.`,
            type: "greeting",
            quickOptions: [
              { label: "⛽ Inventory Status", key: "inventory_status" },
              { label: "⚠️ Low Stock Alerts", key: "low_stock_alerts" },
              { label: "🚛 Active Fleet Dispatches", key: "fleet_status" },
              { label: "📋 Pending Approvals", key: "pending_orders" },
            ],
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        setMessages([
          {
            id: 1,
            sender: "bot",
            text: `👋 Hello **${user?.name || "Valued Customer"}**! I am your **Fuel Logistics Assistant**. How may I assist your fuel deliveries today? You can track existing consignments, check live tanker ETA, or ask about fuel specifications.`,
            type: "greeting",
            quickOptions: [
              { label: "🔍 Track Order", key: "track_order" },
              { label: "🚚 Delivery Status", key: "delivery_status" },
              { label: "📄 Invoices & Receipts", key: "invoice_info" },
              { label: "🧪 Fuel Quality Guarantee", key: "fuel_quality" },
            ],
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    }
  }, [isManagerOrAdmin, user]);

  // Customer: find recent orders for this customer
  const customerOrders = orders.filter((o) => {
    if (!user) return true;
    if (user.company && o.customer?.toLowerCase().includes(user.company.toLowerCase())) return true;
    if (user.name && o.customer?.toLowerCase().includes(user.name.toLowerCase())) return true;
    return true; // fallback to general list
  });

  const latestOrder = customerOrders[0] || orders[0];

  // AI Logic Generator
  const generateAssistantResponse = (queryKey, customQuery = "") => {
    const q = (queryKey || customQuery).toLowerCase();

    // 1. CUSTOMER: TRACK ORDER
    if (q.includes("track") || q.includes("where") || q.includes("consignment") || queryKey === "track_order") {
      if (!latestOrder) {
        return {
          text: "No active fuel delivery orders were found for your account. You can create a new bulk request anytime using the '+ New Fuel Request' button on your dashboard.",
        };
      }
      return {
        text: `Here is the current tracking telemetry for your latest fuel order:`,
        card: {
          type: "order_track",
          orderNumber: latestOrder.orderNumber || "ORD-RECENT",
          customer: latestOrder.customer || "Your Facility",
          fuel: latestOrder.fuelType || latestOrder.fuelCode || "Diesel (HSD)",
          quantity: `${latestOrder.quantity || latestOrder.qty || 5000} Litres`,
          status: latestOrder.status || "Pending",
          driver: latestOrder.driver || "Assigned Driver",
          vehicle: latestOrder.vehicle || "Tanker En Route",
          city: latestOrder.city || latestOrder.deliveryAddress || "Chennai",
          eta: latestOrder.status === "Delivered" ? "Delivered & Discharged" : "Approx. 45 - 60 minutes",
        },
      };
    }

    // 2. CUSTOMER: DELIVERY STATUS
    if (q.includes("delivery") || q.includes("eta") || q.includes("arrive") || q.includes("driver") || queryKey === "delivery_status") {
      if (!latestOrder) {
        return {
          text: "You currently have no dispatched fuel tankers en route. All systems are operating nominally.",
        };
      }
      const isEnRoute = ["In Transit", "InTransit", "Dispatched"].includes(latestOrder.status);
      return {
        text: isEnRoute
          ? `🚛 **Tanker is currently en route!** Telemetry indicates your delivery tanker is active on the GPS corridor.`
          : `ℹ️ **Current Status: ${latestOrder.status}**. ${latestOrder.status === "Delivered" ? "Your fuel consignment has been successfully discharged and digitally verified." : "Your order is scheduled for dispatch from the nearest regional fuel terminal."}`,
        card: {
          type: "delivery_status",
          orderNumber: latestOrder.orderNumber,
          status: latestOrder.status,
          vehiclePlate: latestOrder.vehicle || "TN-01-AB-1234",
          driverName: latestOrder.driver || "R. Rangarajan (Hazmat Certified)",
          dischargeSpeed: isEnRoute ? "46 km/h (Nominal Transit)" : "Stationary at Terminal",
          estArrival: isEnRoute ? "35 - 50 mins (Live GPS Telemetry)" : "Scheduled window",
        },
      };
    }

    // 3. MANAGER: INVENTORY STATUS
    if (q.includes("inventory") || q.includes("vault") || q.includes("stock") || q.includes("capacity") || queryKey === "inventory_status") {
      const tankItems = tanks.length > 0 ? tanks : [
        { fuelCode: "DSL", name: "Diesel Main Vault #1", current: 38400, capacity: 50000, threshold: 10000 },
        { fuelCode: "PTL", name: "Super Petrol Vault #2", current: 29150, capacity: 40000, threshold: 8000 },
        { fuelCode: "LPG", name: "LPG Pressurized Sphere #3", current: 18900, capacity: 25000, threshold: 5000 },
        { fuelCode: "KRS", name: "Kerosene Auxiliary Vault #4", current: 4200, capacity: 15000, threshold: 3000 },
      ];

      return {
        text: `⛽ **Real-Time Depot Inventory Status**: Here is the latest telemetric calibration from the terminal underground vaults:`,
        card: {
          type: "inventory_report",
          tanks: tankItems.map((t) => ({
            name: t.name,
            fuel: t.fuelCode || t.fuelType,
            current: t.current || t.currentStock || 0,
            capacity: t.capacity || 50000,
            percent: Math.round(((t.current || t.currentStock || 0) / (t.capacity || 1)) * 100),
            isLow: (t.current || t.currentStock || 0) <= (t.threshold || t.minimumThreshold || 5000),
          })),
        },
      };
    }

    // 4. MANAGER: LOW STOCK ALERTS
    if (q.includes("low") || q.includes("alert") || q.includes("warning") || q.includes("refill") || queryKey === "low_stock_alerts") {
      const flaggedTanks = (tanks.length > 0 ? tanks : [
        { fuelCode: "KRS", name: "Kerosene Auxiliary Vault #4", current: 4200, capacity: 15000, threshold: 5000 }
      ]).filter((t) => (t.current || t.currentStock || 0) <= (t.threshold || t.minimumThreshold || 5000));

      if (flaggedTanks.length === 0) {
        return {
          text: `✅ **All Storage Tanks Optimal!** Every depot vault is currently operating well above reserve safety thresholds. No replenishment is urgently needed.`,
        };
      }

      return {
        text: `⚠️ **CRITICAL INVENTORY ALERT**: Found ${flaggedTanks.length} vault(s) below or nearing minimum reserve thresholds:`,
        card: {
          type: "low_stock_alert",
          flaggedTanks: flaggedTanks.map((t) => ({
            name: t.name,
            fuel: t.fuelCode || t.fuelType,
            current: t.current || t.currentStock,
            threshold: t.threshold || t.minimumThreshold || 5000,
            percent: Math.round(((t.current || t.currentStock || 0) / (t.capacity || 1)) * 100),
          })),
        },
      };
    }

    // 5. MANAGER: FLEET STATUS
    if (q.includes("fleet") || q.includes("truck") || q.includes("vehicle") || queryKey === "fleet_status") {
      const activeEnRoute = orders.filter((o) => ["In Transit", "InTransit", "Dispatched"].includes(o.status));
      return {
        text: `🚛 **Live Fleet Dispatch Summary**: We currently have **${activeEnRoute.length}** tanker(s) actively fulfilling deliveries on regional corridors.`,
        card: {
          type: "fleet_summary",
          activeCount: activeEnRoute.length,
          totalOrders: orders.length,
          deliveredToday: orders.filter((o) => o.status === "Delivered").length,
        },
      };
    }

    // 6. MANAGER: PENDING ORDERS
    if (q.includes("pending") || q.includes("approval") || queryKey === "pending_orders") {
      const pendingList = orders.filter((o) => o.status === "Pending" || o.status === "Pending Approval");
      return {
        text: `📋 **Pending Customer Requests**: There are **${pendingList.length}** fuel purchase orders awaiting terminal manager validation and smart dispatch assignment.`,
        card: {
          type: "pending_summary",
          pendingCount: pendingList.length,
          items: pendingList.slice(0, 3).map((o) => ({
            id: o.orderNumber,
            customer: o.customer,
            qty: `${o.quantity || o.qty}L ${o.fuelType || o.fuelCode}`,
          })),
        },
      };
    }

    // 7. INVOICE INFO
    if (q.includes("invoice") || q.includes("receipt") || q.includes("tax") || queryKey === "invoice_info") {
      return {
        text: `📄 **Digital Invoicing & GST Receipts**: FuelNet 360 generates computerized tax invoices (with CGST/SGST 18%) upon digital flowmeter discharge confirmation. You can view, download, or print invoices directly from your Order History table.`,
      };
    }

    // 8. FUEL QUALITY
    if (q.includes("quality") || q.includes("density") || q.includes("grade") || queryKey === "fuel_quality") {
      return {
        text: `🧪 **Certified Fuel Quality Assurance**: Every delivery tanker utilizes calibrated hydrometers and temperature-compensated digital meters conforming to IS 1460 (BS-VI) automotive fuels. Quality certificates are stamped on digital invoices.`,
      };
    }

    // Default conversational response
    return {
      text: `I've analyzed your query regarding "${customQuery}". As your Fuel Logistics Assistant, I can help you verify live order delivery ETAs, track active tankers, review depot inventory, or monitor fuel safety alerts. Please select a quick action below or ask any logistics question!`,
    };
  };

  const handleSendMessage = (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      const botResponse = generateAssistantResponse("", query);
      const newBotMsg = {
        id: Date.now() + 1,
        sender: "bot",
        text: botResponse.text,
        card: botResponse.card,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, newBotMsg]);
      setIsTyping(false);
    }, 600);
  };

  const handleQuickPrompt = (key) => {
    const labelMap = {
      track_order: "Track my latest fuel order",
      delivery_status: "Check real-time delivery status & ETA",
      inventory_status: "Display depot fuel inventory status",
      low_stock_alerts: "Check low stock alerts & critical thresholds",
      fleet_status: "Show active fleet dispatch summary",
      pending_orders: "Show pending customer approval orders",
      invoice_info: "How do I get my digital tax invoice?",
      fuel_quality: "Tell me about fuel quality & density certification",
    };

    const userText = labelMap[key] || key;
    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const botResponse = generateAssistantResponse(key, userText);
      const newBotMsg = {
        id: Date.now() + 1,
        sender: "bot",
        text: botResponse.text,
        card: botResponse.card,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, newBotMsg]);
      setIsTyping(false);
    }, 500);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          className="fuel-assistant-launcher"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          title="Open Fuel Logistics Assistant"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "linear-gradient(135deg, #FF5E00 0%, #D9480F 100%)",
            color: "#FFF",
            border: "none",
            borderRadius: "50px",
            padding: "12px 20px",
            boxShadow: "0 8px 24px rgba(255, 94, 0, 0.45)",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "14px",
            transition: "all 0.25s ease",
          }}
        >
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Bot size={22} />
            <span
              style={{
                position: "absolute",
                top: "-2px",
                right: "-2px",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#10B981",
                border: "2px solid #FFF",
              }}
            />
          </div>
          <span>AI Logistics Assistant</span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className="fuel-assistant-modal"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: isMinimized ? "320px" : "390px",
            height: isMinimized ? "52px" : "550px",
            maxHeight: "calc(100vh - 48px)",
            maxWidth: "calc(100vw - 32px)",
            backgroundColor: "#0F172A",
            border: "1px solid rgba(255, 94, 0, 0.35)",
            borderRadius: "18px",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.65), 0 0 20px rgba(255, 94, 0, 0.2)",
            display: "flex",
            flexDirection: "column",
            zIndex: 10000,
            overflow: "hidden",
            transition: "height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              background: "linear-gradient(90deg, #1E293B 0%, #0F172A 100%)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            onClick={() => setIsMinimized((prev) => !prev)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #FF5E00 0%, #D9480F 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFF",
                }}
              >
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#F8FAFC", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>Fuel Logistics AI</span>
                  <span
                    style={{
                      fontSize: "10px",
                      background: isManagerOrAdmin ? "rgba(255, 94, 0, 0.2)" : "rgba(16, 185, 129, 0.2)",
                      color: isManagerOrAdmin ? "var(--orange)" : "var(--green-neon)",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      fontWeight: "700",
                    }}
                  >
                    {isManagerOrAdmin ? "Operations Mode" : "Customer Mode"}
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
                  Live Telemetry Connected
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
              <button
                className="icon-btn"
                style={{ color: "var(--text-dim)", padding: "4px" }}
                onClick={() => setIsMinimized((prev) => !prev)}
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>
              <button
                className="icon-btn"
                style={{ color: "var(--text-dim)", padding: "4px" }}
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          {!isMinimized && (
            <>
              {/* Message List */}
              <div
                style={{
                  flex: 1,
                  padding: "16px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: m.sender === "user" ? "flex-end" : "flex-start",
                      maxWidth: "100%",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: m.sender === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                        background: m.sender === "user" ? "var(--orange)" : "#1E293B",
                        color: "#F8FAFC",
                        fontSize: "13px",
                        lineHeight: "1.45",
                        border: m.sender === "user" ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
                        maxWidth: "88%",
                        wordBreak: "break-word",
                      }}
                    >
                      <div>{m.text}</div>

                      {/* Render Order Tracking Card */}
                      {m.card?.type === "order_track" && (
                        <div
                          style={{
                            marginTop: "10px",
                            background: "rgba(0, 0, 0, 0.35)",
                            borderRadius: "10px",
                            padding: "10px",
                            border: "1px solid rgba(255, 94, 0, 0.3)",
                            fontSize: "12px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: "var(--orange)" }}>
                            <span>{m.card.orderNumber}</span>
                            <span style={{ color: "#10B981" }}>{m.card.status}</span>
                          </div>
                          <div style={{ marginTop: "4px", color: "var(--text-dim)" }}>
                            ⛽ {m.card.fuel} · <strong>{m.card.quantity}</strong>
                          </div>
                          <div style={{ marginTop: "2px", color: "var(--text-dim)" }}>
                            📍 {m.card.city} · 🚛 {m.card.vehicle}
                          </div>
                          <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "6px", color: "#38BDF8", fontWeight: "600" }}>
                            <Clock size={13} /> ETA: {m.card.eta}
                          </div>
                        </div>
                      )}

                      {/* Render Delivery Status Card */}
                      {m.card?.type === "delivery_status" && (
                        <div
                          style={{
                            marginTop: "10px",
                            background: "rgba(0, 0, 0, 0.35)",
                            borderRadius: "10px",
                            padding: "10px",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            fontSize: "12px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700" }}>
                            <span>{m.card.orderNumber}</span>
                            <span style={{ color: "#38BDF8" }}>{m.card.status}</span>
                          </div>
                          <div style={{ marginTop: "4px" }}>
                            🚛 Tanker: <strong>{m.card.vehiclePlate}</strong>
                          </div>
                          <div style={{ marginTop: "2px", color: "var(--text-dim)" }}>
                            👨‍✈️ Driver: {m.card.driverName}
                          </div>
                          <div style={{ marginTop: "4px", color: "var(--orange)" }}>
                            ⚡ Telemetry: {m.card.dischargeSpeed}
                          </div>
                          <div style={{ marginTop: "4px", color: "#10B981", fontWeight: "600" }}>
                            ⏱ Estimated Arrival: {m.card.estArrival}
                          </div>
                        </div>
                      )}

                      {/* Render Manager Inventory Status Card */}
                      {m.card?.type === "inventory_report" && (
                        <div
                          style={{
                            marginTop: "10px",
                            background: "rgba(0, 0, 0, 0.35)",
                            borderRadius: "10px",
                            padding: "10px",
                            border: "1px solid rgba(255, 94, 0, 0.3)",
                            fontSize: "12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          {m.card.tanks.map((t, idx) => (
                            <div key={idx}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "600" }}>
                                <span>{t.fuel} ({t.name})</span>
                                <span style={{ color: t.isLow ? "var(--red)" : "var(--green-neon)" }}>
                                  {t.current.toLocaleString()} L ({t.percent}%)
                                </span>
                              </div>
                              <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "3px", overflow: "hidden" }}>
                                <div
                                  style={{
                                    width: `${t.percent}%`,
                                    height: "100%",
                                    background: t.isLow ? "var(--red)" : "var(--green-neon)",
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Render Low Stock Alert Card */}
                      {m.card?.type === "low_stock_alert" && (
                        <div
                          style={{
                            marginTop: "10px",
                            background: "rgba(239, 68, 68, 0.15)",
                            borderRadius: "10px",
                            padding: "10px",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            fontSize: "12px",
                            color: "#FECACA",
                          }}
                        >
                          {m.card.flaggedTanks.map((t, idx) => (
                            <div key={idx} style={{ marginBottom: "6px" }}>
                              <div style={{ fontWeight: "700", color: "#F87171" }}>
                                🚨 {t.name}
                              </div>
                              <div>Current: {t.current?.toLocaleString()} L ({t.percent}%)</div>
                              <div>Safety Threshold: {t.threshold?.toLocaleString()} L</div>
                            </div>
                          ))}
                          <div style={{ marginTop: "6px", fontSize: "11px", color: "#FCD34D" }}>
                            💡 Recommendation: Trigger depot replenishment or reroute reserve capacity.
                          </div>
                        </div>
                      )}

                      {/* Quick Option Buttons on Greeting */}
                      {m.quickOptions && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                          {m.quickOptions.map((opt) => (
                            <button
                              key={opt.key}
                              onClick={() => handleQuickPrompt(opt.key)}
                              style={{
                                background: "rgba(255, 255, 255, 0.08)",
                                border: "1px solid rgba(255, 255, 255, 0.15)",
                                color: "#F8FAFC",
                                padding: "4px 10px",
                                borderRadius: "20px",
                                fontSize: "11px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => (e.target.style.background = "rgba(255, 94, 0, 0.25)")}
                              onMouseLeave={(e) => (e.target.style.background = "rgba(255, 255, 255, 0.08)")}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "3px", padding: "0 4px" }}>
                      {m.time}
                    </span>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-dim)", fontSize: "12px", padding: "4px 8px" }}>
                    <Bot size={14} className="animate-spin" />
                    <span>Analyzing logistics data...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions Bar */}
              <div
                style={{
                  padding: "6px 12px",
                  display: "flex",
                  gap: "6px",
                  overflowX: "auto",
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  background: "#0F172A",
                }}
              >
                {isManagerOrAdmin ? (
                  <>
                    <button
                      className="btn-ghost btn-sm"
                      style={{ fontSize: "11px", padding: "3px 8px", whiteSpace: "nowrap", border: "1px solid var(--line)", borderRadius: "12px" }}
                      onClick={() => handleQuickPrompt("inventory_status")}
                    >
                      ⛽ Inventory Status
                    </button>
                    <button
                      className="btn-ghost btn-sm"
                      style={{ fontSize: "11px", padding: "3px 8px", whiteSpace: "nowrap", border: "1px solid var(--line)", borderRadius: "12px" }}
                      onClick={() => handleQuickPrompt("low_stock_alerts")}
                    >
                      ⚠️ Low Stock Alerts
                    </button>
                    <button
                      className="btn-ghost btn-sm"
                      style={{ fontSize: "11px", padding: "3px 8px", whiteSpace: "nowrap", border: "1px solid var(--line)", borderRadius: "12px" }}
                      onClick={() => handleQuickPrompt("fleet_status")}
                    >
                      🚛 Fleet Overview
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn-ghost btn-sm"
                      style={{ fontSize: "11px", padding: "3px 8px", whiteSpace: "nowrap", border: "1px solid var(--line)", borderRadius: "12px" }}
                      onClick={() => handleQuickPrompt("track_order")}
                    >
                      🔍 Track Order
                    </button>
                    <button
                      className="btn-ghost btn-sm"
                      style={{ fontSize: "11px", padding: "3px 8px", whiteSpace: "nowrap", border: "1px solid var(--line)", borderRadius: "12px" }}
                      onClick={() => handleQuickPrompt("delivery_status")}
                    >
                      🚚 Delivery Status
                    </button>
                    <button
                      className="btn-ghost btn-sm"
                      style={{ fontSize: "11px", padding: "3px 8px", whiteSpace: "nowrap", border: "1px solid var(--line)", borderRadius: "12px" }}
                      onClick={() => handleQuickPrompt("invoice_info")}
                    >
                      📄 Tax Invoice
                    </button>
                  </>
                )}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                style={{
                  padding: "10px 12px",
                  background: "#1E293B",
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <input
                  type="text"
                  placeholder={isManagerOrAdmin ? "Ask about vault stock, alerts, dispatch..." : "Ask to track order, check ETA..."}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{
                    flex: 1,
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "20px",
                    padding: "8px 14px",
                    color: "#F8FAFC",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  style={{
                    background: inputText.trim() ? "var(--orange)" : "rgba(255, 255, 255, 0.1)",
                    color: "#FFF",
                    border: "none",
                    borderRadius: "50%",
                    width: "34px",
                    height: "34px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: inputText.trim() ? "pointer" : "default",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
