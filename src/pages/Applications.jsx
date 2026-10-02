import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Eye,
  Check,
  X,
  AlertTriangle,
  Download,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import { registrationApi, getBackendBaseUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Applications() {
  const { state: authState } = useAuth();
  const currentUser = authState?.user;

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Pending"); // "Pending" | "Approved" | "Rejected"
  const [selectedApp, setSelectedApp] = useState(null);

  // Document Preview Modal state
  const [previewDoc, setPreviewDoc] = useState(null);

  // Rejection Dialog state
  const [rejectDialogApp, setRejectDialogApp] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 5000);
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await registrationApi.getRegistrations();
      if (res?.data) {
        setRegistrations(res.data);
      }
    } catch (err) {
      console.warn("[Applications] Failed to load registrations:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Filtered applications based on search & active tab
  const filteredApplications = useMemo(() => {
    return registrations.filter((r) => {
      const status = r.status || "Pending";
      const isPending = status === "Pending" || status === "Pending Review";
      const isApproved = status === "Approved" || status === "Verified";
      const isRejected = status === "Rejected";

      let matchesTab = false;
      if (activeTab === "Pending") matchesTab = isPending;
      else if (activeTab === "Approved") matchesTab = isApproved;
      else if (activeTab === "Rejected") matchesTab = isRejected;

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (r.companyName && r.companyName.toLowerCase().includes(q)) ||
        (r.authorizedPerson && r.authorizedPerson.toLowerCase().includes(q)) ||
        (r.contactPerson && r.contactPerson.toLowerCase().includes(q)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.mobile && r.mobile.toLowerCase().includes(q)) ||
        (r.phone && r.phone.toLowerCase().includes(q)) ||
        (r.gstNumber && r.gstNumber.toLowerCase().includes(q)) ||
        (r.panNumber && r.panNumber.toLowerCase().includes(q));

      return matchesTab && matchesSearch;
    });
  }, [registrations, activeTab, search]);

  // Counts for tabs
  const counts = useMemo(() => {
    const pending = registrations.filter(
      (r) => r.status === "Pending" || r.status === "Pending Review"
    ).length;
    const approved = registrations.filter(
      (r) => r.status === "Approved" || r.status === "Verified"
    ).length;
    const rejected = registrations.filter((r) => r.status === "Rejected").length;
    return { pending, approved, rejected, total: registrations.length };
  }, [registrations]);

  // Normalize document URLs for preview, open, and download
  const getDocumentUrl = (doc) => {
    if (!doc) return "";
    const apiHost = getBackendBaseUrl();
    if (doc.filePath) {
      if (doc.filePath.startsWith("http")) return doc.filePath;
      return `${apiHost}${doc.filePath.startsWith("/") ? "" : "/"}${doc.filePath}`;
    }
    if (doc.fileName) {
      return `${apiHost}/uploads/${doc.fileName}`;
    }
    return "";
  };

  // Compile list of documents for an application
  const getApplicationDocuments = (app) => {
    if (!app) return [];
    const list = [];

    // 1. PAN Document
    const pan = app.panDocument || app.panCard;
    if (pan && (pan.fileName || pan.filePath)) {
      list.push({
        title: "PAN Document",
        key: "panDocument",
        fileName: pan.fileName || pan.originalName || "PAN_Card.pdf",
        filePath: pan.filePath,
        mimetype: pan.mimetype || "application/pdf",
        size: pan.size,
      });
    }

    // 2. GST Certificate
    const gst = app.gstCertificate;
    if (gst && (gst.fileName || gst.filePath)) {
      list.push({
        title: "GST Certificate",
        key: "gstCertificate",
        fileName: gst.fileName || gst.originalName || "GST_Certificate.pdf",
        filePath: gst.filePath,
        mimetype: gst.mimetype || "application/pdf",
        size: gst.size,
      });
    }

    // 3. Company Registration Certificate
    const compReg = app.companyRegistrationCertificate;
    if (compReg && (compReg.fileName || compReg.filePath)) {
      list.push({
        title: "Company Registration Certificate",
        key: "companyRegistrationCertificate",
        fileName: compReg.fileName || compReg.originalName || "Company_Registration.pdf",
        filePath: compReg.filePath,
        mimetype: compReg.mimetype || "application/pdf",
        size: compReg.size,
      });
    }

    // 4. Address Proof
    const addr = app.addressProof;
    if (addr && (addr.fileName || addr.filePath)) {
      list.push({
        title: "Address Proof",
        key: "addressProof",
        fileName: addr.fileName || addr.originalName || "Address_Proof.pdf",
        filePath: addr.filePath,
        mimetype: addr.mimetype || "application/pdf",
        size: addr.size,
      });
    }

    // 5. Additional Supporting Documents
    if (Array.isArray(app.additionalSupportingDocuments)) {
      app.additionalSupportingDocuments.forEach((doc, idx) => {
        if (doc && (doc.fileName || doc.filePath)) {
          list.push({
            title: `Supporting Document #${idx + 1}`,
            key: `additional_${idx}`,
            fileName: doc.fileName || doc.originalName || `Supporting_Doc_${idx + 1}.pdf`,
            filePath: doc.filePath,
            mimetype: doc.mimetype || "application/pdf",
            size: doc.size,
          });
        }
      });
    }

    // Fallback: unified documents array
    if (Array.isArray(app.documents)) {
      app.documents.forEach((doc, idx) => {
        const alreadyIncluded = list.some(
          (item) => item.fileName === doc.fileName || item.title === doc.type
        );
        if (!alreadyIncluded && (doc.fileName || doc.filePath)) {
          list.push({
            title: doc.type || `Document #${idx + 1}`,
            key: `doc_${idx}`,
            fileName: doc.fileName || doc.originalName || `Document_${idx + 1}.pdf`,
            filePath: doc.filePath,
            mimetype: doc.mimetype || "application/pdf",
            size: doc.size,
          });
        }
      });
    }

    // Default mock representations if none uploaded
    if (list.length === 0) {
      return [
        { title: "PAN Document", key: "pan", fileName: "PAN_Document.pdf" },
        { title: "GST Certificate", key: "gst", fileName: "GST_Certificate.pdf" },
        { title: "Company Registration Certificate", key: "reg", fileName: "Registration_Cert.pdf" },
        { title: "Address Proof", key: "addr", fileName: "Address_Proof.pdf" },
        { title: "Other Documents", key: "other", fileName: "Supporting_Docs.pdf" },
      ];
    }

    return list;
  };

  // APPROVAL HANDLER
  const handleApprove = async (appId) => {
    try {
      setActionLoading(true);
      await registrationApi.approveRegistration(appId);
      showToast("Customer account approved and activated successfully!");
      if (selectedApp && (selectedApp._id === appId || selectedApp.id === appId)) {
        setSelectedApp(null);
      }
      await fetchApplications();
    } catch (err) {
      console.error("[Approval Error]:", err);
      showToast(err.response?.data?.message || err.message || "Failed to approve application.");
    } finally {
      setActionLoading(false);
    }
  };

  // REJECTION HANDLER
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectDialogApp) return;

    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }

    try {
      setActionLoading(true);
      const appId = rejectDialogApp._id || rejectDialogApp.id;
      await registrationApi.rejectRegistration(appId, rejectionReason.trim());
      showToast("Registration request has been rejected.");
      setRejectDialogApp(null);
      setRejectionReason("");
      if (selectedApp && (selectedApp._id === appId || selectedApp.id === appId)) {
        setSelectedApp(null);
      }
      await fetchApplications();
    } catch (err) {
      console.error("[Rejection Error]:", err);
      showToast(err.response?.data?.message || err.message || "Failed to reject application.");
    } finally {
      setActionLoading(false);
    }
  };

  // Document download trigger
  const handleDownloadDocument = (doc) => {
    const url = getDocumentUrl(doc);
    if (!url) {
      alert(`File ${doc.fileName} is stored in offline dossier.`);
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = doc.fileName || "document.pdf";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="applications-page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            background: "var(--panel)",
            border: "1px solid var(--orange)",
            borderRadius: "10px",
            padding: "14px 20px",
            boxShadow: "var(--shadow-lg)",
            color: "var(--text)",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <CheckCircle2 size={18} style={{ color: "var(--green-neon)" }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", margin: 0, color: "var(--text)" }}>
            Applications / Customer Approvals
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-dim)" }}>
            Review customer registration requests, verify legal dossier documents, and approve or reject corporate accounts.
          </p>
        </div>

        <button className="btn-secondary" onClick={fetchApplications} disabled={loading} title="Refresh Applications">
          <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {/* KPI STAT CARDS */}
      <div className="portal-stats-grid">
        <div
          className="card portal-card"
          onClick={() => setActiveTab("Pending")}
          style={{ cursor: "pointer", borderColor: activeTab === "Pending" ? "var(--amber)" : "var(--line)" }}
        >
          <div className="portal-card-head">
            <Clock size={20} className="icon-amber" />
            <span className="card-lbl">Pending Applications</span>
          </div>
          <strong className="credit-val" style={{ color: "var(--amber)" }}>
            {counts.pending} Awaiting Review
          </strong>
        </div>

        <div
          className="card portal-card"
          onClick={() => setActiveTab("Approved")}
          style={{ cursor: "pointer", borderColor: activeTab === "Approved" ? "var(--green-neon)" : "var(--line)" }}
        >
          <div className="portal-card-head">
            <CheckCircle2 size={20} className="icon-green" />
            <span className="card-lbl">Approved Applications</span>
          </div>
          <strong className="credit-val" style={{ color: "var(--green-neon)" }}>
            {counts.approved} Verified Accounts
          </strong>
        </div>

        <div
          className="card portal-card"
          onClick={() => setActiveTab("Rejected")}
          style={{ cursor: "pointer", borderColor: activeTab === "Rejected" ? "var(--red)" : "var(--line)" }}
        >
          <div className="portal-card-head">
            <XCircle size={20} style={{ color: "var(--red)" }} />
            <span className="card-lbl">Rejected Applications</span>
          </div>
          <strong className="credit-val" style={{ color: "var(--red)" }}>
            {counts.rejected} Rejected
          </strong>
        </div>
      </div>

      {/* FILTERS & SEARCH BAR */}
      <div
        className="card"
        style={{
          padding: "16px",
          display: "flex",
          justifyContent: "space-between",
          gap: "14px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
          <Search size={18} style={{ color: "var(--text-dim)" }} />
          <input
            type="text"
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Company Name, Authorized Person, Email, Mobile, GSTIN, PAN..."
            style={{ width: "100%" }}
          />
        </div>

        {/* Tab Buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className={`tab-btn ${activeTab === "Pending" ? "active" : ""}`}
            onClick={() => setActiveTab("Pending")}
          >
            Pending Applications ({counts.pending})
          </button>
          <button
            className={`tab-btn ${activeTab === "Approved" ? "active" : ""}`}
            onClick={() => setActiveTab("Approved")}
          >
            Approved Applications ({counts.approved})
          </button>
          <button
            className={`tab-btn ${activeTab === "Rejected" ? "active" : ""}`}
            onClick={() => setActiveTab("Rejected")}
          >
            Rejected Applications ({counts.rejected})
          </button>
        </div>
      </div>

      {/* APPLICATIONS DATA TABLE */}
      <div className="card portal-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Authorized Person</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Submission Date</th>
              <th>Current Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "36px", color: "var(--text-dim)" }}>
                  Loading customer applications from database...
                </td>
              </tr>
            ) : filteredApplications.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "36px", color: "var(--text-dim)" }}>
                  No {activeTab.toLowerCase()} applications found.
                </td>
              </tr>
            ) : (
              filteredApplications.map((app) => {
                const appId = app._id || app.id;
                const status = app.status || "Pending";
                const isPending = status === "Pending" || status === "Pending Review";
                const isApproved = status === "Approved" || status === "Verified";
                const isRejected = status === "Rejected";

                const submissionDate = app.submittedAt || app.createdAt;
                const formattedDate = submissionDate
                  ? new Date(submissionDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    })
                  : "Recent";

                return (
                  <tr key={appId}>
                    <td>
                      <strong style={{ color: "var(--text)", display: "block" }}>{app.companyName}</strong>
                      <small style={{ color: "var(--text-dim)", fontSize: "11px" }}>
                        ID: {app.regId || appId} • {app.city || "Chennai"}
                      </small>
                    </td>

                    <td>
                      <div style={{ fontWeight: "600" }}>
                        {app.authorizedPerson || app.contactPerson || "Authorized Rep"}
                      </div>
                      <small style={{ color: "var(--text-dim)" }}>
                        GST: {app.gstNumber || "—"}
                      </small>
                    </td>

                    <td>
                      <span style={{ color: "var(--text-dim)", fontSize: "13px" }}>{app.email || "—"}</span>
                    </td>

                    <td>
                      <span style={{ fontWeight: "600", fontSize: "13px" }}>
                        {app.mobile || app.phone || "—"}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: "13px", color: "var(--text)" }}>{formattedDate}</span>
                    </td>

                    <td>
                      <span
                        className={`badge-tag ${
                          isApproved ? "tag-normal" : isRejected ? "tag-urgent" : "tag-normal"
                        }`}
                        style={
                          isApproved
                            ? { color: "var(--green-neon)", borderColor: "rgba(16, 185, 129, 0.3)" }
                            : isPending
                            ? { color: "var(--amber)", borderColor: "rgba(255, 183, 3, 0.3)" }
                            : { color: "var(--red)", borderColor: "rgba(239, 68, 68, 0.3)" }
                        }
                      >
                        {isPending ? "Pending" : status}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                        {/* VIEW APPLICATION BUTTON */}
                        <button
                          className="btn-ghost-sm"
                          onClick={() => setSelectedApp(app)}
                          title="View Application Dossier"
                          style={{ fontWeight: "700", gap: "4px" }}
                        >
                          <Eye size={14} /> View Application
                        </button>

                        {/* Direct Quick Action Buttons for Pending items */}
                        {isPending && (
                          <>
                            <button
                              className="btn-ghost-sm"
                              onClick={() => handleApprove(appId)}
                              style={{ color: "var(--green-neon)" }}
                              title="Approve Application"
                              disabled={actionLoading}
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              className="btn-ghost-sm"
                              onClick={() => {
                                setRejectDialogApp(app);
                                setRejectionReason("");
                              }}
                              style={{ color: "var(--red)" }}
                              title="Reject Application"
                              disabled={actionLoading}
                            >
                              <X size={14} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* =========================================================================
          APPLICATION DOSSIER VIEW MODAL / PAGE
          ========================================================================= */}
      {selectedApp && (
        <div className="modal-backdrop" onClick={() => setSelectedApp(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "780px", maxHeight: "90vh", overflowY: "auto" }}
          >
            {/* Modal Header */}
            <div className="modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(255, 94, 0, 0.15)",
                    color: "var(--orange)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px" }}>
                    Application Dossier: {selectedApp.companyName}
                  </h3>
                  <p className="cell-dim" style={{ margin: "2px 0 0", fontSize: "12px" }}>
                    Application ID: {selectedApp.regId || selectedApp._id} • Status:{" "}
                    <strong
                      style={{
                        color:
                          selectedApp.status === "Approved"
                            ? "var(--green-neon)"
                            : selectedApp.status === "Rejected"
                            ? "var(--red)"
                            : "var(--amber)",
                      }}
                    >
                      {selectedApp.status || "Pending"}
                    </strong>
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setSelectedApp(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Status Banner if Approved or Rejected */}
              {selectedApp.status === "Approved" && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    color: "var(--green-neon)",
                    fontSize: "13px",
                  }}
                >
                  <CheckCircle2 size={18} />
                  <div>
                    <strong>Approved Corporate Account</strong>
                    <div style={{ color: "var(--text-dim)", fontSize: "11px" }}>
                      Approved by {selectedApp.approvedBy || "Admin"} on{" "}
                      {selectedApp.approvedAt
                        ? new Date(selectedApp.approvedAt).toLocaleString()
                        : "Verified"}
                    </div>
                  </div>
                </div>
              )}

              {selectedApp.status === "Rejected" && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    color: "var(--red)",
                    fontSize: "13px",
                  }}
                >
                  <XCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong>Application Rejected</strong>
                    <div style={{ marginTop: "4px" }}>
                      <strong>Reason: </strong>
                      {selectedApp.rejectionReason || selectedApp.reviewNotes || "Not specified."}
                    </div>
                    {selectedApp.rejectedAt && (
                      <div style={{ color: "var(--text-dim)", fontSize: "11px", marginTop: "2px" }}>
                        Rejected on {new Date(selectedApp.rejectedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Company & Legal Overview Cards Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                  background: "var(--panel-alt)",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-dim)", fontSize: "11px", fontWeight: "700" }}>
                    AUTHORIZED PERSON & CONTACT
                  </span>
                  <div style={{ fontWeight: "700", marginTop: "4px", fontSize: "14px" }}>
                    {selectedApp.authorizedPerson || selectedApp.contactPerson || "Authorized Rep"}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--orange)", marginTop: "4px" }}>
                    📞 {selectedApp.mobile || selectedApp.phone}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>
                    ✉️ {selectedApp.email}
                  </div>
                </div>

                <div>
                  <span style={{ color: "var(--text-dim)", fontSize: "11px", fontWeight: "700" }}>
                    LEGAL TAX IDENTIFIERS
                  </span>
                  <div style={{ marginTop: "4px", fontSize: "13px" }}>
                    <strong>GSTIN: </strong>
                    <code style={{ color: "var(--orange)" }}>{selectedApp.gstNumber}</code>
                  </div>
                  <div style={{ marginTop: "4px", fontSize: "13px" }}>
                    <strong>PAN: </strong>
                    <code>{selectedApp.panNumber}</code>
                  </div>
                  {selectedApp.companyRegNo && (
                    <div style={{ marginTop: "4px", fontSize: "13px" }}>
                      <strong>Reg No: </strong>
                      <span>{selectedApp.companyRegNo}</span>
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: "span 2", borderTop: "1px dashed var(--line)", paddingTop: "10px" }}>
                  <span style={{ color: "var(--text-dim)", fontSize: "11px", fontWeight: "700" }}>
                    REGISTERED SITE ADDRESS
                  </span>
                  <div style={{ fontSize: "13px", marginTop: "4px" }}>
                    {selectedApp.address || selectedApp.address1}, {selectedApp.city},{" "}
                    {selectedApp.state} - {selectedApp.pincode || selectedApp.postalCode}
                  </div>
                </div>
              </div>

              {/* DOCUMENT DOSSIER VIEW SECTION */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "var(--text)" }}>
                    Uploaded Compliance Dossier Documents
                  </h4>
                  <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                    {getApplicationDocuments(selectedApp).length} Documents Attached
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {getApplicationDocuments(selectedApp).map((doc, idx) => {
                    const docUrl = getDocumentUrl(doc);
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 16px",
                          background: "var(--panel-alt)",
                          borderRadius: "10px",
                          border: "1px solid var(--line)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "6px",
                              background: "rgba(255, 94, 0, 0.1)",
                              color: "var(--orange)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <FileText size={18} />
                          </div>
                          <div>
                            <strong style={{ fontSize: "13px", display: "block", color: "var(--text)" }}>
                              {doc.title}
                            </strong>
                            <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                              {doc.fileName || "File.pdf"}
                            </span>
                          </div>
                        </div>

                        {/* ACTION BUTTONS: PREVIEW, OPEN, DOWNLOAD */}
                        <div style={{ display: "flex", gap: "8px" }}>
                          {/* PREVIEW BUTTON */}
                          <button
                            type="button"
                            className="btn-ghost-sm"
                            onClick={() => setPreviewDoc({ ...doc, url: docUrl })}
                            title="Preview Document"
                          >
                            <Eye size={14} /> Preview
                          </button>

                          {/* OPEN BUTTON */}
                          <button
                            type="button"
                            className="btn-ghost-sm"
                            onClick={() => {
                              if (docUrl) {
                                window.open(docUrl, "_blank");
                              } else {
                                alert(`Opening document: ${doc.fileName}`);
                              }
                            }}
                            title="Open Document in New Tab"
                          >
                            <ExternalLink size={14} /> Open
                          </button>

                          {/* DOWNLOAD BUTTON */}
                          <button
                            type="button"
                            className="btn-ghost-sm"
                            onClick={() => handleDownloadDocument(doc)}
                            title="Download Document"
                          >
                            <Download size={14} /> Download
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div
              className="modal-footer"
              style={{
                padding: "14px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid var(--line)",
              }}
            >
              <button className="btn-secondary" onClick={() => setSelectedApp(null)}>
                Close Dossier
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                {(selectedApp.status === "Pending" ||
                  selectedApp.status === "Pending Review") && (
                  <>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setRejectDialogApp(selectedApp);
                        setRejectionReason("");
                      }}
                      style={{ color: "var(--red)", borderColor: "var(--red)" }}
                      disabled={actionLoading}
                    >
                      <X size={15} /> Reject Application
                    </button>

                    <button
                      className="btn-primary"
                      onClick={() => handleApprove(selectedApp._id || selectedApp.id)}
                      disabled={actionLoading}
                      style={{ background: "var(--green-neon)", borderColor: "var(--green-neon)", color: "#000", fontWeight: "800" }}
                    >
                      <Check size={15} /> Approve & Activate Account
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DOCUMENT PREVIEW MODAL
          ========================================================================= */}
      {previewDoc && (
        <div className="modal-backdrop" onClick={() => setPreviewDoc(null)} style={{ zIndex: 10000 }}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "800px", height: "80vh", display: "flex", flexDirection: "column" }}
          >
            <div className="modal-head">
              <div>
                <h3 style={{ margin: 0 }}>Document Preview: {previewDoc.title}</h3>
                <small style={{ color: "var(--text-dim)" }}>{previewDoc.fileName}</small>
              </div>
              <button className="icon-btn" onClick={() => setPreviewDoc(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, padding: "16px", background: "var(--panel-alt)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {previewDoc.url && (previewDoc.url.endsWith(".png") || previewDoc.url.endsWith(".jpg") || previewDoc.url.endsWith(".jpeg")) ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px" }}
                />
              ) : previewDoc.url ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
                  style={{ width: "100%", height: "100%", border: "none", borderRadius: "8px" }}
                />
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-dim)" }}>
                  <FileText size={48} style={{ color: "var(--orange)", margin: "0 auto 12px" }} />
                  <p style={{ fontWeight: "600", margin: "0 0 6px" }}>{previewDoc.title}</p>
                  <p style={{ fontSize: "12px", margin: 0 }}>{previewDoc.fileName}</p>
                  <button
                    className="btn-secondary"
                    onClick={() => handleDownloadDocument(previewDoc)}
                    style={{ marginTop: "16px" }}
                  >
                    <Download size={15} /> Download Document File
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: "12px 16px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  if (previewDoc.url) window.open(previewDoc.url, "_blank");
                }}
              >
                <ExternalLink size={14} /> Open in New Window
              </button>
              <button className="btn-primary" onClick={() => setPreviewDoc(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REJECTION REASON DIALOG MODAL
          ========================================================================= */}
      {rejectDialogApp && (
        <div className="modal-backdrop" onClick={() => setRejectDialogApp(null)} style={{ zIndex: 10000 }}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px" }}
          >
            <div className="modal-head">
              <div>
                <h3 style={{ margin: 0, color: "var(--red)" }}>Reject Customer Application</h3>
                <small style={{ color: "var(--text-dim)" }}>{rejectDialogApp.companyName}</small>
              </div>
              <button className="icon-btn" onClick={() => setRejectDialogApp(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <p style={{ fontSize: "13px", color: "var(--text)", margin: 0 }}>
                  Please specify the reason for rejecting this registration request. The customer will be informed upon login.
                </p>

                <div className="input-wrapper">
                  <span className="input-label">Rejection Reason *</span>
                  <textarea
                    rows={4}
                    className="input"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Invalid GSTIN certificate / Mismatched legal business PAN document..."
                    required
                    style={{ width: "100%", resize: "vertical" }}
                  />
                </div>
              </div>

              <div
                className="modal-footer"
                style={{
                  padding: "14px 20px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  borderTop: "1px solid var(--line)",
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setRejectDialogApp(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ background: "var(--red)", borderColor: "var(--red)", color: "#FFF", fontWeight: "800" }}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
