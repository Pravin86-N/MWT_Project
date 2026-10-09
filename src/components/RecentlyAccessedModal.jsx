import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  ClipboardList,
  Users,
  Truck,
  BarChart3,
  X,
  ExternalLink,
  Trash2,
  ChevronRight,
  History,
  ListFilter,
} from "lucide-react";
import { getAllRecentAccess, clearRecentAccess } from "../services/recentAccess";
import Pagination from "./Pagination";
import FuelBadge from "./FuelBadge";

function formatRecentTime(ts) {
  if (!ts) return "Recently";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(ts).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export default function RecentlyAccessedModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("all");
  const [viewAll, setViewAll] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [recentData, setRecentData] = useState({
    orders: [],
    customers: [],
    vehicles: [],
    reports: [],
  });

  const loadData = () => {
    setRecentData(getAllRecentAccess());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("fdms-recent-access-updated", handleUpdate);
    return () => window.removeEventListener("fdms-recent-access-updated", handleUpdate);
  }, []);

  // Reset page when tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, viewAll]);

  if (!isOpen) return null;

  const totalCount =
    recentData.orders.length +
    recentData.customers.length +
    recentData.vehicles.length +
    recentData.reports.length;

  const getCombinedItems = () => {
    const list = [
      ...recentData.orders.map((x) => ({ ...x, category: "orders", categoryLabel: "Order", icon: ClipboardList, color: "var(--fuel-diesel)" })),
      ...recentData.customers.map((x) => ({ ...x, category: "customers", categoryLabel: "Customer", icon: Users, color: "var(--status-success)" })),
      ...recentData.vehicles.map((x) => ({ ...x, category: "vehicles", categoryLabel: "Vehicle", icon: Truck, color: "var(--fuel-electric)" })),
      ...recentData.reports.map((x) => ({ ...x, category: "reports", categoryLabel: "Report", icon: BarChart3, color: "var(--fuel-diesel)" })),
    ];
    return list.sort((a, b) => (b.timestamp || b.accessedAt || 0) - (a.timestamp || a.accessedAt || 0));
  };

  const rawItems =
    activeTab === "all"
      ? getCombinedItems()
      : activeTab === "orders"
        ? recentData.orders.map((x) => ({ ...x, category: "orders", categoryLabel: "Order", icon: ClipboardList, color: "var(--fuel-diesel)" }))
        : activeTab === "customers"
          ? recentData.customers.map((x) => ({ ...x, category: "customers", categoryLabel: "Customer", icon: Users, color: "var(--status-success)" }))
          : activeTab === "vehicles"
            ? recentData.vehicles.map((x) => ({ ...x, category: "vehicles", categoryLabel: "Vehicle", icon: Truck, color: "var(--fuel-electric)" }))
            : recentData.reports.map((x) => ({ ...x, category: "reports", categoryLabel: "Report", icon: BarChart3, color: "var(--fuel-diesel)" }));

  // Paginated or capped display items
  const totalRecords = rawItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentItems = viewAll
    ? rawItems.slice((page - 1) * pageSize, page * pageSize)
    : rawItems.slice(0, 10);

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "620px", width: "100%", maxHeight: "88vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="modal-head" style={{ paddingBottom: "12px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.15)",
                color: "var(--fuel-diesel)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <History size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700" }}>Recently Accessed</h3>
              <small style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                Latest orders, enterprise customers, fleet tankers, and reports
              </small>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Category Tabs & View All Toggle */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 0",
            borderBottom: "1px solid var(--line)",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
            {[
              { id: "all", label: "All Items", count: totalCount },
              { id: "orders", label: "Orders", count: recentData.orders.length },
              { id: "customers", label: "Customers", count: recentData.customers.length },
              { id: "vehicles", label: "Vehicles", count: recentData.vehicles.length },
              { id: "reports", label: "Reports", count: recentData.reports.length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`btn-ghost btn-sm ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  fontSize: "12px",
                  padding: "5px 10px",
                  borderRadius: "8px",
                  fontWeight: activeTab === tab.id ? "700" : "500",
                  background: activeTab === tab.id ? "var(--fuel-diesel)" : "var(--panel-alt)",
                  color: activeTab === tab.id ? "#0F172A" : "var(--text-primary)",
                  border: "1px solid var(--line)",
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setViewAll(!viewAll)}
            style={{
              fontSize: "12px",
              padding: "5px 10px",
              fontWeight: "700",
              color: viewAll ? "var(--fuel-diesel)" : "var(--text-secondary)",
              border: viewAll ? "1px solid var(--fuel-diesel)" : "1px solid var(--line)",
              borderRadius: "6px",
            }}
          >
            {viewAll ? "Show Latest 10" : `View All (${totalRecords})`}
          </button>
        </div>

        {/* Content List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          {totalRecords === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 16px", color: "var(--text-secondary)" }}>
              <Clock size={32} style={{ margin: "0 auto 10px auto", opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: "14px" }}>No recently accessed records found in this category.</p>
              <small style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Browse orders, accounts, tankers, or reports to build access history.
              </small>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {currentItems.map((item, idx) => {
                const IconComponent = item.icon || ClipboardList;
                return (
                  <Link
                    key={`${item.id}-${idx}`}
                    to={item.link || "#"}
                    onClick={onClose}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "var(--panel-alt)",
                      border: "1px solid var(--line)",
                      borderRadius: "10px",
                      textDecoration: "none",
                      color: "inherit",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "8px",
                          background: `${item.color}22`,
                          color: item.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <IconComponent size={16} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <strong
                            style={{
                              fontSize: "14px",
                              color: "var(--text-primary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.resourceName || item.title}
                          </strong>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "rgba(255,255,255,0.06)",
                              color: "var(--text-secondary)",
                              border: "1px solid var(--line)",
                            }}
                          >
                            {item.categoryLabel}
                          </span>
                          {item.meta?.fuelType && (
                            <FuelBadge fuelType={item.meta.fuelType} size="sm" />
                          )}
                        </div>
                        {item.subtitle && (
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "12px", flexShrink: 0 }}>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {formatRecentTime(item.accessedAt || item.timestamp)}
                      </span>
                      <ChevronRight size={14} style={{ color: "var(--fuel-diesel)" }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination in View All mode */}
        {viewAll && totalRecords > pageSize && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalRecords={totalRecords}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "12px",
            borderTop: "1px solid var(--line)",
          }}
        >
          {totalCount > 0 ? (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                if (activeTab === "all") clearRecentAccess();
                else clearRecentAccess(activeTab);
              }}
              style={{ fontSize: "12.5px", color: "var(--status-danger)", padding: "4px 8px" }}
            >
              <Trash2 size={13} style={{ verticalAlign: "middle", marginRight: "4px" }} />
              Clear {activeTab === "all" ? "All" : activeTab}
            </button>
          ) : (
            <div />
          )}

          <button type="button" className="btn-secondary btn-sm" onClick={onClose} style={{ padding: "6px 14px" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
