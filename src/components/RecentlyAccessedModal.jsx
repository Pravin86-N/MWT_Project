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
} from "lucide-react";
import { getAllRecentAccess, clearRecentAccess } from "../services/recentAccess";

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

  if (!isOpen) return null;

  const totalCount =
    recentData.orders.length +
    recentData.customers.length +
    recentData.vehicles.length +
    recentData.reports.length;

  const getCombinedItems = () => {
    const list = [
      ...recentData.orders.map((x) => ({ ...x, category: "orders", categoryLabel: "Order", icon: ClipboardList, color: "var(--orange)" })),
      ...recentData.customers.map((x) => ({ ...x, category: "customers", categoryLabel: "Customer", icon: Users, color: "var(--blue)" })),
      ...recentData.vehicles.map((x) => ({ ...x, category: "vehicles", categoryLabel: "Vehicle", icon: Truck, color: "var(--green-neon)" })),
      ...recentData.reports.map((x) => ({ ...x, category: "reports", categoryLabel: "Report", icon: BarChart3, color: "var(--amber)" })),
    ];
    return list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  };

  const currentItems =
    activeTab === "all"
      ? getCombinedItems()
      : activeTab === "orders"
      ? recentData.orders.map((x) => ({ ...x, category: "orders", categoryLabel: "Order", icon: ClipboardList, color: "var(--orange)" }))
      : activeTab === "customers"
      ? recentData.customers.map((x) => ({ ...x, category: "customers", categoryLabel: "Customer", icon: Users, color: "var(--blue)" }))
      : activeTab === "vehicles"
      ? recentData.vehicles.map((x) => ({ ...x, category: "vehicles", categoryLabel: "Vehicle", icon: Truck, color: "var(--green-neon)" }))
      : recentData.reports.map((x) => ({ ...x, category: "reports", categoryLabel: "Report", icon: BarChart3, color: "var(--amber)" }));

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "560px", width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="modal-head" style={{ paddingBottom: "12px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "rgba(255, 94, 0, 0.15)",
                color: "var(--orange)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <History size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700" }}>Recently Accessed</h3>
              <small style={{ color: "var(--text-dim)", fontSize: "11px" }}>
                Quick history of orders, customers, fleet tankers, and reports
              </small>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Category Tabs */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            padding: "10px 0",
            borderBottom: "1px solid var(--line)",
            overflowX: "auto",
          }}
        >
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
                background: activeTab === tab.id ? "var(--orange)" : "var(--panel-alt)",
                color: activeTab === tab.id ? "#FFF" : "var(--text)",
                border: "1px solid var(--line)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label} {tab.count > 0 && <span style={{ opacity: 0.8, fontSize: "10px" }}>({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* Content List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 0", minHeight: "220px" }}>
          {currentItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-dim)" }}>
              <Clock size={32} style={{ opacity: 0.3, marginBottom: "8px" }} />
              <p style={{ margin: 0, fontSize: "13px" }}>No recently accessed items in this category.</p>
              <small style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                Items you view in Orders, Customers, Vehicles, or Reports will automatically appear here.
              </small>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {currentItems.map((item, idx) => {
                const ItemIcon = item.icon || Clock;
                return (
                  <Link
                    key={`${item.id}-${idx}`}
                    to={item.link}
                    onClick={onClose}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      background: "var(--panel)",
                      border: "1px solid var(--line)",
                      textDecoration: "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          background: `color-mix(in srgb, ${item.color || "var(--orange)"} 15%, transparent)`,
                          color: item.color || "var(--orange)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <ItemIcon size={18} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <strong style={{ fontSize: "13px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.title}
                          </strong>
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "var(--panel-alt)",
                              color: "var(--text-dim)",
                              border: "1px solid var(--line)",
                            }}
                          >
                            {item.categoryLabel}
                          </span>
                        </div>
                        {item.subtitle && (
                          <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "12px" }}>
                      <span style={{ fontSize: "10px", color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                        {formatRecentTime(item.timestamp)}
                      </span>
                      <ChevronRight size={14} style={{ color: "var(--orange)" }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

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
              style={{ fontSize: "11px", color: "var(--red)", padding: "4px 8px" }}
            >
              <Trash2 size={12} style={{ verticalAlign: "middle", marginRight: "4px" }} />
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
