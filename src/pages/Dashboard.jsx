import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Truck, Bell, Gauge, Plus, ArrowRight } from "lucide-react";
import { computeTotal } from "../data/seed";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";
import DispatchGauge from "../components/DispatchGauge";
import OrderRow from "../components/OrderRow";
import NewOrderModal from "../components/NewOrderModal";

export default function Dashboard() {
  const { t } = useLanguage();
  // useContext: order data + mutators now come from OrdersContext
  // so the same list is visible on the Orders and Order Detail
  // pages too, instead of being trapped in this page's own state.
  const { orders, loading, advanceStatus, cancelOrder, addOrder } = useOrders();

  // useState: UI state that is genuinely local to this page only.
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // useRef: DOM handle for the search box so a keyboard shortcut
  // can move focus into it without state/re-renders.
  const searchRef = useRef(null);

  // useEffect: global "/" keyboard shortcut to focus search.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const resetSearch = useCallback(() => setSearch(""), []);

  // useMemo #1: pending count feeds the tab title effect below —
  // only recompute when `orders` changes.
  const pendingCount = useMemo(() => orders.filter((o) => o.status === "Pending").length, [orders]);

  // useEffect: keep the browser tab title in sync.
  useEffect(() => {
    document.title = pendingCount ? `(${pendingCount}) Dispatch Console` : "Dispatch Console";
  }, [pendingCount]);

  // useMemo #2: dashboard only ever shows the 6 most recent orders
  // that match the quick search box — the full list lives on /orders.
  const recentOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (!term) return true;
        return (
          o.customer.toLowerCase().includes(term) ||
          o.orderNumber.toLowerCase().includes(term) ||
          o.city.toLowerCase().includes(term)
        );
      })
      .slice(0, 6);
  }, [orders, search]);

  // useMemo #3: dashboard aggregates derived from the full order set.
  const stats = useMemo(() => {
    const litresToday = orders.reduce((s, o) => s + o.qty, 0);
    const capacity = 4000;
    const revenue = orders
      .filter((o) => o.status !== "Cancelled")
      .reduce((s, o) => s + computeTotal(o.fuelCode, o.qty).total, 0);
    const active = orders.filter((o) => o.status === "InTransit" || o.status === "Dispatched").length;
    return { litresToday, pct: (litresToday / capacity) * 100, revenue, active };
  }, [orders]);

  return (
    <div className="page">
      <section className="stats-row">
        <div className="panel gauge-panel">
          <DispatchGauge pct={stats.pct} />
          <div className="gauge-caption">{stats.litresToday} L of 4000 L {t("fleetCapacity")}</div>
        </div>
        <div className="panel stat-card">
          <div className="stat-label">
            <Bell size={14} /> {t("pendingApproval")}
          </div>
          <div className="stat-value amber">{pendingCount}</div>
        </div>
        <div className="panel stat-card">
          <div className="stat-label">
            <Truck size={14} /> {t("onTheRoad")}
          </div>
          <div className="stat-value blue">{stats.active}</div>
        </div>
        <div className="panel stat-card">
          <div className="stat-label">
            <Gauge size={14} /> {t("todaysRevenue")}
          </div>
          <div className="stat-value green">
            ₹{stats.revenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
        </div>
      </section>

      <section className="panel toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
          />
        </div>
        <button className="btn-ghost" onClick={resetSearch}>
          {t("reset")}
        </button>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> {t("newOrder")}
        </button>
      </section>

      <section className="panel table-panel">
        <div className="panel-head">
          <h3>{t("recentOrders")}</h3>
          <Link className="link-more" to="/orders">
            {t("viewAllOrders")} <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div className="loading">{t("loadingOrders")}</div>
        ) : recentOrders.length === 0 ? (
          <div className="loading">{t("noOrdersMatch")}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("orderNo")}</th>
                <th>{t("customer")}</th>
                <th>{t("fuel")}</th>
                <th>{t("qty")}</th>
                <th>{t("driver")}</th>
                <th>{t("status")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <OrderRow key={o.id} order={o} onAdvance={advanceStatus} onCancel={cancelOrder} />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <NewOrderModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={addOrder} />
    </div>
  );
}
