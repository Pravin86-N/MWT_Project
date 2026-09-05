import React, { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ArrowUpDown, Download } from "lucide-react";
import { STATUS_FLOW } from "../data/seed";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";
import OrderRow from "../components/OrderRow";
import InvoiceModal from "../components/InvoiceModal";
import DispatchModal from "../components/DispatchModal";

const PAGE_SIZE = 8;

export default function Orders() {
  const { t } = useLanguage();
  const { orders, loading, advanceStatus, cancelOrder, updateOrder } = useOrders();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [sortKey, setSortKey] = useState("orderNumber");
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [dispatchOrder, setDispatchOrder] = useState(null);

  const statusFilter = searchParams.get("status") || "All";
  const page = Number(searchParams.get("page") || 1);

  const setStatusFilter = useCallback(
    (status) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (status === "All") next.delete("status");
        else next.set("status", status);
        next.delete("page");
        return next;
      });
    },
    [setSearchParams]
  );

  const setPage = useCallback(
    (p) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (p <= 1) next.delete("page");
        else next.set("page", String(p));
        return next;
      });
    },
    [setSearchParams]
  );

  const toggleSort = useCallback((key) => {
    setSortKey((prev) => (prev === key ? `-${key}` : key));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      const matchesStatus = statusFilter === "All" || o.status === statusFilter;
      const matchesSearch =
        !term ||
        o.customer.toLowerCase().includes(term) ||
        o.orderNumber.toLowerCase().includes(term) ||
        o.city.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });

    const desc = sortKey.startsWith("-");
    const key = desc ? sortKey.slice(1) : sortKey;
    list = [...list].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return desc ? -cmp : cmp;
    });
    return list;
  }, [orders, search, statusFilter, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  const handleExportCSV = () => {
    const headers = "Order Number,Customer,Site,Fuel,Quantity(L),Driver,Vehicle,City,Status,Slot\n";
    const rows = filtered
      .map(
        (o) =>
          `"${o.orderNumber}","${o.customer}","${o.site}","${o.fuelCode}",${o.qty},"${o.driver}","${o.vehicle}","${o.city}","${o.status}","${o.slot}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `FDMS_Orders_Manifest_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t("ordersTitle")}</h1>
          <p className="page-sub">{t("ordersSubtitle")}</p>
        </div>
        <div className="page-head-actions">
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={15} /> {t("exportCSV")}
          </button>
          <div className="page-head-stat">
            <span className="stat-label">{t("totalOrders")}</span>
            <span className="stat-value amber">{orders.length}</span>
          </div>
        </div>
      </div>

      <section className="panel toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">{t("allStatuses")}</option>
          {[...STATUS_FLOW, "Cancelled"].map((s) => (
            <option key={s} value={s}>
              {t(`status_${s}`)}
            </option>
          ))}
        </select>
        <button className="btn-ghost" onClick={() => toggleSort("qty")}>
          <ArrowUpDown size={14} /> {t("qty")}
        </button>
      </section>

      <section className="panel table-panel">
        {loading ? (
          <div className="loading">{t("loadingOrders")}</div>
        ) : filtered.length === 0 ? (
          <div className="loading">{t("noOrdersMatch")}</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleSort("orderNumber")}>
                    {t("orderNo")}
                  </th>
                  <th>{t("customer")}</th>
                  <th>{t("fuel")}</th>
                  <th className="sortable" onClick={() => toggleSort("qty")}>
                    {t("qty")}
                  </th>
                  <th>{t("driver")}</th>
                  <th>{t("status")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((o) => (
                  <OrderRow key={o.id} order={o} onAdvance={advanceStatus} onCancel={cancelOrder} onDispatch={setDispatchOrder} />
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <button className="btn-ghost" disabled={clampedPage <= 1} onClick={() => setPage(clampedPage - 1)}>
                ‹
              </button>
              <span className="cell-dim">
                {clampedPage} / {pageCount}
              </span>
              <button
                className="btn-ghost"
                disabled={clampedPage >= pageCount}
                onClick={() => setPage(clampedPage + 1)}
              >
                ›
              </button>
            </div>
          </>
        )}
      </section>

      {invoiceOrder && <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
      {dispatchOrder && (
        <DispatchModal
          order={dispatchOrder}
          onClose={() => setDispatchOrder(null)}
          onConfirm={(id, payload) => updateOrder(id, payload)}
        />
      )}
    </div>
  );
}
