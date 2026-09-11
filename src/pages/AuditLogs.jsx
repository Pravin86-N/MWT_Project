import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  Search,
  RefreshCw,
  Clock,
  User,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Truck,
  KeyRound,
  LogIn,
  XCircle,
  Filter,
} from "lucide-react";
import { activityApi } from "../services/api";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await activityApi.getActivities({ limit: 100 });
      if (res?.data) {
        setLogs(res.data);
      }
    } catch (err) {
      console.warn("[AuditLogs] Error fetching audit trail:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadge = (action) => {
    const act = (action || "").toLowerCase();
    if (act.includes("approved") || act.includes("completed") || act.includes("verified")) {
      return {
        bg: "rgba(16, 185, 129, 0.15)",
        color: "var(--green, #10b981)",
        border: "rgba(16, 185, 129, 0.3)",
        icon: CheckCircle2,
      };
    }
    if (act.includes("rejected") || act.includes("failed") || act.includes("warning")) {
      return {
        bg: "rgba(239, 68, 68, 0.15)",
        color: "var(--red, #ef4444)",
        border: "rgba(239, 68, 68, 0.3)",
        icon: XCircle,
      };
    }
    if (act.includes("google") || act.includes("login") || act.includes("auth")) {
      return {
        bg: "rgba(59, 130, 246, 0.15)",
        color: "var(--blue, #3b82f6)",
        border: "rgba(59, 130, 246, 0.3)",
        icon: LogIn,
      };
    }
    if (act.includes("password") || act.includes("otp") || act.includes("security")) {
      return {
        bg: "rgba(245, 158, 11, 0.15)",
        color: "var(--amber, #f59e0b)",
        border: "rgba(245, 158, 11, 0.3)",
        icon: KeyRound,
      };
    }
    if (act.includes("vehicle") || act.includes("driver") || act.includes("dispatch")) {
      return {
        bg: "rgba(6, 182, 212, 0.15)",
        color: "#06b6d4",
        border: "rgba(6, 182, 212, 0.3)",
        icon: Truck,
      };
    }
    return {
      bg: "rgba(255, 94, 0, 0.15)",
      color: "var(--orange, #ff5e00)",
      border: "rgba(255, 94, 0, 0.3)",
      icon: Activity,
    };
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const act = log.action || "";
      let matchesCategory = true;
      if (actionFilter === "Registrations") {
        matchesCategory = act.toLowerCase().includes("register") || act.toLowerCase().includes("customer");
      } else if (actionFilter === "Orders") {
        matchesCategory = act.toLowerCase().includes("order");
      } else if (actionFilter === "Logistics") {
        matchesCategory = act.toLowerCase().includes("vehicle") || act.toLowerCase().includes("driver") || act.toLowerCase().includes("delivery");
      } else if (actionFilter === "Security") {
        matchesCategory = act.toLowerCase().includes("login") || act.toLowerCase().includes("password") || act.toLowerCase().includes("google");
      }

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (log.userName && log.userName.toLowerCase().includes(q)) ||
        (log.userRole && log.userRole.toLowerCase().includes(q)) ||
        (log.action && log.action.toLowerCase().includes(q)) ||
        (log.details && log.details.toLowerCase().includes(q)) ||
        (log.ipAddress && log.ipAddress.toLowerCase().includes(q)) ||
        (log.entityId && log.entityId.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [logs, actionFilter, search]);

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Page Header */}
      <div className="fleet-header-saas" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Shield size={18} style={{ color: "var(--orange)" }} />
            <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--orange)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              SECURITY & COMPLIANCE
            </span>
          </div>
          <h1 className="fleet-title-saas">System Audit Logs & Activity Trail</h1>
          <p className="fleet-subtitle-saas">
            Immutable tracking of user authentication, customer approvals, orders, fleet dispatches, and IP addresses.
          </p>
        </div>

        <button
          className="btn-secondary"
          onClick={fetchLogs}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700" }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          <span>{loading ? "Refreshing..." : "Refresh Trail"}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div className="pill-filter-bar">
          {["All", "Registrations", "Orders", "Logistics", "Security"].map((cat) => (
            <button
              key={cat}
              className={`filter-pill-btn ${actionFilter === cat ? "active" : ""}`}
              onClick={() => setActionFilter(cat)}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ width: "320px" }}>
          <div className="input-field-box" style={{ height: "42px" }}>
            <Search size={16} className="input-icon" />
            <input
              type="text"
              placeholder="Search user, action, IP address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <section className="panel table-panel">
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={18} style={{ color: "var(--orange)" }} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>
              Audit Events ({filteredLogs.length} Records)
            </h3>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
            Showing latest 100 system audit records
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
            Loading audit records from MongoDB...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
            No audit log records match the current filter or search query.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: "160px" }}>Action</th>
                  <th style={{ minWidth: "160px" }}>User</th>
                  <th style={{ minWidth: "220px" }}>Details / Target</th>
                  <th style={{ minWidth: "130px" }}>IP Address</th>
                  <th style={{ minWidth: "160px" }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => {
                  const badge = getActionBadge(log.action);
                  const Icon = badge.icon;
                  const dateObj = new Date(log.createdAt || log.timestamp || Date.now());
                  const formattedDate = dateObj.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const formattedTime = dateObj.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  });

                  return (
                    <tr key={log._id || idx}>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 10px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Icon size={13} />
                          <span>{log.action}</span>
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <strong style={{ fontSize: "13px", color: "var(--text)" }}>
                            {log.userName || "System"}
                          </strong>
                          <span
                            style={{
                              fontSize: "11px",
                              color: log.userRole === "Admin" ? "var(--purple, #a855f7)" : log.userRole === "Depot Manager" ? "var(--orange)" : "var(--text-dim)",
                              fontWeight: "600",
                            }}
                          >
                            {log.userRole || "Admin"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "12px", color: "var(--text)", lineHeight: "1.4" }}>
                          {log.details || log.description || log.entityId || "—"}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "12px",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: "var(--panel-alt)",
                            border: "1px solid var(--line)",
                            color: "var(--text-dim)",
                          }}
                        >
                          {log.ipAddress && log.ipAddress !== "::1" && log.ipAddress !== "127.0.0.1" ? log.ipAddress : "127.0.0.1"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-dim)" }}>
                          <Clock size={13} style={{ color: "var(--orange)", flexShrink: 0 }} />
                          <span>
                            {formattedDate} • <strong>{formattedTime}</strong>
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
