import React, { useState, useEffect, useRef, useMemo } from "react";
import { X } from "lucide-react";
import { FUEL_TYPES, computeTotal } from "../data/seed";
import { useLanguage } from "../context/LanguageContext";
import { useNotifications } from "../context/NotificationContext";

export default function NewOrderModal({ open, onClose, onCreate, initialData }) {
  const { t } = useLanguage();
  const { addNotification } = useNotifications();
  const [customer, setCustomer] = useState("");
  const [city, setCity] = useState("Chennai");
  const [fuelCode, setFuelCode] = useState("DSL");
  const [qty, setQty] = useState(100);

  // useRef: reference to the first input so we can imperatively
  // focus it. This is DOM access that useState can't give you —
  // storing a "should I focus" flag in state would cause an
  // unnecessary extra render.
  const firstFieldRef = useRef(null);

  // useEffect: runs whenever `open` changes; the moment the modal
  // becomes visible we move keyboard focus into it and apply initialData if provided.
  useEffect(() => {
    if (open) {
      firstFieldRef.current?.focus();
      if (initialData) {
        if (initialData.fuelCode) setFuelCode(initialData.fuelCode);
        if (initialData.qty) setQty(initialData.qty);
      }
    }
  }, [open, initialData]);

  // useMemo: the price preview involves a small calculation
  // (subtotal, tax, delivery charge). Memoizing it means it's
  // only recalculated when fuelCode or qty actually change, not
  // on every keystroke in the `customer` or `city` fields.
  const preview = useMemo(() => computeTotal(fuelCode, Number(qty) || 0), [fuelCode, qty]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!customer.trim()) return;
    const orderNumber = `FD-${Date.now().toString().slice(-9)}`;
    const newQty = Number(qty);

    onCreate({
      orderNumber,
      customer,
      site: city ? `${customer} Site, ${city}` : "Primary Delivery Site",
      deliveryAddress: city ? `${customer} Site, ${city}` : "Primary Delivery Site",
      fuelCode,
      fuelType: fuelCode,
      qty: newQty,
      quantity: newQty,
      driver: "Unassigned",
      vehicle: "—",
      city,
      status: "Pending",
      slot: "08:00-10:00",
    });

    addNotification({
      title: "New Order Placed",
      message: `Fuel order ${orderNumber} for ${newQty.toLocaleString()} L of ${fuelCode} submitted & pending manager review.`,
      category: "order",
      role: "Customer",
      type: "info",
      orderId: orderNumber,
    });

    setCustomer("");
    setQty(100);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h3>New Order</h3>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <label className="field">
          <span>{t("customer")}</span>
          <input
            ref={firstFieldRef}
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder={t("businessName")}
            required
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>{t("fuelType")}</span>
            <select value={fuelCode} onChange={(e) => setFuelCode(e.target.value)}>
              {FUEL_TYPES.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.name} — ₹{f.price}/L
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("quantityL")}</span>
            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span>{t("deliveryCity")} / Delivery Site Address</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Guindy Industrial Estate, Chennai" required />
        </label>

        <div className="preview">
          <span>{t("subtotal")} ₹{preview.subtotal.toFixed(2)}</span>
          <span>{t("tax")} ₹{preview.tax.toFixed(2)}</span>
          <span className="preview-total">{t("total")} ₹{preview.total.toFixed(2)}</span>
        </div>

        <button type="submit" className="btn-primary full" style={{ background: "var(--orange)", borderColor: "var(--orange)", fontWeight: 800 }}>
          Place New Order (Pending Manager Review)
        </button>
      </form>
    </div>
  );
}
