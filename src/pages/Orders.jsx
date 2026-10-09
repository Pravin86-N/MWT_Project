import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ArrowUpDown, Download, Filter } from "lucide-react";
import { STATUS_FLOW } from "../data/seed";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";
import OrderRow from "../components/OrderRow";
import InvoiceModal from "../components/InvoiceModal";
import DispatchModal from "../components/DispatchModal";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import { SkeletonTable } from "../components/Skeleton";
import CountUp from "../components/CountUp";

export default function Orders() {
  const { t } = useLanguage();
  const { orders, loading, advanceStatus, cancelOrder, updateOrder } = useOrders();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [sortKey, setSortKey] = useState("orderNumber");
  const [fuelFilter, setFuelFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
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

  // Reset to page 1 when search or fuelFilter changes
  useEffect(() => {
    if (page > 1) {
      setPage(1);
    }
  }, [search, fuelFilter]);

  const toggleSort = useCallback((key) => {
    setSortKey((prev) => (prev === key ? `-${key}` : key));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      const matchesStatus = statusFilter === "All" || o.status === statusFilter;
      const matchesFuel =
        fuelFilter === "ALL" ||
        (o.fuelCode && o.fuelCode.toUpperCase() === fuelFilter) ||
        (o.fuelType && o.fuelType.toUpperCase().includes(fuelFilter));
      const matchesSearch =
        !term ||
        (o.customer && o.customer.toLowerCase().includes(term)) ||
        (o.orderNumber && o.orderNumber.toLowerCase().includes(term)) ||
        (o.city && o.city.toLowerCase().includes(term)) ||
        (o.site && o.site.toLowerCase().includes(term));
      return matchesStatus && matchesFuel && matchesSearch;
    });

    const desc = sortKey.startsWith("-");
    const key = desc ? sortKey.slice(1) : sortKey;
    list = [...list].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const cmp = typeof av === "number" ? av - bv : String(av || "").localeCompare(String(bv || ""));
      return desc ? -cmp : cmp;
    });
    return list;
  }, [orders, search, statusFilter, fuelFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  const handleExportCSV = () => {
    const headers = "Order Number,Customer,Site,Fuel,Quantity(L),Driver,Vehicle,City,Status,Slot\n";
    const rows = filtered
      .map(
        (o) =>
          `"${o.orderNumber}","${o.customer}","${o.site}","${o.fuelCode || o.fuelType}",${o.qty || o.quantity},"${o.driver}","${o.vehicle}","${o.city}","${o.status}","${o.slot}"`
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
          <h1>{t("ordersTitle") || "Fuel Delivery Orders"}</h1>
          <p className="page-sub">{t("ordersSubtitle") || "Manage corporate fuel dispatches, customer allocations, and active delivery pipelines"}</p>
        </div>
        <div className="page-head-actions">
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={15} /> {t("exportCSV") || "Export CSV"}
          </button>
          <div className="page-head-stat">
            <span className="stat-label">{t("totalOrders") || "Total Orders"}</span>
            <span className="stat-value amber" style={{ color: "var(--fuel-diesel)" }}>
              <CountUp value={orders.length} />
            </span>
          </div>
        </div>
      </div>

      <section className="panel toolbar" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <div className="search-box" style={{ flex: 1, minWidth: "220px" }}>
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder") || "Search order no, customer, city, or site..."}
            aria-label="Search orders"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter orders by status"
          style={{ minWidth: "150px" }}
        >
          <option value="All">{t("allStatuses") || "All Statuses"}</option>
          {[...STATUS_FLOW, "Cancelled"].map((s) => (
            <option key={s} value={s}>
              {t(`status_${s}`) || s}
            </option>
          ))}
        </select>

        {/* Fuel Type Filter */}
        <select
          value={fuelFilter}
          onChange={(e) => setFuelFilter(e.target.value)}
          aria-label="Filter orders by fuel type"
          style={{ minWidth: "150px" }}
        >
          <option value="ALL">All Fuel Types</option>
          <option value="DSL">Diesel (Amber)</option>
          <option value="PTL">Petrol (Red)</option>
          <option value="CNG">CNG (Green)</option>
          <option value="EV">Electric / EV (Blue)</option>
        </select>

        <button className="btn-ghost" onClick={() => toggleSort("qty")} aria-label="Sort by quantity">
          <ArrowUpDown size={14} /> {t("qty") || "Quantity"}
        </button>
      </section>

      <section className="panel table-panel">
        {loading ? (
          <SkeletonTable rows={pageSize} columns={7} />
        ) : filtered.length === 0 ? (
          <EmptyState
            type="orders"
            title="No fuel orders available."
            message="No orders match your active search terms, status filters, or fuel type selection."
            actionLabel={search || statusFilter !== "All" || fuelFilter !== "ALL" ? "Reset Filters" : undefined}
            onAction={() => {
              setSearch("");
              setStatusFilter("All");
              setFuelFilter("ALL");
            }}
          />
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th scope="col" className="sortable" onClick={() => toggleSort("orderNumber")}>
                    {t("orderNo") || "Order No"}
                  </th>
                  <th scope="col">{t("customer") || "Customer"}</th>
                  <th scope="col">{t("fuel") || "Fuel"}</th>
                  <th scope="col" className="sortable" onClick={() => toggleSort("qty")}>
                    {t("qty") || "Qty"}
                  </th>
                  <th scope="col">{t("driver") || "Driver & Vehicle"}</th>
                  <th scope="col">{t("status") || "Status"}</th>
                  <th scope="col">{t("actions") || "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((o) => (
                  <OrderRow
                    key={o.id || o._id}
                    order={o}
                    onAdvance={advanceStatus}
                    onCancel={cancelOrder}
                    onDispatch={setDispatchOrder}
                  />
                ))}
              </tbody>
            </table>

            <Pagination
              currentPage={clampedPage}
              totalPages={totalPages}
              totalRecords={filtered.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 20, 50]}
            />
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
