import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Shield,
  ShieldCheck,
  Building,
  UserX,
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { authApi } from "../services/api";
import { ROLES } from "../utils/permissions";
import Pagination from "../components/Pagination";
import { TableSkeleton } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";

const DEPOT_OPTIONS = [
  { code: "ALL", name: "All Depots (HQ / Global)" },
  { code: "DEP-CHN-01", name: "Chennai Main Terminal (DEP-CHN-01)" },
  { code: "DEP-SLM-02", name: "Salem Hub (DEP-SLM-02)" },
  { code: "DEP-MDU-03", name: "Madurai Junction (DEP-MDU-03)" },
  { code: "DEP-TRY-04", name: "Trichy Central Depot (DEP-TRY-04)" },
  { code: "DEP-CBE-05", name: "Coimbatore Industrial Tanker Base (DEP-CBE-05)" },
];

export default function UserManagement() {
  const { state } = useAuth();
  const { t } = useLanguage();
  const currentUser = state.user;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authApi.getAllUsers();
      if (res && res.data) {
        setUsers(res.data);
      } else if (Array.isArray(res)) {
        setUsers(res);
      }
    } catch (err) {
      console.error("[UserManagement] Failed to fetch users:", err);
      setError(err.response?.data?.message || "Failed to load users list from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Role Change
  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdatingUserId(userId);
      setError(null);
      await authApi.updateUserRole(userId, newRole);
      setSuccessMsg(`User role updated to ${newRole}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error("[UserManagement] Role update failed:", err);
      setError(err.response?.data?.message || "Failed to update role");
      setTimeout(() => setError(null), 4000);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Handle Depot Change
  const handleDepotChange = async (userId, newDepot) => {
    try {
      setUpdatingUserId(userId);
      setError(null);
      const depotVal = newDepot === "ALL" ? null : newDepot;
      await authApi.updateUserDepot(userId, depotVal);
      setSuccessMsg(`User depot assigned to ${newDepot}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, depot: depotVal } : u))
      );
    } catch (err) {
      console.error("[UserManagement] Depot update failed:", err);
      setError(err.response?.data?.message || "Failed to update depot");
      setTimeout(() => setError(null), 4000);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Handle Status Toggle (Active / Inactive)
  const handleToggleStatus = async (user) => {
    try {
      setUpdatingUserId(user._id);
      setError(null);
      const nextActive = user.isActive === false ? true : false;
      const nextStatus = nextActive ? "Active" : "Inactive";
      await authApi.updateUserStatus(user._id, nextStatus, nextActive);
      setSuccessMsg(`User marked as ${nextStatus}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id ? { ...u, isActive: nextActive, status: nextStatus } : u
        )
      );
    } catch (err) {
      console.error("[UserManagement] Status update failed:", err);
      setError(err.response?.data?.message || "Failed to update user status");
      setTimeout(() => setError(null), 4000);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Handle Delete User
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setUpdatingUserId(userToDelete._id);
      setError(null);
      await authApi.deleteUser(userToDelete._id);
      setSuccessMsg(`User ${userToDelete.email} removed successfully`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setUsers((prev) => prev.filter((u) => u._id !== userToDelete._id));
      setUserToDelete(null);
    } catch (err) {
      console.error("[UserManagement] Delete user failed:", err);
      setError(err.response?.data?.message || "Failed to delete user");
      setTimeout(() => setError(null), 4000);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole =
        roleFilter === "ALL" ||
        (u.role || "").toLowerCase() === roleFilter.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.depot && u.depot.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q));
      return matchRole && matchQuery;
    });
  }, [users, roleFilter, searchQuery]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, clampedPage, pageSize]);

  return (
    <div className="page-container" style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "var(--grad-flame, linear-gradient(135deg, #f97316 0%, #ea580c 100%))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Users size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: "700", margin: 0, color: "var(--text)" }}>
                User & Role Governance
              </h1>
              <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "15px" }}>
                Enterprise Platform Access Control • Assign Staff Roles & Depot Jurisdictions
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            color: "var(--text)",
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          Refresh Users
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            borderRadius: "8px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#10b981",
            marginBottom: "20px",
            fontWeight: "500",
          }}
        >
          <CheckCircle2 size={18} />
          {successMsg}
        </div>
      )}

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 16px",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#ef4444",
            marginBottom: "20px",
            fontWeight: "500",
          }}
        >
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          background: "var(--surface)",
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid var(--line)",
          marginBottom: "20px",
        }}
      >
        <div style={{ position: "relative", minWidth: "280px", flex: "1 1 300px" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            placeholder="Search by name, email, role, or depot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 38px",
              borderRadius: "8px",
              border: "1px solid var(--line)",
              background: "var(--bg)",
              color: "var(--text)",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Role Filters */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["ALL", ROLES.ADMIN, ROLES.DEPOT_MANAGER, ROLES.DRIVER, ROLES.CUSTOMER, ROLES.SUPPORT_EXECUTIVE, ROLES.AUDITOR].map(
            (role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  border:
                    roleFilter === role
                      ? "1px solid var(--orange, #f97316)"
                      : "1px solid var(--line)",
                  background:
                    roleFilter === role
                      ? "rgba(249, 115, 22, 0.15)"
                      : "var(--surface)",
                  color: roleFilter === role ? "var(--orange, #f97316)" : "var(--text-muted)",
                }}
              >
                {role === "ALL" ? "All Roles" : role}
              </button>
            )
          )}
        </div>
      </div>

      {/* Users Table */}
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "12px",
          border: "1px solid var(--line)",
          overflowX: "auto",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--line)",
                background: "color-mix(in srgb, var(--surface) 90%, var(--line) 10%)",
              }}
            >
              <th style={{ padding: "14px 18px", fontSize: "14px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
                User Details
              </th>
              <th style={{ padding: "14px 18px", fontSize: "14px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
                System Role
              </th>
              <th style={{ padding: "14px 18px", fontSize: "14px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Depot Jurisdiction
              </th>
              <th style={{ padding: "14px 18px", fontSize: "14px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Status
              </th>
              <th style={{ padding: "14px 18px", fontSize: "14px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", textAlign: "right" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: "16px" }}>
                  <TableSkeleton rows={5} cols={5} />
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: "40px" }}>
                  <EmptyState
                    icon={Users}
                    title="No Users Found"
                    description="No system users match the selected role filter or search criteria."
                    actionText="Reset Filters"
                    onAction={() => {
                      setSearchQuery("");
                      setRoleFilter("ALL");
                    }}
                  />
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u) => {
                const isCurrentUser = currentUser?.id === u._id || currentUser?._id === u._id || currentUser?.email === u.email;
                const isUpdating = updatingUserId === u._id;
                const isActive = u.isActive !== false;

                return (
                  <tr
                    key={u._id}
                    style={{
                      borderBottom: "1px solid var(--line)",
                      transition: "background 0.15s ease",
                      opacity: isUpdating ? 0.6 : 1,
                    }}
                  >
                    {/* User Details */}
                    <td style={{ padding: "16px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            background: u.role === ROLES.ADMIN
                              ? "rgba(239, 68, 68, 0.15)"
                              : u.role === ROLES.DEPOT_MANAGER
                              ? "rgba(249, 115, 22, 0.15)"
                              : "rgba(59, 130, 246, 0.15)",
                            color: u.role === ROLES.ADMIN
                              ? "#ef4444"
                              : u.role === ROLES.DEPOT_MANAGER
                              ? "#f97316"
                              : "#3b82f6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "700",
                            fontSize: "14px",
                          }}
                        >
                          {(u.name || u.email || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: "600", color: "var(--text)", display: "flex", alignItems: "center", gap: "6px" }}>
                            {u.name || "System User"}
                            {isCurrentUser && (
                              <span
                                style={{
                                  fontSize: "12px",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  background: "rgba(59, 130, 246, 0.2)",
                                  color: "#3b82f6",
                                  fontWeight: "700",
                                }}
                              >
                                YOU
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "14px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Mail size={12} />
                            {u.email}
                          </div>
                          {u.mobile && (
                            <div style={{ fontSize: "13px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                              <Phone size={12} />
                              {u.mobile}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role Selector */}
                    <td style={{ padding: "16px 18px" }}>
                      <select
                        value={u.role || ROLES.CUSTOMER}
                        disabled={isUpdating || isCurrentUser}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid var(--line)",
                          background: "var(--bg)",
                          color: "var(--text)",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor: isCurrentUser ? "not-allowed" : "pointer",
                        }}
                      >
                        <option value={ROLES.ADMIN}>👑 Admin (Platform HQ)</option>
                        <option value={ROLES.DEPOT_MANAGER}>🏭 Depot Manager (Operations)</option>
                        <option value={ROLES.SUPPORT_EXECUTIVE}>🎧 Support Executive</option>
                        <option value={ROLES.AUDITOR}>📋 Auditor (Compliance)</option>
                        <option value={ROLES.DRIVER}>🚛 Driver</option>
                        <option value={ROLES.CUSTOMER}>🏢 Customer</option>
                      </select>
                    </td>

                    {/* Depot Selector */}
                    <td style={{ padding: "16px 18px" }}>
                      <select
                        value={u.depot || "ALL"}
                        disabled={isUpdating}
                        onChange={(e) => handleDepotChange(u._id, e.target.value)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid var(--line)",
                          background: "var(--bg)",
                          color: "var(--text)",
                          fontSize: "14px",
                          cursor: "pointer",
                          maxWidth: "240px",
                        }}
                      >
                        {DEPOT_OPTIONS.map((opt) => (
                          <option key={opt.code} value={opt.code}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Status Toggle */}
                    <td style={{ padding: "16px 18px" }}>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={isUpdating || isCurrentUser}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: isCurrentUser ? "not-allowed" : "pointer",
                          border: "none",
                          background: isActive
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(239, 68, 68, 0.15)",
                          color: isActive ? "#10b981" : "#ef4444",
                        }}
                      >
                        {isActive ? <UserCheck size={14} /> : <UserX size={14} />}
                        {isActive ? "Active" : "Inactive"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "16px 18px", textAlign: "right" }}>
                      {!isCurrentUser && (
                        <button
                          onClick={() => setUserToDelete(u)}
                          disabled={isUpdating}
                          title="Delete User"
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            background: "transparent",
                            color: "#ef4444",
                            cursor: "pointer",
                            transition: "background 0.2s",
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredUsers.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <Pagination
            currentPage={clampedPage}
            totalPages={totalPages}
            totalRecords={filteredUsers.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Confirmation Modal for Delete User */}
      {userToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "14px",
              padding: "24px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.5))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", color: "#ef4444" }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700" }}>
                Confirm Delete User
              </h3>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "15px", lineHeight: "1.5", margin: "0 0 20px" }}>
              Are you sure you want to permanently delete user <strong>{userToDelete.email}</strong>?
              This will remove their system access across all assigned depots.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setUserToDelete(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--line)",
                  background: "transparent",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#ef4444",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Yes, Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
