import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Trash2, Check, Fuel as FuelIcon, FileText, X } from "lucide-react";
import { fuelOf, computeTotal, STATUS_FLOW, DELIVERY_CHARGE } from "../data/seed";
import { useOrders } from "../context/OrdersContext";
import { useLanguage } from "../context/LanguageContext";
import StatusPill from "../components/StatusPill";
import InvoiceModal from "../components/InvoiceModal";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { orders, advanceStatus, cancelOrder, updateOrder, deleteOrder } = useOrders();

  const order = useMemo(() => orders.find((o) => String(o.id) === String(id)), [orders, id]);

  const [driver, setDriver] = useState(order?.driver || "");
  const [vehicle, setVehicle] = useState(order?.vehicle || "");
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    setDriver(order?.driver || "");
    setVehicle(order?.vehicle || "");
  }, [order?.id]);

  if (!order) {
    return (
      <div className="page">
        <Link className="link-more" to="/orders">
          <ArrowLeft size={14} /> {t("backToOrders")}
        </Link>
        <div className="panel loading">{t("orderNotFound")}</div>
      </div>
    );
  }

  const fuel = fuelOf(order.fuelCode);
  const totals = computeTotal(order.fuelCode, order.qty);
  const done = order.status === "Delivered" || order.status === "Cancelled";
  const isPending = order.status === "Pending";
  const currentStepIndex = STATUS_FLOW.indexOf(order.status);

  const saveAssignment = (e) => {
    e.preventDefault();
    updateOrder(order.id, { driver, vehicle });
  };

  const handleDelete = () => {
    if (window.confirm(t("deleteOrderConfirm"))) {
      deleteOrder(order.id);
      navigate("/orders");
    }
  };

  return (
    <div className="page">
      <Link className="link-more" to="/orders">
        <ArrowLeft size={14} /> {t("backToOrders")}
      </Link>

      <div className="page-head">
        <div>
          <h1 className="mono">{order.orderNumber}</h1>
          <p className="page-sub">{order.customer} · {order.city}</p>
        </div>
        <div className="page-head-actions">
          <button className="btn-secondary" onClick={() => setShowInvoice(true)}>
            <FileText size={16} /> Tax Receipt & Invoice
          </button>
          <StatusPill status={order.status} />
        </div>
      </div>

      <div className="detail-grid">
        <section className="panel detail-panel">
          <h3>{t("orderDetail")}</h3>
          <dl className="detail-list">
            <div><dt>{t("fuel")}</dt><dd><span className="fuel-chip" style={{ "--chip-color": fuel.color }}><FuelIcon size={12} /> {fuel.name}</span></dd></div>
            <div><dt>{t("qty")}</dt><dd className="mono">{order.qty} L</dd></div>
            <div><dt>{t("siteType")}</dt><dd>{order.site}</dd></div>
            <div><dt>{t("city")}</dt><dd>{order.city}</dd></div>
            <div><dt>{t("timeSlot")}</dt><dd>{order.slot}</dd></div>
          </dl>

          <form className="field-row" onSubmit={saveAssignment}>
            <label className="field">
              <span>{t("driver")}</span>
              <input value={driver} onChange={(e) => setDriver(e.target.value)} />
            </label>
            <label className="field">
              <span>{t("vehicle")}</span>
              <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
            </label>
            <button type="submit" className="btn-ghost" style={{ alignSelf: "flex-end" }}>
              {t("save")}
            </button>
          </form>

          <div className="row-actions" style={{ marginTop: 6 }}>
            {isPending ? (
              <>
                <button className="btn-primary" onClick={() => advanceStatus(order.id)}>
                  <Check size={14} /> Accept Order
                </button>
                <button className="btn-ghost danger" onClick={() => cancelOrder(order.id)}>
                  <X size={14} /> Reject Order
                </button>
              </>
            ) : (
              <>
                <button className="btn-primary" disabled={done} onClick={() => advanceStatus(order.id)}>
                  <Check size={14} /> {t("advance")}
                </button>
                <button className="btn-ghost danger" disabled={done} onClick={() => cancelOrder(order.id)}>
                  {t("cancel")}
                </button>
              </>
            )}
            <button className="btn-ghost danger" onClick={handleDelete}>
              <Trash2 size={14} /> {t("delete")}
            </button>
          </div>
        </section>

        <section className="panel detail-panel">
          <h3>{t("billing")}</h3>
          <div className="preview">
            <span>{t("subtotal")} ₹{totals.subtotal.toFixed(2)}</span>
            <span>{t("tax")} ₹{totals.tax.toFixed(2)}</span>
            <span>{t("deliveryCharge")} ₹{DELIVERY_CHARGE.toFixed(2)}</span>
            <span className="preview-total">{t("total")} ₹{totals.total.toFixed(2)}</span>
          </div>

          <h3 style={{ marginTop: 18 }}>{t("statusTimeline")}</h3>
          <ol className="timeline">
            {STATUS_FLOW.map((step, i) => (
              <li
                key={step}
                className={
                  order.status === "Cancelled"
                    ? "timeline-step cancelled"
                    : i <= currentStepIndex
                    ? "timeline-step done"
                    : "timeline-step"
                }
              >
                {t(`status_${step}`)}
              </li>
            ))}
          </ol>
        </section>
      </div>

      {showInvoice && <InvoiceModal order={order} onClose={() => setShowInvoice(false)} />}
    </div>
  );
}
