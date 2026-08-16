import React, { useState, useEffect, useRef, useMemo } from "react";
import { X } from "lucide-react";
import { FUEL_TYPES, computeTotal } from "../data/seed";
import { useLanguage } from "../context/LanguageContext";

export default function NewOrderModal({ open, onClose, onCreate }) {
  const { t } = useLanguage();
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
  // becomes visible we move keyboard focus into it.
  useEffect(() => {
    if (open) firstFieldRef.current?.focus();
  }, [open]);

  // useMemo: the price preview involves a small calculation
  // (subtotal, tax, delivery charge). Memoizing it means it's
  // only recalculated when fuelCode or qty actually change, not
  // on every keystroke in the `customer` or `city` fields.
  const preview = useMemo(() => computeTotal(fuelCode, Number(qty) || 0), [fuelCode, qty]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!customer.trim()) return;
    onCreate({
      orderNumber: `FD-${Date.now().toString().slice(-9)}`,
      customer,
      site: "Office",
      fuelCode,
      qty: Number(qty),
      driver: "Unassigned",
      vehicle: "—",
      city,
      status: "Pending",
      slot: "To be scheduled",
    });
    setCustomer("");
    setQty(100);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h3>{t("new")} {t("newOrder").toLowerCase()}</h3>
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
          <span>{t("deliveryCity")}</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} />
        </label>

        <div className="preview">
          <span>{t("subtotal")} ₹{preview.subtotal.toFixed(2)}</span>
          <span>{t("tax")} ₹{preview.tax.toFixed(2)}</span>
          <span className="preview-total">{t("total")} ₹{preview.total.toFixed(2)}</span>
        </div>

        <button type="submit" className="btn-primary full">
          {t("createOrder")}
        </button>
      </form>
    </div>
  );
}
