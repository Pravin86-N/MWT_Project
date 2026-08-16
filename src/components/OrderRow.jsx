import React from "react";
import { Link } from "react-router-dom";
import { fuelOf } from "../data/seed";
import { Fuel } from "lucide-react";
import StatusPill from "./StatusPill";
import { useLanguage } from "../context/LanguageContext";

/**
 * PURPOSE OF React.memo + useCallback (in the parent page):
 * Without memo, every row would re-render whenever ANY order in
 * the table changes (because the parent re-renders and passes
 * new inline function props). React.memo skips the re-render
 * unless this row's own props changed — but that only works if
 * `onAdvance` / `onCancel` have a STABLE identity, which is
 * exactly what useCallback in OrdersContext guarantees.
 */
const OrderRow = React.memo(function OrderRow({ order, onAdvance, onCancel }) {
  const { t } = useLanguage();
  const fuel = fuelOf(order.fuelCode);
  const done = order.status === "Delivered" || order.status === "Cancelled";
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
      <td className="mono">{order.qty} L</td>
      <td className="cell-dim">{order.driver}</td>
      <td>
        <StatusPill status={order.status} />
      </td>
      <td className="row-actions">
        <button className="btn-ghost" disabled={done} onClick={() => onAdvance(order.id)}>
          {t("advance")}
        </button>
        <button className="btn-ghost danger" disabled={done} onClick={() => onCancel(order.id)}>
          {t("cancel")}
        </button>
      </td>
    </tr>
  );
});

export default OrderRow;
