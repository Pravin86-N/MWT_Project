import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Phone, ShieldCheck, UserCheck, Star, Award, ClipboardList, Clock, Truck, Lock } from "lucide-react";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { ROLES, can } from "../utils/permissions";
import { driverApi } from "../services/api";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import { SkeletonCard } from "../components/Skeleton";
import FuelBadge from "../components/FuelBadge";

export default function Drivers() {
  const { t } = useLanguage();
  const { orders } = useOrders();
  const { state: authState } = useAuth();
  const currentUser = authState?.user;
  const userRole = currentUser?.role || "";
  const canManage = can(userRole, "drivers.create");

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("");

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await driverApi.getDrivers();
      if (res?.data) {
        setDrivers(res.data);
      }
    } catch (err) {
      console.warn("[Drivers] Backend API error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Derive active assigned orders per driver from OrdersContext
  const driverActiveOrders = useMemo(() => {
    const map = {};
    for (const o of orders) {
      if (o.driver && o.driver !== "Unassigned" && (o.status === "Dispatched" || o.status === "InTransit" || o.status === "Approved")) {
        if (!map[o.driver]) map[o.driver] = [];
        map[o.driver].push(o);
      }
    }
    return map;
  }, [orders]);

  const toggleDuty = useCallback(async (driver) => {
    const newOnDuty = !driver.onDuty;
    const targetId = driver._id || driver.id;
    // Optimistic UI update
    setDrivers((prev) =>
      prev.map((d) => ((d._id || d.id) === targetId ? { ...d, onDuty: newOnDuty } : d))
    );

    try {
      await driverApi.updateDriver(targetId, {
        onDuty: newOnDuty,
        status: newOnDuty ? "On Duty" : "Off Duty",
      });
    } catch (err) {
      console.error("[Drivers] Failed to update duty status on server:", err.message);
      // Rollback on failure
      setDrivers((prev) =>
        prev.map((d) => ((d._id || d.id) === targetId ? { ...d, onDuty: !newOnDuty } : d))
      );
    }
  }, []);

  const addDriver = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      phone: phone || "+91 98765 43210",
      license: license || `TN-${Math.floor(1000 + Math.random() * 9000)}-2024`,
      onDuty: true,
      deliveries: 0,
      rating: 4.9,
    };

    try {
      const res = await driverApi.createDriver(payload);
      if (res?.data) {
        setDrivers((prev) => [res.data, ...prev]);
      } else {
        setDrivers((prev) => [{ ...payload, id: Date.now() }, ...prev]);
      }
    } catch (err) {
      console.error("[Drivers] Failed to create driver:", err.message);
      setDrivers((prev) => [{ ...payload, id: Date.now() }, ...prev]);
    }

    setName("");
    setPhone("");
    setLicense("");
  };

  const totalPages = Math.max(1, Math.ceil(drivers.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const paginatedDrivers = drivers.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Banner */}
      <div className="fleet-header-saas" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 className="fleet-title-saas" style={{ margin: 0 }}>Driver Operations & Telemetry Personnel</h1>
            {!canManage && (
              <span
                style={{
                  fontSize: "12px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(249, 115, 22, 0.15)",
                  border: "1px solid rgba(249, 115, 22, 0.3)",
                  color: "var(--orange)",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Lock size={12} />
                VIEW-ONLY • Managed by Depot Managers
              </span>
            )}
          </div>
          <p className="fleet-subtitle-saas">
            Manage driver profiles, toggle real-time duty availability, and monitor active delivery assignments.
          </p>
        </div>
      </div>

      {/* Add New Driver Form Panel (Depot Manager) or Governance Banner (Admin / Staff) */}
      {canManage ? (
        <section className="panel form-panel" style={{ padding: "20px", background: "var(--grad-dark-panel)", borderRadius: "16px", border: "1px solid var(--line)" }}>
          <h3 style={{ margin: "0 0 14px 0", fontSize: "17px", fontWeight: "700" }}>Onboard New Qualified Driver</h3>
          <form className="field-row" onSubmit={addDriver} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "14px", alignItems: "end" }}>
            <label className="field">
              <span>Driver Full Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., D. Kumar" required />
            </label>
            <label className="field">
              <span>Phone Contact</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </label>
            <label className="field">
              <span>License Number</span>
              <input value={license} onChange={(e) => setLicense(e.target.value)} placeholder="TN-01-2024-9876" />
            </label>
            <button type="submit" className="btn-primary" style={{ backgroundColor: "var(--fuel-diesel)", borderColor: "var(--fuel-diesel)", color: "#0F172A", fontWeight: "700" }}>
              <Plus size={16} /> Register Driver
            </button>
          </form>
        </section>
      ) : (
        <div
          style={{
            padding: "16px 20px",
            background: "rgba(59, 130, 246, 0.1)",
            borderRadius: "14px",
            border: "1px solid rgba(59, 130, 246, 0.25)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "var(--text)",
            fontSize: "14px",
          }}
        >
          <ShieldCheck size={20} style={{ color: "#3b82f6", flexShrink: 0 }} />
          <div>
            <strong>Platform Governance (View-Only Mode):</strong> Driver onboarding and on-duty availability are operationally registered and managed by <strong>Depot Managers</strong> for their assigned depot jurisdictions.
          </div>
        </div>
      )}

      {/* Drivers Roster Cards Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={`skel-drv-${i}`} height="220px" />
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <EmptyState
          type="default"
          title="No registered drivers found."
          message="No logistics personnel are currently registered. Onboard a driver above."
        />
      ) : (
        <>
          <section className="cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
            {paginatedDrivers.map((d) => {
              const assignedOrders = driverActiveOrders[d.name] || [];
              return (
                <div key={d._id || d.id} className="panel driver-card" style={{ padding: "20px", borderRadius: "16px", border: "1px solid var(--line)", background: "var(--panel)" }}>
                  {/* Header & Availability Toggle */}
                  <div className="driver-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div>
                      <div className="cell-strong" style={{ fontSize: "17px", fontWeight: "800", color: "var(--text)" }}>
                        {d.name}
                      </div>
                      <small style={{ color: "var(--text-dim)", fontSize: "13px" }}>
                        Lic: {d.license || `TN-${Math.floor(1000 + Math.random() * 9000)}-2024`}
                      </small>
                    </div>

                    {/* Duty Availability Toggle Button */}
                    {canManage ? (
                      <button
                        className={"pill toggle" + (d.onDuty ? "" : " off")}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontWeight: "800",
                          fontSize: "13px",
                          cursor: "pointer",
                          border: "none",
                          background: d.onDuty ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.08)",
                          color: d.onDuty ? "var(--status-success)" : "var(--text-secondary)",
                        }}
                        onClick={() => toggleDuty(d)}
                      >
                        {d.onDuty ? "🟢 ON DUTY" : "⚪ OFF DUTY"}
                      </button>
                    ) : (
                      <span
                        className={"pill" + (d.onDuty ? "" : " off")}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontWeight: "800",
                          fontSize: "13px",
                          background: d.onDuty ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.08)",
                          color: d.onDuty ? "var(--status-success)" : "var(--text-secondary)",
                        }}
                      >
                        {d.onDuty ? "🟢 ON DUTY" : "⚪ OFF DUTY"}
                      </span>
                    )}
                  </div>

                  {/* Driver Details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", color: "var(--text-dim)", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Phone size={14} style={{ color: "var(--fuel-diesel)" }} /> <span>{d.phone || "+91 98765 43210"}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Star size={14} style={{ color: "var(--fuel-diesel)" }} /> <span>Rating: <strong style={{ color: "var(--text)" }}>{d.rating || "4.9"} / 5.0</strong></span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Award size={14} style={{ color: "var(--fuel-electric)" }} /> <span>Completed Deliveries: <strong style={{ color: "var(--text)" }}>{d.deliveries || 0} orders</strong></span>
                    </div>
                  </div>

                  {/* Assigned Active Orders Section */}
                  <div style={{ background: "var(--panel-alt)", padding: "12px", borderRadius: "12px", border: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)" }}>Assigned Active Orders</span>
                      <span className="pill status-dispatched" style={{ fontSize: "12px", padding: "2px 8px" }}>
                        {assignedOrders.length} Active
                      </span>
                    </div>

                    {assignedOrders.length === 0 ? (
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                        No active orders currently assigned. Driver available for dispatch.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {assignedOrders.map((o) => (
                          <div key={o.id} style={{ fontSize: "13px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text)" }}>
                            <span>🚚 <strong>{o.orderNumber}</strong> ({o.site})</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <FuelBadge fuelType={o.fuelCode || o.fuelType} size="sm" />
                              <span style={{ color: "var(--fuel-diesel)", fontWeight: "700" }}>{o.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>

          <Pagination
            currentPage={clampedPage}
            totalPages={totalPages}
            totalRecords={drivers.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 20, 50]}
          />
        </>
      )}
    </div>
  );
}
