import React from "react";
import { Printer, Download, X, Fuel, CheckCircle2, ShieldCheck } from "lucide-react";
import { computeTotal } from "../data/seed";
import { useLanguage } from "../context/LanguageContext";

export default function InvoiceModal({ order, onClose }) {
  const { t } = useLanguage();
  if (!order) return null;

  const billing = computeTotal(order.fuelCode, order.qty);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card invoice-modal" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-modal-header no-print">
          <h2>Tax Invoice & Delivery Note</h2>
          <div className="invoice-header-actions">
            <button className="btn-primary" onClick={handlePrint}>
              <Printer size={16} /> Print / Save PDF
            </button>
            <button className="icon-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="invoice-sheet">
          <div className="inv-top">
            <div className="inv-brand">
              <div className="inv-logo">
                <Fuel size={28} />
              </div>
              <div>
                <h2>FDMS DEPOT LOGISTICS LTD.</h2>
                <p>100 GST Road, Guindy Industrial Estate, Chennai - 600032</p>
                <p>GSTIN: 33AAACF1234H1Z8 | Dispatch Helpline: +91 44 2200 8800</p>
              </div>
            </div>

            <div className="inv-meta">
              <div className="inv-stamp">TAX INVOICE</div>
              <p><strong>Invoice No:</strong> INV-{order.orderNumber}</p>
              <p><strong>Date:</strong> {new Date().toLocaleDateString("en-IN")}</p>
              <p><strong>Time Slot:</strong> {order.slot}</p>
            </div>
          </div>

          <hr className="inv-divider" />

          <div className="inv-parties">
            <div className="inv-party">
              <h4>BILLED TO (CUSTOMER):</h4>
              <strong>{order.customer}</strong>
              <p>Site Location: {order.site}</p>
              <p>City: {order.city}, Tamil Nadu</p>
              <p>Payment Term: Corporate Net 30 Days</p>
            </div>

            <div className="inv-party">
              <h4>DISPATCH DETAILS:</h4>
              <p><strong>Assigned Driver:</strong> {order.driver}</p>
              <p><strong>Tanker Vehicle:</strong> {order.vehicle}</p>
              <p><strong>Dispatch Status:</strong> {order.status}</p>
              <p><strong>Dispatch Hub:</strong> Central Depot Vault #1</p>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="inv-table">
            <thead>
              <tr>
                <th>Item Description</th>
                <th>Fuel Code</th>
                <th>Quantity (L)</th>
                <th>Unit Rate (₹/L)</th>
                <th>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>{billing.fuel?.name} Fuel Bulk Delivery</strong>
                  <small>Delivered via Calibrated Metered Tanker</small>
                </td>
                <td>{order.fuelCode}</td>
                <td>{order.qty.toLocaleString()} L</td>
                <td>₹{billing.fuel?.price.toFixed(2)}</td>
                <td>₹{billing.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          {/* Invoice Summary Box */}
          <div className="inv-summary-row">
            <div className="inv-paid-badge">
              <ShieldCheck size={28} />
              <div>
                <strong>AUTHENTICATED DISPATCH RECEIPT</strong>
                <p>Verified digital flow meter ticket enclosed.</p>
              </div>
            </div>

            <div className="inv-totals">
              <div className="tot-row">
                <span>Subtotal:</span>
                <span>₹{billing.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="tot-row">
                <span>GST (18%):</span>
                <span>₹{billing.tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="tot-row">
                <span>Delivery Freight Charge:</span>
                <span>₹250.00</span>
              </div>
              <div className="tot-row grand-total">
                <span>Grand Total:</span>
                <span>₹{billing.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Signature Footer */}
          <div className="inv-footer-signatures">
            <div className="sig-box">
              <div className="sig-line">R. Rangarajan (Digitally Signed)</div>
              <span>Authorized Dispatch Officer</span>
            </div>
            <div className="sig-box">
              <div className="sig-line">Customer Seal / Stamp</div>
              <span>Receiver Acknowledgment Signature</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
