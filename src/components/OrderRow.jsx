import React from "react";
import { Link } from "react-router-dom";
import { fuelOf } from "../data/seed";
import { Fuel, Check, X, Truck, Lock, Eye } from "lucide-react";
import StatusPill from "./StatusPill";
import FuelBadge from "./FuelBadge";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { ROLES, can } from "../utils/permissions";

const OrderRow = React.memo(function OrderRow({ order, onAdvance, onCancel, onDispatch }) {
  const { t } = useLanguage();
  const { state: authState } = useAuth();
  const userRole = authState?.user?.role || "";
  const canApprove = can(userRole, "orders.approve");
  const canAssign = can(userRole, "orders.assign");
  const isViewOnlyStaff = userRole === ROLES.AUDITOR || userRole === ROLES.SUPPORT_EXECUTIVE;

  const fuel = fuelOf(order.fuelCode);
  const done = order.status === "Delivered" || order.status === "Cancelled" || order.status === "Rejected";
  const isPending = order.status === "Pending" || order.status === "Pending Approval";
  const isApproved = order.status === "Approved";

  const handleAdvanceClick = () => {
    if (isApproved && onDispatch) {
      onDispatch(order);
      return;
    }
    const res = onAdvance(order.id);
    if (res && res.requireAssignment && onDispatch) {
      onDispatch(order);
    }
  };

  return (
    <tr>
      <td className="mono">
        <Link className="row-link" to={`/orders/${order.id}`} aria-label={`View order details for ${order.orderNumber}`}>
          {order.orderNumber}
        </Link>
      </td>
      <td>
        <div className="cell-strong">{order.customer}</div>
        <div className="cell-dim">
          {order.site} · {order.city}
        </div>
      </td>
      <td>
        <FuelBadge fuelType={order.fuelCode || order.fuelType} />
      </td>
      <td className="mono">{order.qty.toLocaleString()} L</td>
      <td>
        <div className="cell-dim" style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: "700", color: order.driver && order.driver !== "Unassigned" ? "var(--text)" : "var(--amber)" }}>
            {order.driver || "Unassigned"}
          </span>
          {order.vehicle && order.vehicle !== "—" && (
            <small style={{ color: "var(--orange)", fontSize: "13px" }}>{order.vehicle}</small>
          )}
        </div>
      </td>
      <td>
        <StatusPill status={order.status} />
      </td>
      <td className="row-actions">
        {isViewOnlyStaff ? (
          <span className="cell-dim" style={{ fontSize: "12.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Lock size={12} /> View Only
          </span>
        ) : isPending ? (
          canApprove ? (
            <>
              <button className="btn-primary btn-sm" onClick={() => onAdvance(order.id)} aria-label={`Accept order ${order.orderNumber}`} title="Accept customer fuel order">
                <Check size={14} /> Accept Order
              </button>
              <button className="btn-ghost danger btn-sm" onClick={() => onCancel(order.id)} aria-label={`Reject order ${order.orderNumber}`} title="Reject customer order">
                <X size={14} /> Reject Order
              </button>
            </>
          ) : (
            <span className="cell-dim" style={{ fontSize: "12.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Lock size={12} /> Pending Approval
            </span>
          )
        ) : isApproved ? (
          <>
            {canAssign ? (
              <button
                className="btn-primary btn-sm"
                style={{ backgroundColor: "var(--orange)", borderColor: "var(--orange)", fontWeight: "800", gap: "4px" }}
                onClick={handleAdvanceClick}
                aria-label={`Dispatch order ${order.orderNumber}`}
                title="Assign driver & vehicle to dispatch order"
              >
                <Truck size={14} /> Dispatch Order
              </button>
            ) : (
              <button
                className="btn-secondary btn-sm"
                onClick={handleAdvanceClick}
                aria-label={`View dispatch details for ${order.orderNumber}`}
                title="Dispatching is restricted to Depot Manager. Click to view dispatch requirements."
                style={{ fontSize: "13px", gap: "4px" }}
              >
                <Eye size={13} /> View Dispatch
              </button>
            )}
            <button className="btn-ghost danger btn-sm" disabled={done} onClick={() => onCancel(order.id)} aria-label={`Cancel order ${order.orderNumber}`}>
              {t("cancel")}
            </button>
          </>
        ) : (
          <>
            <button className="btn-ghost btn-sm" disabled={done} onClick={handleAdvanceClick} aria-label={`Advance order ${order.orderNumber}`}>
              {t("advance")}
            </button>
            <button className="btn-ghost danger btn-sm" disabled={done} onClick={() => onCancel(order.id)} aria-label={`Cancel order ${order.orderNumber}`}>
              {t("cancel")}
            </button>
          </>
        )}
      </td>
    </tr>
  );
});

export default OrderRow;
