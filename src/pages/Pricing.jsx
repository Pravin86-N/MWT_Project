import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Fuel,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Calculator,
  Lock,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { pricingApi } from "../services/api";
import { ROLES, can, isViewOnly } from "../utils/permissions";

const DEFAULT_PRICES = [
  { code: "DSL", name: "High-Speed Diesel (HSD)", price: 92.4, color: "#f59e0b", taxRate: 0.18, deliveryCharge: 250 },
  { code: "PTL", name: "Premium Motor Spirit (Petrol)", price: 104.8, color: "#3b82f6", taxRate: 0.18, deliveryCharge: 250 },
  { code: "LPG", name: "Commercial LPG", price: 61.2, color: "#10b981", taxRate: 0.18, deliveryCharge: 250 },
  { code: "KRS", name: "Aviation/Industrial Kerosene", price: 74.6, color: "#8b5cf6", taxRate: 0.18, deliveryCharge: 250 },
];

export default function Pricing() {
  const { state } = useAuth();
  const { t } = useLanguage();
  const currentUser = state.user;
  const userRole = currentUser?.role || ROLES.CUSTOMER;

  const isAdmin = userRole === ROLES.ADMIN;
  const isReadOnly = isViewOnly(userRole, "pricing");

  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [editTaxRate, setEditTaxRate] = useState("");
  const [editDeliveryCharge, setEditDeliveryCharge] = useState("");
  const [saving, setSaving] = useState(false);

  // Interactive Calculator State
  const [calcFuel, setCalcFuel] = useState("DSL");
  const [calcLiters, setCalcLiters] = useState(1000);
  const [quoteResult, setQuoteResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // Fetch prices
  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await pricingApi.getFuelPrices();
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        setPrices(res.data);
      }
    } catch (err) {
      console.warn("[Pricing] Using default fuel prices due to fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Open Edit Modal
  const openEditModal = (item) => {
    if (!isAdmin) return;
    setEditingItem(item);
    setEditPrice(item.price);
    setEditTaxRate(item.taxRate !== undefined ? item.taxRate * 100 : 18);
    setEditDeliveryCharge(item.deliveryCharge !== undefined ? item.deliveryCharge : 250);
  };

  // Submit Edit
  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!editingItem || !isAdmin) return;

    try {
      setSaving(true);
      setError(null);
      const payload = {
        price: Number(editPrice),
        taxRate: Number(editTaxRate) / 100,
        deliveryCharge: Number(editDeliveryCharge),
      };

      const res = await pricingApi.updateFuelPrice(editingItem.code, payload);
      setSuccessMsg(`Fuel rate for ${editingItem.code} updated successfully!`);
      setTimeout(() => setSuccessMsg(null), 3500);

      setPrices((prev) =>
        prev.map((p) => (p.code === editingItem.code ? { ...p, ...payload } : p))
      );
      setEditingItem(null);
    } catch (err) {
      console.error("[Pricing] Failed to update fuel price:", err);
      setError(err.response?.data?.message || "Failed to update pricing on server.");
    } finally {
      setSaving(false);
    }
  };

  // Run Quote Calculation
  const handleCalculateQuote = async () => {
    try {
      setCalcLoading(true);
      const res = await pricingApi.calculateQuote(calcFuel, calcLiters);
      if (res && res.total) {
        setQuoteResult(res);
      }
    } catch (err) {
      // Fallback local calculation
      const item = prices.find((p) => p.code === calcFuel) || prices[0];
      const subtotal = item.price * calcLiters;
      const taxRate = item.taxRate !== undefined ? item.taxRate : 0.18;
      const tax = subtotal * taxRate;
      const deliveryCharge = item.deliveryCharge !== undefined ? item.deliveryCharge : 250;
      setQuoteResult({
        fuelCode: item.code,
        fuelName: item.name,
        unitPrice: item.price,
        qty: calcLiters,
        subtotal,
        tax,
        taxRate,
        deliveryCharge,
        total: subtotal + tax + deliveryCharge,
      });
    } finally {
      setCalcLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "var(--grad-flame, linear-gradient(135deg, #f97316 0%, #ea580c 100%))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 0 15px rgba(249, 115, 22, 0.4)",
            }}
          >
            <Fuel size={24} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: "700", margin: 0, color: "var(--text)" }}>
                Fuel Pricing & Tariff Rates
              </h1>
              {isAdmin ? (
                <span
                  style={{
                    fontSize: "12px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "#10b981",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ShieldCheck size={13} />
                  PLATFORM GOVERNANCE (ADMIN)
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "12px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: "rgba(249, 115, 22, 0.15)",
                    border: "1px solid rgba(249, 115, 22, 0.3)",
                    color: "var(--orange, #f97316)",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Lock size={12} />
                  VIEW-ONLY (GOVERNED BY HQ)
                </span>
              )}
            </div>
            <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "15px" }}>
              Dynamic wholesale fuel rates, GST taxation, and logistics delivery surcharges
            </p>
          </div>
        </div>

        <button
          onClick={fetchPrices}
          disabled={loading}
          className="btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            color: "var(--text)",
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          Refresh Rates
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            borderRadius: "8px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#10b981",
            marginBottom: "20px",
            fontWeight: "500",
          }}
        >
          <CheckCircle2 size={18} />
          {successMsg}
        </div>
      )}

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#ef4444",
            marginBottom: "20px",
            fontWeight: "500",
          }}
        >
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        {prices.map((item) => (
          <div
            key={item.code}
            style={{
              background: "var(--surface)",
              borderRadius: "14px",
              border: `1px solid ${item.color || "var(--line)"}40`,
              padding: "20px",
              boxShadow: "var(--shadow-sm)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: item.color || "#f97316",
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
              <div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "800",
                    color: item.color || "#f97316",
                    background: `${item.color || "#f97316"}18`,
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  {item.code}
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: "700", margin: "8px 0 0", color: "var(--text)" }}>
                  {item.name}
                </h3>
              </div>

              {isAdmin ? (
                <button
                  onClick={() => openEditModal(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  <Edit2 size={13} />
                  Edit
                </button>
              ) : (
                <span title="View only - Admin controlled">
                  <Lock size={16} style={{ color: "var(--text-muted)" }} />
                </span>
              )}
            </div>

            <div style={{ margin: "16px 0" }}>
              <div style={{ fontSize: "32px", fontWeight: "800", color: "var(--text)", letterSpacing: "-0.5px" }}>
                ₹{Number(item.price).toFixed(2)}
                <span style={{ fontSize: "15px", fontWeight: "500", color: "var(--text-muted)", marginLeft: "4px" }}>
                  / Liter
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                padding: "12px",
                background: "var(--bg)",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            >
              <div>
                <span style={{ color: "var(--text-muted)", display: "block" }}>GST Tax Rate</span>
                <strong style={{ color: "var(--text)", fontWeight: "700" }}>
                  {item.taxRate !== undefined ? `${(item.taxRate * 100).toFixed(0)}%` : "18%"}
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", display: "block" }}>Delivery Base</span>
                <strong style={{ color: "var(--text)", fontWeight: "700" }}>
                  ₹{item.deliveryCharge !== undefined ? item.deliveryCharge : 250}
                </strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Quote Estimator */}
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "14px",
          border: "1px solid var(--line)",
          padding: "24px",
          boxShadow: "var(--shadow-sm)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Calculator size={20} style={{ color: "var(--orange, #f97316)" }} />
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--text)" }}>
              Instant Fuel Cost Calculator
            </h3>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: "0 0 16px" }}>
            Select product and order volume to calculate exact invoice breakdown including GST and logistics.
          </p>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
            <div style={{ flex: "1 1 160px" }}>
              <label style={{ display: "block", fontSize: "14px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Fuel Type
              </label>
              <select
                value={calcFuel}
                onChange={(e) => setCalcFuel(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  fontSize: "15px",
                  fontWeight: "600",
                }}
              >
                {prices.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: "1 1 160px" }}>
              <label style={{ display: "block", fontSize: "14px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Volume (Liters)
              </label>
              <input
                type="number"
                min="100"
                step="50"
                value={calcLiters}
                onChange={(e) => setCalcLiters(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  fontSize: "15px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <button
            onClick={handleCalculateQuote}
            disabled={calcLoading}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: "var(--grad-flame, linear-gradient(135deg, #f97316 0%, #ea580c 100%))",
              color: "#fff",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(249, 115, 22, 0.3)",
            }}
          >
            {calcLoading ? "Calculating..." : "Calculate Estimated Total"}
          </button>
        </div>

        {/* Quote Result Box */}
        {quoteResult && (
          <div
            style={{
              background: "var(--bg)",
              border: "1px solid var(--line)",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "4px" }}>
              ESTIMATED QUOTATION
            </div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text)", marginBottom: "16px" }}>
              {quoteResult.qty.toLocaleString()} L of {quoteResult.fuelName}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "8px", color: "var(--text-muted)" }}>
              <span>Base Fuel Cost (@ ₹{quoteResult.unitPrice}/L)</span>
              <span style={{ color: "var(--text)", fontWeight: "600" }}>₹{Number(quoteResult.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "8px", color: "var(--text-muted)" }}>
              <span>GST Tax ({(quoteResult.taxRate * 100).toFixed(0)}%)</span>
              <span style={{ color: "var(--text)", fontWeight: "600" }}>₹{Number(quoteResult.tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "14px", color: "var(--text-muted)" }}>
              <span>Delivery & Hazmat Logistics Surcharge</span>
              <span style={{ color: "var(--text)", fontWeight: "600" }}>₹{Number(quoteResult.deliveryCharge).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--line)",
                paddingTop: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong style={{ fontSize: "16px", color: "var(--text)" }}>Total Landed Price</strong>
              <strong style={{ fontSize: "22px", color: "var(--orange, #f97316)" }}>
                ₹{Number(quoteResult.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Edit Price Modal (Admin Only) */}
      {editingItem && isAdmin && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "14px",
              padding: "24px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Edit2 size={20} style={{ color: "var(--orange, #f97316)" }} />
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--text)" }}>
                Edit Tariff: {editingItem.name} ({editingItem.code})
              </h3>
            </div>

            <form onSubmit={handleSavePrice}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--text)", marginBottom: "6px" }}>
                  Base Price per Liter (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontSize: "15px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--text)", marginBottom: "6px" }}>
                  GST Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={editTaxRate}
                  onChange={(e) => setEditTaxRate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontSize: "15px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "var(--text)", marginBottom: "6px" }}>
                  Base Delivery Surcharge (₹)
                </label>
                <input
                  type="number"
                  step="10"
                  required
                  value={editDeliveryCharge}
                  onChange={(e) => setEditDeliveryCharge(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontSize: "15px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--line)",
                    background: "transparent",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--grad-flame, linear-gradient(135deg, #f97316 0%, #ea580c 100%))",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "700",
                  }}
                >
                  {saving ? "Saving..." : "Save Rate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
