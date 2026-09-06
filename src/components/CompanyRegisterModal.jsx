import React, { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { registrationApi } from "../services/api";
import {
  Building2,
  MapPin,
  ShieldCheck,
  UploadCloud,
  FileText,
  Fuel,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Clock,
  Eye,
  Trash2,
  RefreshCw,
  Check,
} from "lucide-react";

// Pin marker icon for address picker map
const createPinIcon = () =>
  L.divIcon({
    html: `<div style="background:#FF5E00; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #FFF; box-shadow:0 0 14px rgba(255,94,0,0.8);"><span style="font-size:18px;">📍</span></div>`,
    className: "custom-leaflet-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

function LocationPickerMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} icon={createPinIcon()} /> : null;
}

export default function CompanyRegisterModal({ open, onClose }) {
  const [step, setStep] = useState(1);

  // Step 1: Company Information
  const [formData, setFormData] = useState({
    companyName: "",
    businessType: "Manufacturing",
    contactPerson: "",
    designation: "Procurement Manager",
    mobile: "",
    email: "",
    altContact: "",
    website: "",

    // Step 2: Address
    address1: "",
    address2: "",
    city: "Chennai",
    district: "Chennai",
    state: "Tamil Nadu",
    country: "India",
    postalCode: "600032",

    // Step 3: Verification
    gstNumber: "",
    panNumber: "",
    companyRegNo: "",
    businessLicense: "",

    // Step 5: Fuel Requirements
    fuelType: "DSL",
    monthlyConsumption: "25000",
    deliverySites: "2",
    preferredTiming: "Morning (06:00 - 10:00 AM)",
  });

  // Step 2: Map Pin Location State
  const [mapPos, setMapPos] = useState([13.0827, 80.2707]);

  // Step 4: Documents Upload State
  const [documents, setDocuments] = useState({
    gstCert: null,
    panCard: null,
    companyReg: null,
    signatoryId: null,
    addressProof: null,
    tradeLicense: null,
    storagePermit: null,
  });

  // Upload Progress Simulation state
  const [uploadProgress, setUploadProgress] = useState({});

  // Errors state
  const [errors, setErrors] = useState({});

  // Submission Completed state
  const [submitted, setSubmitted] = useState(false);
  const [submittedRegId, setSubmittedRegId] = useState("");

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const errs = {};
    if (!formData.companyName.trim()) errs.companyName = "Company Name is required.";
    if (!formData.contactPerson.trim()) errs.contactPerson = "Contact Person Name is required.";
    if (!formData.mobile.trim()) {
      errs.mobile = "Mobile Number is required.";
    } else if (!/^\d{10}$/.test(formData.mobile.replace(/\D/g, ""))) {
      errs.mobile = "Enter a valid 10-digit mobile number.";
    }
    if (!formData.email.trim()) {
      errs.email = "Email Address is required.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = "Enter a valid email address.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const errs = {};
    if (!formData.address1.trim()) errs.address1 = "Address Line 1 is required.";
    if (!formData.city.trim()) errs.city = "City is required.";
    if (!formData.postalCode.trim()) errs.postalCode = "Postal Code is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    const errs = {};
    if (!formData.gstNumber.trim()) {
      errs.gstNumber = "GST Number is required.";
    } else if (formData.gstNumber.length < 15) {
      errs.gstNumber = "GST Number must be 15 characters (e.g., 33AAAAA0000A1Z5).";
    }
    if (!formData.panNumber.trim()) {
      errs.panNumber = "PAN Number is required.";
    } else if (formData.panNumber.length < 10) {
      errs.panNumber = "PAN Number must be 10 characters (e.g., ABCDE1234F).";
    }
    if (!formData.companyRegNo.trim()) errs.companyRegNo = "Company Registration Number is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 4 Validation (Documents)
  const validateStep4 = () => {
    const errs = {};
    if (!documents.gstCert) errs.gstCert = "GST Certificate PDF is required.";
    if (!documents.panCard) errs.panCard = "PAN Card PDF/Image is required.";
    if (!documents.companyReg) errs.companyReg = "Company Registration Certificate is required.";
    if (!documents.signatoryId) errs.signatoryId = "Authorized Signatory ID Proof is required.";
    if (!documents.addressProof) errs.addressProof = "Address Proof is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step === 4 && !validateStep4()) return;
    setStep((s) => Math.min(6, s + 1));
  };

  const handleBack = () => {
    setStep((s) => Math.max(1, s - 1));
  };

  // Simulated File Upload handler
  const handleFileUpload = (docKey, file) => {
    if (!file) return;
    setUploadProgress((prev) => ({ ...prev, [docKey]: 10 }));
    let progress = 10;
    const interval = setInterval(() => {
      progress += 30;
      setUploadProgress((prev) => ({ ...prev, [docKey]: Math.min(100, progress) }));
      if (progress >= 100) {
        clearInterval(interval);
        setDocuments((prev) => ({
          ...prev,
          [docKey]: {
            name: file.name,
            size: (file.size / 1024).toFixed(1) + " KB",
            uploadedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        }));
        if (errors[docKey]) setErrors((prev) => ({ ...prev, [docKey]: null }));
      }
    }, 200);
  };

  const handleRemoveDoc = (docKey) => {
    setDocuments((prev) => ({ ...prev, [docKey]: null }));
    setUploadProgress((prev) => ({ ...prev, [docKey]: 0 }));
  };

  // Final Registration Submission
  const handleSubmitRegistration = async () => {
    const regId = "REG-2026-" + Math.floor(1000 + Math.random() * 9000);
    const docsList = Object.keys(documents)
      .filter((k) => documents[k])
      .map((k) => ({ type: k, fileName: documents[k].name }));

    const payload = {
      regId,
      companyName: formData.companyName,
      authorizedPerson: formData.contactPerson,
      contactPerson: formData.contactPerson,
      designation: formData.designation,
      businessType: formData.businessType,
      email: formData.email,
      phone: formData.mobile,
      mobile: formData.mobile,
      address: formData.address1 + (formData.address2 ? ", " + formData.address2 : ""),
      address1: formData.address1,
      city: formData.city,
      state: formData.state,
      pincode: formData.postalCode,
      postalCode: formData.postalCode,
      gstNumber: formData.gstNumber,
      panNumber: formData.panNumber,
      companyRegNo: formData.companyRegNo,
      fuelType: formData.fuelType,
      monthlyConsumption: Number(formData.monthlyConsumption) || 0,
      coordinates: mapPos,
      documents: docsList,
      status: "Pending Review",
    };

    try {
      const res = await registrationApi.createRegistration(payload);
      if (res?.data?.regId) {
        payload.id = res.data.regId;
      } else {
        payload.id = regId;
      }
    } catch (err) {
      console.warn("[Registration] API submission error, saving locally:", err.message);
      payload.id = regId;
    }

    const newRegistration = {
      ...payload,
      submittedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };

    // Save to localStorage
    const existing = JSON.parse(localStorage.getItem("fdms-customer-registrations") || "[]");
    localStorage.setItem("fdms-customer-registrations", JSON.stringify([newRegistration, ...existing]));

    setSubmittedRegId(payload.id || regId);
    setSubmitted(true);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "840px", width: "95%", maxHeight: "90vh", overflowY: "auto", padding: "0" }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: "var(--grad-dark-panel)",
            padding: "20px 24px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(255, 94, 0, 0.15)",
                border: "1px solid rgba(255, 94, 0, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--orange)",
              }}
            >
              <Building2 size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "var(--text)" }}>
                Corporate Fuel Customer Registration
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-dim)" }}>
                B2B Onboarding • Enterprise Logistics Account Verification
              </p>
            </div>
          </div>

          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* =========================================================================
            SUCCESS SCREEN AFTER SUBMISSION
            ========================================================================= */}
        {submitted ? (
          <div style={{ padding: "36px 28px", textAlign: "center", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.15)",
                border: "2px solid var(--green-neon)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--green-neon)",
                margin: "0 auto",
              }}
            >
              <CheckCircle2 size={40} />
            </div>

            <div>
              <span className="badge-tag tag-normal" style={{ background: "rgba(255, 183, 3, 0.15)", color: "var(--amber)", borderColor: "rgba(255, 183, 3, 0.3)" }}>
                <Clock size={13} /> STATUS: PENDING VERIFICATION
              </span>
              <h2 style={{ fontSize: "26px", fontWeight: "800", margin: "10px 0 6px", color: "var(--text)" }}>
                Registration Submitted Successfully!
              </h2>
              <p style={{ fontSize: "14px", color: "var(--text-dim)", maxWidth: "520px", margin: "0 auto" }}>
                Thank you for registering <strong>{formData.companyName}</strong>. Your Reference Application ID is <strong style={{ color: "var(--orange)" }}>{submittedRegId}</strong>.
              </p>
            </div>

            {/* Verification Stepper Flow */}
            <div
              style={{
                background: "var(--panel-alt)",
                border: "1px solid var(--line)",
                borderRadius: "18px",
                padding: "20px",
                margin: "10px 0",
              }}
            >
              <h4 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: "800", color: "var(--text-dim)", textTransform: "uppercase" }}>
                Verification Lifecycle Workflow
              </h4>
              <div className="stepper-track">
                <div className="stepper-node completed">
                  <div className="stepper-icon"><Check size={14} /></div>
                  <span className="stepper-label">Customer Registers</span>
                </div>
                <div className="stepper-node completed">
                  <div className="stepper-icon"><Check size={14} /></div>
                  <span className="stepper-label">Docs Uploaded</span>
                </div>
                <div className="stepper-node active">
                  <div className="stepper-icon"><Clock size={14} /></div>
                  <span className="stepper-label">Admin Review</span>
                </div>
                <div className="stepper-node">
                  <div className="stepper-icon">4</div>
                  <span className="stepper-label">Approved / Rejected</span>
                </div>
                <div className="stepper-node">
                  <div className="stepper-icon">5</div>
                  <span className="stepper-label">Account Activated</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button className="btn-primary" onClick={onClose} style={{ padding: "10px 24px", fontWeight: "800" }}>
                Return to Sign In Screen
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: "24px" }}>
            {/* STEP PROGRESS BAR */}
            <div className="step-timeline-horizontal" style={{ marginBottom: "24px" }}>
              {[
                { num: 1, label: "Company Info" },
                { num: 2, label: "Address & Map" },
                { num: 3, label: "Verification" },
                { num: 4, label: "Documents" },
                { num: 5, label: "Fuel Needs" },
                { num: 6, label: "Review & Submit" },
              ].map((st) => {
                const isDone = st.num < step;
                const isCurrent = st.num === step;
                return (
                  <div key={st.num} className={`tracker-step-node ${isDone ? "completed" : ""} ${isCurrent ? "active" : ""}`}>
                    <div className="tracker-node-circle">{isDone ? <Check size={14} /> : st.num}</div>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: isCurrent ? "var(--orange)" : isDone ? "var(--green-neon)" : "var(--text-dim)" }}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* =========================================================================
                STEP 1: COMPANY INFORMATION
                ========================================================================= */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h4 style={{ margin: 0, fontSize: "15px", color: "var(--orange)", fontWeight: "800" }}>
                  Step 1: Primary Company Details
                </h4>

                <div className="input-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="input-wrapper">
                    <span className="input-label">Company Legal Name *</span>
                    <input
                      name="companyName"
                      type="text"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="e.g. TamilNadu Industrial Corp Ltd"
                      className="input"
                    />
                    {errors.companyName && <small style={{ color: "var(--red)", fontSize: "11px" }}>{errors.companyName}</small>}
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">Business Sector / Type</span>
                    <select name="businessType" value={formData.businessType} onChange={handleChange} className="input">
                      <option value="Manufacturing">Manufacturing & Factories</option>
                      <option value="Healthcare">Healthcare & Hospitals</option>
                      <option value="Logistics">Logistics & Fleet Fleet Depot</option>
                      <option value="Commercial Complex">Commercial IT Parks & Malls</option>
                      <option value="Construction">Infrastructure & Construction</option>
                      <option value="Power & Energy">Power Generation & Captive Plants</option>
                    </select>
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">Contact Person Name *</span>
                    <input
                      name="contactPerson"
                      type="text"
                      value={formData.contactPerson}
                      onChange={handleChange}
                      placeholder="e.g. R. Subramanian"
                      className="input"
                    />
                    {errors.contactPerson && <small style={{ color: "var(--red)", fontSize: "11px" }}>{errors.contactPerson}</small>}
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">Designation</span>
                    <input
                      name="designation"
                      type="text"
                      value={formData.designation}
                      onChange={handleChange}
                      placeholder="e.g. Procurement General Manager"
                      className="input"
                    />
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">Mobile Number *</span>
                    <input
                      name="mobile"
                      type="text"
                      value={formData.mobile}
                      onChange={handleChange}
                      placeholder="9876543210"
                      className="input"
                    />
                    {errors.mobile && <small style={{ color: "var(--red)", fontSize: "11px" }}>{errors.mobile}</small>}
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">Email Address *</span>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="procurement@tncorp.com"
                      className="input"
                    />
                    {errors.email && <small style={{ color: "var(--red)", fontSize: "11px" }}>{errors.email}</small>}
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">Alternate Contact Number</span>
                    <input
                      name="altContact"
                      type="text"
                      value={formData.altContact}
                      onChange={handleChange}
                      placeholder="044-22509800 (Optional)"
                      className="input"
                    />
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">Company Website (Optional)</span>
                    <input
                      name="website"
                      type="text"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://www.tncorp.com"
                      className="input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                STEP 2: BUSINESS ADDRESS & LOCATION MAP
                ========================================================================= */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h4 style={{ margin: 0, fontSize: "15px", color: "var(--orange)", fontWeight: "800" }}>
                  Step 2: Business Address & Fuel Discharge Site Location Pin
                </h4>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="input-wrapper">
                    <span className="input-label">Address Line 1 *</span>
                    <input
                      name="address1"
                      type="text"
                      value={formData.address1}
                      onChange={handleChange}
                      placeholder="Plot 42, SIDCO Industrial Estate"
                      className="input"
                    />
                    {errors.address1 && <small style={{ color: "var(--red)", fontSize: "11px" }}>{errors.address1}</small>}
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">Address Line 2</span>
                    <input
                      name="address2"
                      type="text"
                      value={formData.address2}
                      onChange={handleChange}
                      placeholder="Guindy Road Phase III"
                      className="input"
                    />
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">City *</span>
                    <input name="city" type="text" value={formData.city} onChange={handleChange} className="input" />
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">District</span>
                    <input name="district" type="text" value={formData.district} onChange={handleChange} className="input" />
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">State</span>
                    <input name="state" type="text" value={formData.state} onChange={handleChange} className="input" />
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">Postal Code *</span>
                    <input name="postalCode" type="text" value={formData.postalCode} onChange={handleChange} className="input" />
                  </div>
                </div>

                {/* LEAFLET LOCATION PIN PICKER MAP */}
                <div style={{ marginTop: "10px" }}>
                  <label className="input-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>📍 Click on Map to Pin Exact Fuel Tanker Discharge Site</span>
                    <span style={{ color: "var(--orange)", fontSize: "11px", fontWeight: "700" }}>
                      GPS: {mapPos[0].toFixed(4)}, {mapPos[1].toFixed(4)}
                    </span>
                  </label>
                  <div style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid var(--line)", marginTop: "6px" }}>
                    <MapContainer center={mapPos} zoom={12} zoomControl={false} style={{ width: "100%", height: "200px" }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <LocationPickerMarker position={mapPos} setPosition={setMapPos} />
                    </MapContainer>
                  </div>

                  {/* Auto Address Preview Card */}
                  <div
                    style={{
                      background: "var(--panel-alt)",
                      border: "1px solid var(--line)",
                      borderRadius: "12px",
                      padding: "10px 14px",
                      marginTop: "10px",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <MapPin size={18} style={{ color: "var(--orange)", flexShrink: 0 }} />
                    <div>
                      <strong style={{ color: "var(--text)" }}>Delivery Address Preview:</strong>
                      <div style={{ color: "var(--text-dim)" }}>
                        {formData.address1 || "Plot 42, SIDCO Industrial Estate"}, {formData.address2}, {formData.city}, {formData.state} - {formData.postalCode}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                STEP 3: BUSINESS VERIFICATION
                ========================================================================= */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h4 style={{ margin: 0, fontSize: "15px", color: "var(--orange)", fontWeight: "800" }}>
                  Step 3: Tax & Corporate Legal Verification Details
                </h4>

                <div className="input-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="input-wrapper">
                    <span className="input-label">GSTIN Number (15 Characters) *</span>
                    <input
                      name="gstNumber"
                      type="text"
                      maxLength={15}
                      value={formData.gstNumber}
                      onChange={handleChange}
                      placeholder="e.g. 33AAAAA0000A1Z5"
                      className="input"
                    />
                    {errors.gstNumber && <small style={{ color: "var(--red)", fontSize: "11px" }}>{errors.gstNumber}</small>}
                    <small style={{ color: "var(--text-dim)", fontSize: "11px" }}>Required for B2B GST Tax Credit Invoicing</small>
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">PAN Number (10 Characters) *</span>
                    <input
                      name="panNumber"
                      type="text"
                      maxLength={10}
                      value={formData.panNumber}
                      onChange={handleChange}
                      placeholder="e.g. ABCDE1234F"
                      className="input"
                    />
                    {errors.panNumber && <small style={{ color: "var(--red)", fontSize: "11px" }}>{errors.panNumber}</small>}
                    <small style={{ color: "var(--text-dim)", fontSize: "11px" }}>Permanent Account Number of Company</small>
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">Company Registration / CIN Number *</span>
                    <input
                      name="companyRegNo"
                      type="text"
                      value={formData.companyRegNo}
                      onChange={handleChange}
                      placeholder="e.g. U74999TN2018PTC123456"
                      className="input"
                    />
                    {errors.companyRegNo && <small style={{ color: "var(--red)", fontSize: "11px" }}>{errors.companyRegNo}</small>}
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">Factory / Business License Number (Optional)</span>
                    <input
                      name="businessLicense"
                      type="text"
                      value={formData.businessLicense}
                      onChange={handleChange}
                      placeholder="e.g. TN-FAC-2024-889"
                      className="input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                STEP 4: DOCUMENT UPLOADS
                ========================================================================= */}
            {step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h4 style={{ margin: 0, fontSize: "15px", color: "var(--orange)", fontWeight: "800" }}>
                  Step 4: Upload Verification Certificates & Documents
                </h4>
                <p style={{ margin: "0", fontSize: "12px", color: "var(--text-dim)" }}>
                  Upload valid PDF/Image certificates for admin KYC review.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  {[
                    { key: "gstCert", label: "GST Registration Certificate (PDF) *", required: true },
                    { key: "panCard", label: "Company PAN Card (PDF/Image) *", required: true },
                    { key: "companyReg", label: "Company Incorporation Certificate *", required: true },
                    { key: "signatoryId", label: "Authorized Signatory ID Proof *", required: true },
                    { key: "addressProof", label: "Site Address Proof (Electricity Bill) *", required: true },
                    { key: "tradeLicense", label: "Trade / Factory License (Optional)", required: false },
                  ].map((doc) => {
                    const uploaded = documents[doc.key];
                    const progress = uploadProgress[doc.key] || 0;

                    return (
                      <div
                        key={doc.key}
                        style={{
                          background: "var(--panel-alt)",
                          border: `1px ${errors[doc.key] ? "solid var(--red)" : "dashed var(--line)"}`,
                          borderRadius: "14px",
                          padding: "14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ fontSize: "12px", color: "var(--text)" }}>{doc.label}</strong>
                          {uploaded && <span style={{ fontSize: "10px", color: "var(--green-neon)", fontWeight: "800" }}>✓ UPLOADED</span>}
                        </div>

                        {uploaded ? (
                          <div
                            style={{
                              background: "var(--panel)",
                              border: "1px solid var(--line)",
                              borderRadius: "10px",
                              padding: "10px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <FileText size={18} style={{ color: "var(--orange)" }} />
                              <div>
                                <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text)" }}>{uploaded.name}</div>
                                <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>{uploaded.size} • {uploaded.uploadedAt}</div>
                              </div>
                            </div>
                            <button className="icon-btn" onClick={() => handleRemoveDoc(doc.key)} title="Remove File">
                              <Trash2 size={14} style={{ color: "var(--red)" }} />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <label
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "6px",
                                padding: "14px",
                                background: "var(--panel)",
                                borderRadius: "10px",
                                cursor: "pointer",
                                border: "1px dashed var(--line)",
                              }}
                            >
                              <UploadCloud size={22} style={{ color: "var(--orange)" }} />
                              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>Drag & Drop or Click to Browse PDF/JPG</span>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                style={{ display: "none" }}
                                onChange={(e) => handleFileUpload(doc.key, e.target.files[0])}
                              />
                            </label>
                            {progress > 0 && progress < 100 && (
                              <div className="gauge-bar-outer" style={{ height: "4px", marginTop: "6px" }}>
                                <div className="gauge-bar-fill" style={{ width: `${progress}%`, backgroundColor: "var(--orange)" }}></div>
                              </div>
                            )}
                          </div>
                        )}
                        {errors[doc.key] && <small style={{ color: "var(--red)", fontSize: "11px" }}>{errors[doc.key]}</small>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =========================================================================
                STEP 5: FUEL REQUIREMENTS
                ========================================================================= */}
            {step === 5 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h4 style={{ margin: 0, fontSize: "15px", color: "var(--orange)", fontWeight: "800" }}>
                  Step 5: Bulk Fuel Requirements & Delivery Preferences
                </h4>

                <div className="input-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="input-wrapper">
                    <span className="input-label">Primary Fuel Type Required</span>
                    <select name="fuelType" value={formData.fuelType} onChange={handleChange} className="input">
                      <option value="DSL">High Speed Diesel (DSL)</option>
                      <option value="MS">Motor Spirit Petrol (MS)</option>
                      <option value="LSHS">Low Sulfur Heavy Stock (LSHS)</option>
                    </select>
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">Estimated Monthly Consumption (Litres)</span>
                    <input
                      name="monthlyConsumption"
                      type="number"
                      value={formData.monthlyConsumption}
                      onChange={handleChange}
                      className="input"
                    />
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">Number of Delivery Factory Sites</span>
                    <input
                      name="deliverySites"
                      type="number"
                      value={formData.deliverySites}
                      onChange={handleChange}
                      className="input"
                    />
                  </div>

                  <div className="input-wrapper">
                    <span className="input-label">Preferred Delivery Slot Timing</span>
                    <select name="preferredTiming" value={formData.preferredTiming} onChange={handleChange} className="input">
                      <option value="Morning (06:00 - 10:00 AM)">Morning Slot (06:00 AM - 10:00 AM)</option>
                      <option value="Afternoon (12:00 - 04:00 PM)">Afternoon Slot (12:00 PM - 04:00 PM)</option>
                      <option value="Night Shift (10:00 PM - 02:00 AM)">Night Shift Slot (10:00 PM - 02:00 AM)</option>
                      <option value="Emergency Express (Within 2 hrs)">Emergency Express (2-Hour Rapid Response)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                STEP 6: REVIEW & SUBMIT
                ========================================================================= */}
            {step === 6 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h4 style={{ margin: 0, fontSize: "15px", color: "var(--orange)", fontWeight: "800" }}>
                  Step 6: Final Review & Submission Dossier
                </h4>

                <div
                  style={{
                    background: "var(--panel-alt)",
                    border: "1px solid var(--line)",
                    borderRadius: "16px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                    <div>
                      <span style={{ color: "var(--text-dim)", display: "block" }}>Company Legal Name</span>
                      <strong style={{ color: "var(--text)" }}>{formData.companyName}</strong> ({formData.businessType})
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)", display: "block" }}>Contact Manager</span>
                      <strong style={{ color: "var(--text)" }}>{formData.contactPerson}</strong> ({formData.designation})
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)", display: "block" }}>Mobile & Email</span>
                      <strong style={{ color: "var(--orange)" }}>{formData.mobile}</strong> • {formData.email}
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)", display: "block" }}>Delivery Address</span>
                      <strong style={{ color: "var(--text)" }}>{formData.address1}, {formData.city} - {formData.postalCode}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)", display: "block" }}>GST & PAN</span>
                      <strong>GST: {formData.gstNumber}</strong> • PAN: {formData.panNumber}
                    </div>
                    <div>
                      <span style={{ color: "var(--text-dim)", display: "block" }}>Monthly Volume</span>
                      <strong style={{ color: "var(--green-neon)" }}>{Number(formData.monthlyConsumption).toLocaleString()} L/mo ({formData.fuelType})</strong>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px dashed var(--line)", paddingTop: "12px" }}>
                    <span style={{ color: "var(--text-dim)", fontSize: "12px", display: "block", marginBottom: "6px" }}>
                      Uploaded Document Dossier:
                    </span>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {Object.keys(documents).map((k) => (
                        documents[k] && (
                          <span key={k} className="badge-tag tag-normal" style={{ fontSize: "11px" }}>
                            <FileText size={12} /> {documents[k].name}
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL FOOTER BUTTONS */}
            <div
              style={{
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {step > 1 ? (
                <button className="btn-secondary" onClick={handleBack}>
                  <ChevronLeft size={16} /> Back
                </button>
              ) : (
                <div></div>
              )}

              {step < 6 ? (
                <button className="btn-primary" onClick={handleNext} style={{ fontWeight: "800" }}>
                  Next Step <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  className="btn-primary btn-lg"
                  onClick={handleSubmitRegistration}
                  style={{ backgroundColor: "var(--orange)", borderColor: "var(--orange)", fontWeight: "900" }}
                >
                  <CheckCircle2 size={18} /> Submit Registration
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
