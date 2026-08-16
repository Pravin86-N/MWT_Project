import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2 } from "lucide-react";
import { deriveCustomers } from "../data/seed";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";

export default function Customers() {
  const { t } = useLanguage();
  const { orders } = useOrders();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // useMemo: recompute the derived customer rollup only when the
  // underlying order list (or the search box) actually changes —
  // this involves a Map + reduce pass over every order.
  const customers = useMemo(() => {
    const all = deriveCustomers(orders);
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter((c) => c.name.toLowerCase().includes(term) || c.city.toLowerCase().includes(term));
  }, [orders, search]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t("customersTitle")}</h1>
          <p className="page-sub">{t("customersSubtitle")}</p>
        </div>
      </div>

      <section className="panel toolbar">
        <div className="search-box">
          <Search size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchPlaceholder")} />
        </div>
      </section>

      <section className="cards-grid">
        {customers.map((c) => (
          <div key={c.name} className="panel driver-card">
            <div className="driver-card-head">
              <div className="cell-strong" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Building2 size={15} /> {c.name}
              </div>
            </div>
            <div className="cell-dim">{c.city}</div>
            <div className="driver-stats">
              <span>{t("siteCount")}: <strong>{c.sites}</strong></span>
              <span>{t("ordersCount")}: <strong>{c.orders}</strong></span>
            </div>
            <div className="cell-dim">{t("lifetimeLitres")}: <strong className="cell-strong">{c.litres} L</strong></div>
            <button className="btn-ghost" onClick={() => navigate(`/orders?status=All&search=${encodeURIComponent(c.name)}`)}>
              {t("viewOrders")}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
