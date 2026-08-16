import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Phone, Truck } from "lucide-react";
import { SEED_DRIVERS } from "../data/seed";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";

/**
 * PURPOSE OF useState + useEffect HERE (rather than a context):
 * The driver roster isn't referenced anywhere outside this page
 * (unlike orders, which Dashboard/Orders/OrderDetail all share),
 * so a page-local reducer-free useState plus a localStorage-synced
 * useEffect is enough — reaching for another Context would be
 * unnecessary machinery for state only one page reads.
 */
export default function Drivers() {
  const { t } = useLanguage();
  const { orders } = useOrders();
  const [drivers, setDrivers] = useState(() => {
    const saved = localStorage.getItem("fdms-drivers");
    return saved ? JSON.parse(saved) : SEED_DRIVERS;
  });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");

  useEffect(() => {
    localStorage.setItem("fdms-drivers", JSON.stringify(drivers));
  }, [drivers]);

  // useMemo: how many orders each driver currently has active,
  // derived from the shared OrdersContext list.
  const activeCounts = useMemo(() => {
    const counts = {};
    for (const o of orders) {
      if (o.status === "Dispatched" || o.status === "InTransit") {
        counts[o.driver] = (counts[o.driver] || 0) + 1;
      }
    }
    return counts;
  }, [orders]);

  const toggleDuty = useCallback((id) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, onDuty: !d.onDuty } : d)));
  }, []);

  const addDriver = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setDrivers((prev) => [
      { id: Date.now(), name, phone, vehicle: vehicle || "—", onDuty: true, deliveries: 0 },
      ...prev,
    ]);
    setName("");
    setPhone("");
    setVehicle("");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t("driversTitle")}</h1>
          <p className="page-sub">{t("driversSubtitle")}</p>
        </div>
      </div>

      <section className="panel form-panel">
        <form className="field-row" onSubmit={addDriver}>
          <label className="field">
            <span>{t("name")}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="D. Kumar" required />
          </label>
          <label className="field">
            <span>{t("phone")}</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9XXXXXXXXX" />
          </label>
          <label className="field">
            <span>{t("vehicle")}</span>
            <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="TN-00-XX-0000" />
          </label>
          <button type="submit" className="btn-primary" style={{ alignSelf: "flex-end" }}>
            <Plus size={16} /> {t("addDriver")}
          </button>
        </form>
      </section>

      <section className="cards-grid">
        {drivers.map((d) => (
          <div key={d.id} className="panel driver-card">
            <div className="driver-card-head">
              <div className="cell-strong">{d.name}</div>
              <button
                className={"pill toggle" + (d.onDuty ? "" : " off")}
                style={{ "--pill-color": d.onDuty ? "var(--green)" : "var(--text-dim)" }}
                onClick={() => toggleDuty(d.id)}
              >
                {d.onDuty ? t("onDuty") : t("offDuty")}
              </button>
            </div>
            <div className="cell-dim" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Phone size={12} /> {d.phone || "—"}
            </div>
            <div className="cell-dim" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Truck size={12} /> {d.vehicle}
            </div>
            <div className="driver-stats">
              <span>{t("deliveriesDone")}: <strong>{d.deliveries}</strong></span>
              <span>{t("nav_orders")}: <strong>{activeCounts[d.name] || 0}</strong></span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
