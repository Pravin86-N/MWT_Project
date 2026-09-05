import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Check,
  X,
  AlertTriangle,
  MapPin,
  Fuel,
  CreditCard,
  Download,
  Mail,
  PhoneCall,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import StatusPill from "../components/StatusPill";

// Default seed customer registrations
const INITIAL_REGISTRATIONS = [
  {
    id: "REG-2026-901",
    companyName: "Southern Logistics & Freight Solutions Pvt Ltd",
    businessType: "Logistics",
    contactPerson: "K. Vijaykumar",
    designation: "Fleet Operations Director",
    mobile: "9840192834",
    email: "vijay@southernfreight.in",
    address1: "Plot 104, Transport Nagar",
    city: "Chennai",
    state: "Tamil Nadu",
    postalCode: "600045",
    gstNumber: "33AABCS8891A1Z8",
    panNumber: "AABCS8891A",
    companyRegNo: "U60231TN2016PTC099881",
    fuelType: "DSL",
    monthlyConsumption: 45000,
    status: "Pending Review",
    submittedAt: "Sep 02, 2026",
    documents: [
      { type: "GST Certificate", fileName: "GST_SouthernFreight.pdf" },
      { type: "PAN Card", fileName: "PAN_SouthernFreight.pdf" },
      { type: "Incorporation Cert", fileName: "Inc_Cert_2016.pdf" },
    ],
  },
  {
    id: "REG-2026-902",
    companyName: "Madurai Textile Mills Ltd",
    businessType: "Manufacturing",
    contactPerson: "M. Ramanathan",
    designation: "Plant Head",
    mobile: "9443187654",
    email: "ramanathan@maduraitextiles.com",
    address1: "Industrial Area Phase II",
    city: "Madurai",
    state: "Tamil Nadu",
    postalCode: "625001",
    gstNumber: "33AABCM1102B1Z2",
    panNumber: "AABCM1102B",
    companyRegNo: "U17111TN2010PLC077812",
    fuelType: "DSL",
    monthlyConsumption: 30000,
    status: "Pending Review",
    submittedAt: "Sep 01, 2026",
    documents: [
      { type: "GST Certificate", fileName: "Madurai_GSTIN.pdf" },
      { type: "PAN Card", fileName: "PAN_MaduraiMills.pdf" },
    ],
  },
  {
    id: "REG-2026-880",
    companyName: "Coimbatore Precision Auto Parts",
    businessType: "Manufacturing",
    contactPerson: "S. Anandan",
    designation: "Procurement Manager",
    mobile: "9894011223",
    email: "anandan@cbe-autoparts.in",
    address1: "Peelamedu Tech Park",
    city: "Coimbatore",
    state: "Tamil Nadu",
    postalCode: "641004",
    gstNumber: "33AABCC5544C1Z9",
    panNumber: "AABCC5544C",
    companyRegNo: "U29299TN2012PTC085421",
    fuelType: "DSL",
    monthlyConsumption: 60000,
    status: "Verified",
    submittedAt: "Aug 25, 2026",
    documents: [
      { type: "GST Certificate", fileName: "GST_CbeParts.pdf" },
      { type: "PAN Card", fileName: "PAN_CbeParts.pdf" },
    ],
  },
];

export default function CustomerRegistrations() {
  const [registrations, setRegistrations] = useState(() => {
    const saved = localStorage.getItem("fdms-customer-registrations");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return [...parsed, ...INITIAL_REGISTRATIONS];
      } catch (e) {
        return INITIAL_REGISTRATIONS;
      }
    }
    return INITIAL_REGISTRATIONS;
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedReg, setSelectedReg] = useState(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("fdms-customer-registrations", JSON.stringify(registrations));
  }, [registrations]);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      const matchesSearch =
        r.companyName.toLowerCase().includes(search.toLowerCase()) ||
        r.gstNumber.toLowerCase().includes(search.toLowerCase()) ||
        r.contactPerson.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [registrations, search, statusFilter]);

  const stats = useMemo(() => {
    const total = registrations.length;
    const pending = registrations.filter((r) => r.status === "Pending Review").length;
    const verified = registrations.filter((r) => r.status === "Verified").length;
    const rejected = registrations.filter((r) => r.status === "Rejected").length;
    return { total, pending, verified, rejected };
  }, [registrations]);

  // Actions
  const handleApprove = (id) => {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Verified" } : r))
    );
    if (selectedReg && selectedReg.id === id) {
      setSelectedReg((prev) => ({ ...prev, status: "Verified" }));
    }
    alert("Customer Registration Approved! Business account has been activated.");
  };

  const handleReject = (id) => {
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Rejected" } : r))
    );
    if (selectedReg && selectedReg.id === id) {
      setSelectedReg((prev) => ({ ...prev, status: "Rejected" }));
    }
    alert("Registration Application Rejected.");
  };

  const handleRequestDocs = (id) => {
    alert("Notification sent to customer requesting additional verification documents.");
  };

  return (
    <div className="registrations-page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Page Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", margin: 0, color: "var(--text)" }}>
            B2B Customer Registrations & KYC Approvals
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-dim)" }}>
            Review corporate customer application dossiers, verify GSTIN/PAN documents, and activate accounts.
          </p>
        </div>
      </div>

      {/* KPI STAT CARDS */}
      <div className="portal-stats-grid">
        <div className="card portal-card">
          <div className="portal-card-head">
            <Building2 size={20} className="icon-orange" />
            <span className="card-lbl">Total Applications</span>
          </div>
          <strong className="credit-val">{stats.total} Companies</strong>
        </div>

        <div className="card portal-card">
          <div className="portal-card-head">
            <Clock size={20} className="icon-amber" />
            <span className="card-lbl">Pending Review</span>
          </div>
          <strong className="credit-val" style={{ color: "var(--amber)" }}>{stats.pending} Applications</strong>
        </div>

        <div className="card portal-card">
          <div className="portal-card-head">
            <CheckCircle2 size={20} className="icon-green" />
            <span className="card-lbl">Verified Accounts</span>
          </div>
          <strong className="credit-val" style={{ color: "var(--green-neon)" }}>{stats.verified} Approved</strong>
        </div>

        <div className="card portal-card">
          <div className="portal-card-head">
            <XCircle size={20} style={{ color: "var(--red)" }} />
            <span className="card-lbl">Rejected</span>
          </div>
          <strong className="credit-val" style={{ color: "var(--red)" }}>{stats.rejected} Applications</strong>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="card" style={{ padding: "16px", display: "flex", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
          <Search size={18} style={{ color: "var(--text-dim)" }} />
          <input
            type="text"
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Company, GSTIN, or Contact Person..."
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {["ALL", "Pending Review", "Verified", "Rejected"].map((st) => (
            <button
              key={st}
              className={`tab-btn ${statusFilter === st ? "active" : ""}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === "ALL" ? "All Applications" : st}
            </button>
          ))}
        </div>
      </div>

      {/* REGISTRATIONS DATA TABLE */}
      <div className="card portal-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>App ID</th>
              <th>Company Name</th>
              <th>Sector</th>
              <th>Contact Person</th>
              <th>GST Number</th>
              <th>PAN Number</th>
              <th>Monthly Fuel</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegistrations.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.id}</strong></td>
                <td>
                  <strong style={{ color: "var(--text)" }}>{r.companyName}</strong>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{r.city}, {r.state}</div>
                </td>
                <td><span className="badge-tag tag-normal">{r.businessType}</span></td>
                <td>
                  <div>{r.contactPerson}</div>
                  <small style={{ color: "var(--text-dim)" }}>{r.mobile}</small>
                </td>
                <td><code style={{ fontSize: "12px", color: "var(--orange)" }}>{r.gstNumber}</code></td>
                <td><code style={{ fontSize: "12px" }}>{r.panNumber}</code></td>
                <td><strong>{(r.monthlyConsumption || 0).toLocaleString()} L</strong></td>
                <td>
                  <span className={`badge-tag ${r.status === "Verified" ? "tag-normal" : r.status === "Rejected" ? "tag-urgent" : "tag-normal"}`} style={r.status === "Verified" ? { color: "var(--green-neon)" } : r.status === "Pending Review" ? { color: "var(--amber)" } : {}}>
                    {r.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button className="btn-ghost-sm" onClick={() => setSelectedReg(r)} title="View Complete Dossier">
                      <Eye size={14} /> Dossier
                    </button>
                    {r.status === "Pending Review" && (
                      <>
                        <button className="btn-ghost-sm" onClick={() => handleApprove(r.id)} style={{ color: "var(--green-neon)" }} title="Approve">
                          <Check size={14} />
                        </button>
                        <button className="btn-ghost-sm" onClick={() => handleReject(r.id)} style={{ color: "var(--red)" }} title="Reject">
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DOSSIER MODAL */}
      {selectedReg && (
        <div className="modal-backdrop" onClick={() => setSelectedReg(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "680px" }}>
            <div className="modal-head">
              <div>
                <h3 style={{ margin: 0 }}>Application Dossier: {selectedReg.companyName}</h3>
                <p className="cell-dim" style={{ margin: "2px 0 0" }}>Application ID: {selectedReg.id} • Submitted: {selectedReg.submittedAt}</p>
              </div>
              <button className="icon-btn" onClick={() => setSelectedReg(null)}><X size={18} /></button>
            </div>

            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "var(--panel-alt)", padding: "14px", borderRadius: "14px", border: "1px solid var(--line)" }}>
                <div>
                  <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>CONTACT PERSON</span>
                  <div style={{ fontWeight: "700" }}>{selectedReg.contactPerson} ({selectedReg.designation})</div>
                  <div style={{ fontSize: "12px", color: "var(--orange)" }}>📞 {selectedReg.mobile} • ✉️ {selectedReg.email}</div>
                </div>

                <div>
                  <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>LEGAL TAX NUMBERS</span>
                  <div><strong>GSTIN:</strong> {selectedReg.gstNumber}</div>
                  <div><strong>PAN:</strong> {selectedReg.panNumber}</div>
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>DISCHARGE SITE ADDRESS</span>
                  <div>{selectedReg.address1}, {selectedReg.city}, {selectedReg.state} - {selectedReg.postalCode}</div>
                </div>
              </div>

              <div>
                <strong style={{ fontSize: "13px", color: "var(--text)" }}>Uploaded KYC Documents:</strong>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                  {(selectedReg.documents || []).map((doc, i) => (
                    <div key={i} style={{ background: "var(--panel-alt)", border: "1px solid var(--line)", padding: "8px 12px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <FileText size={16} style={{ color: "var(--orange)" }} />
                      <span style={{ fontSize: "12px" }}>{doc.fileName || doc.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between" }}>
              <button className="btn-secondary" onClick={() => handleRequestDocs(selectedReg.id)}>
                Request Additional Docs
              </button>

              <div style={{ display: "flex", gap: "8px" }}>
                {selectedReg.status === "Pending Review" && (
                  <>
                    <button className="btn-secondary" onClick={() => handleReject(selectedReg.id)} style={{ color: "var(--red)" }}>
                      Reject
                    </button>
                    <button className="btn-primary" onClick={() => handleApprove(selectedReg.id)}>
                      Approve & Activate Account
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
