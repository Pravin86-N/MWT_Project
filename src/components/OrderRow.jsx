import React from "react";
import { Link } from "react-router-dom";
import { fuelOf } from "../data/seed";
import { Fuel, Check, X, Truck } from "lucide-react";
import StatusPill from "./StatusPill";
import { useLanguage } from "../context/LanguageContext";

const OrderRow = React.memo(function OrderRow({ order, onAdvance, onCancel, onDispatch }) {
  const { t } = useLanguage();
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
        <Link className="row-link" to={`/orders/${order.id}`}>
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
        <span className="fuel-chip" style={{ "--chip-color": fuel.color }}>
          <Fuel size={12} /> {fuel.name}
        </span>
      </td>
      <td className="mono">{order.qty.toLocaleString()} L</td>
      <td>
        <div className="cell-dim" style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: "700", color: order.driver && order.driver !== "Unassigned" ? "var(--text)" : "var(--amber)" }}>
            {order.driver || "Unassigned"}
          </span>
          {order.vehicle && order.vehicle !== "—" && (
            <small style={{ color: "var(--orange)" }}>{order.vehicle}</small>
          )}
        </div>
      </td>
      <td>
        <StatusPill status={order.status} />
      </td>
      <td className="row-actions">
        {isPending ? (
          <>
            <button className="btn-primary btn-sm" onClick={() => onAdvance(order.id)} title="Accept customer fuel order">
              <Check size={14} /> Accept Order
            </button>
            <button className="btn-ghost danger btn-sm" onClick={() => onCancel(order.id)} title="Reject customer order">
              <X size={14} /> Reject Order
            </button>
          </>
        ) : isApproved ? (
          <>
            <button
              className="btn-primary btn-sm"
              style={{ backgroundColor: "var(--orange)", borderColor: "var(--orange)", fontWeight: "800", gap: "4px" }}
              onClick={handleAdvanceClick}
              title="Assign driver & vehicle to dispatch order"
            >
              <Truck size={14} /> Dispatch Order
            </button>
            <button className="btn-ghost danger btn-sm" disabled={done} onClick={() => onCancel(order.id)}>
              {t("cancel")}
            </button>
          </>
        ) : (
          <>
            <button className="btn-ghost btn-sm" disabled={done} onClick={handleAdvanceClick}>
              {t("advance")}
            </button>
            <button className="btn-ghost danger btn-sm" disabled={done} onClick={() => onCancel(order.id)}>
              {t("cancel")}
            </button>
          </>
        )}
      </td>
    </tr>
  );
});

export default OrderRow;
