import React, { useMemo } from "react";
import { FUEL_TYPES, STATUS_FLOW, STATUS_COLOR, computeTotal, deriveCustomers } from "../data/seed";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";

function BarList({ rows, valueFormatter }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="bar-list">
      {rows.map((r) => (
        <div className="bar-row" key={r.label}>
          <span className="bar-label">{r.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(r.value / max) * 100}%`, background: r.color || "var(--amber)" }} />
          </div>
          <span className="bar-value mono">{valueFormatter ? valueFormatter(r.value) : r.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function Reports() {
  const { t } = useLanguage();
  const { orders } = useOrders();

  // useMemo: every chart below is a separate reduce pass over the
  // (potentially large) order list, so each is memoized on its own
  // and only recomputed when `orders` itself changes.
  const revenueByFuel = useMemo(() => {
    return FUEL_TYPES.map((f) => {
      const value = orders
        .filter((o) => o.fuelCode === f.code && o.status !== "Cancelled")
        .reduce((s, o) => s + computeTotal(o.fuelCode, o.qty).total, 0);
      return { label: f.name, value, color: f.color };
    }).sort((a, b) => b.value - a.value);
  }, [orders]);

  const ordersByStatus = useMemo(() => {
    return [...STATUS_FLOW, "Cancelled"].map((s) => ({
      label: t(`status_${s}`),
      value: orders.filter((o) => o.status === s).length,
      color: STATUS_COLOR[s],
    }));
  }, [orders, t]);

  const litresByCity = useMemo(() => {
    const map = {};
    for (const o of orders) {
      if (o.status === "Cancelled") continue;
      map[o.city] = (map[o.city] || 0) + o.qty;
    }
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [orders]);

  const topCustomers = useMemo(() => {
    return deriveCustomers(orders)
      .slice(0, 6)
      .map((c) => ({ label: c.name, value: Math.round(computeTotal("DSL", c.litres).total) }));
  }, [orders]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t("reportsTitle")}</h1>
          <p className="page-sub">{t("reportsSubtitle")}</p>
        </div>
      </div>

      <section className="reports-grid">
        <div className="panel report-panel">
          <h3>{t("revenueByFuel")}</h3>
          <BarList rows={revenueByFuel} valueFormatter={(v) => `₹${Math.round(v).toLocaleString("en-IN")}`} />
        </div>
        <div className="panel report-panel">
          <h3>{t("ordersByStatus")}</h3>
          <BarList rows={ordersByStatus} />
        </div>
        <div className="panel report-panel">
          <h3>{t("litresByCity")}</h3>
          <BarList rows={litresByCity} valueFormatter={(v) => `${v} L`} />
        </div>
        <div className="panel report-panel">
          <h3>{t("topCustomers")}</h3>
          <BarList rows={topCustomers} valueFormatter={(v) => `₹${v.toLocaleString("en-IN")}`} />
        </div>
      </section>
    </div>
  );
}
