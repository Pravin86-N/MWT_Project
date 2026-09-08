import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  User,
  MapPin,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Fuel,
  ArrowRight,
  Sun,
  Moon,
  ShieldCheck,
} from "lucide-react";
import { registrationApi } from "../services/api";
import { useTheme } from "../context/ThemeContext";

export default function Register() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Account Information
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Company Information
  const [companyName, setCompanyName] = useState("");
  const [authorizedPersonName, setAuthorizedPersonName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Chennai");
  const [state, setState] = useState("Tamil Nadu");
  const [pincode, setPincode] = useState("600001");

  // Document Uploads
  const [panDocument, setPanDocument] = useState(null);
  const [gstCertificate, setGstCertificate] = useState(null);
  const [companyRegistrationCertificate, setCompanyRegistrationCertificate] = useState(null);
  const [addressProof, setAddressProof] = useState(null);
  const [additionalSupportingDocuments, setAdditionalSupportingDocuments] = useState(null);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Form Validation
    if (!email.trim() || !password || !confirmPassword) {
      setError("Please complete all Account Information fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (
      !companyName.trim() ||
      !authorizedPersonName.trim() ||
      !mobileNumber.trim() ||
      !gstNumber.trim() ||
      !panNumber.trim() ||
      !address.trim()
    ) {
      setError("Please complete all required Company Information fields.");
      return;
    }

    // Build FormData payload
    const formData = new FormData();
    formData.append("email", email.trim());
    formData.append("password", password);
    formData.append("confirmPassword", confirmPassword);
    formData.append("companyName", companyName.trim());
    formData.append("authorizedPerson", authorizedPersonName.trim());
    formData.append("authorizedPersonName", authorizedPersonName.trim());
    formData.append("mobile", mobileNumber.trim());
    formData.append("mobileNumber", mobileNumber.trim());
    formData.append("phone", mobileNumber.trim());
    formData.append("gstNumber", gstNumber.toUpperCase().trim());
    formData.append("panNumber", panNumber.toUpperCase().trim());
    formData.append("address", address.trim());
    formData.append("city", city.trim());
    formData.append("state", state.trim());
    formData.append("pincode", pincode.trim());

    // Append Document Uploads
    if (panDocument) formData.append("panDocument", panDocument);
    if (gstCertificate) formData.append("gstCertificate", gstCertificate);
    if (companyRegistrationCertificate)
      formData.append("companyRegistrationCertificate", companyRegistrationCertificate);
    if (addressProof) formData.append("addressProof", addressProof);
    if (additionalSupportingDocuments)
      formData.append("additionalSupportingDocuments", additionalSupportingDocuments);

    try {
      setLoading(true);
      const res = await registrationApi.createRegistration(formData);
      const msg =
        res?.message ||
        "Your registration request has been submitted successfully and is awaiting approval.";
      setSuccessMessage(msg);
      setSubmitted(true);
    } catch (err) {
      console.error("[Registration Error]:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to submit customer registration request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-auth-page" style={{ minHeight: "100vh", padding: "30px 16px" }}>
      {/* Top Floating Theme Switcher */}
      <button
        className="icon-btn theme-fab"
        onClick={toggleTheme}
        title="Toggle Theme"
        style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 50,
          boxShadow: "var(--shadow-md)",
        }}
      >
        {theme === "dark" ? (
          <Sun size={20} style={{ color: "var(--amber)" }} />
        ) : (
          <Moon size={20} style={{ color: "var(--blue)" }} />
        )}
      </button>

      <div style={{ maxWidth: "780px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "6px 14px",
              background: "var(--panel-alt)",
              borderRadius: "999px",
              border: "1px solid var(--line)",
              marginBottom: "12px",
            }}
          >
            <Fuel size={18} style={{ color: "var(--orange)" }} />
            <span
              style={{
                fontSize: "12px",
                fontWeight: "800",
                color: "var(--orange)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              FDMS B2B Customer Portal
            </span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", margin: "0 0 6px", color: "var(--text)" }}>
            Corporate Customer Registration
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-dim)", margin: 0 }}>
            Submit your corporate details and compliance documents for verification and account activation.
          </p>
        </div>

        {/* Success Confirmation Card */}
        {submitted ? (
          <div
            className="card"
            style={{
              padding: "40px 30px",
              textAlign: "center",
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.15)",
                color: "var(--green-neon)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text)", margin: "0 0 12px" }}>
              Application Submitted Successfully
            </h2>

            <div
              style={{
                padding: "16px 20px",
                background: "var(--panel-alt)",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                margin: "0 auto 24px",
                maxWidth: "540px",
                fontSize: "15px",
                fontWeight: "600",
                color: "var(--orange)",
                lineHeight: "1.5",
              }}
            >
              "Your registration request has been submitted successfully and is awaiting approval."
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-dim)", maxWidth: "480px", margin: "0 auto 28px" }}>
              Our Admin and Depot Operations team will review your company credentials and uploaded KYC documents. Once approved, you will be notified and your login will be activated.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <button
                type="button"
                className="saas-submit-btn"
                style={{ width: "auto", padding: "12px 28px" }}
                onClick={() => navigate("/login")}
              >
                <span>Return to Login</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ) : (
          /* Main Registration Form Card */
          <form
            onSubmit={handleSubmit}
            className="card"
            style={{
              padding: "32px",
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              boxShadow: "var(--shadow-lg)",
              display: "flex",
              flexDirection: "column",
              gap: "28px",
            }}
          >
            {error && (
              <div
                className="auth-error"
                style={{
                  fontSize: "13px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* SECTION 1: ACCOUNT INFORMATION */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  paddingBottom: "10px",
                  borderBottom: "1px solid var(--line)",
                  marginBottom: "16px",
                }}
              >
                <Lock size={20} style={{ color: "var(--orange)" }} />
                <h2 style={{ fontSize: "17px", fontWeight: "700", margin: 0, color: "var(--text)" }}>
                  Account Information
                </h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                {/* Email */}
                <div className="input-wrapper">
                  <span className="input-label">Email Address *</span>
                  <div className="input-field-box">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="corporate@company.com"
                      required
                    />
                  </div>
                </div>

                {/* Passwords in 2 columns */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {/* Password */}
                  <div className="input-wrapper">
                    <span className="input-label">Password *</span>
                    <div className="input-field-box">
                      <Lock size={18} className="input-icon" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="eye-toggle-btn"
                        onClick={() => setShowPassword((s) => !s)}
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="input-wrapper">
                    <span className="input-label">Confirm Password *</span>
                    <div className="input-field-box">
                      <Lock size={18} className="input-icon" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="eye-toggle-btn"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: COMPANY INFORMATION */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  paddingBottom: "10px",
                  borderBottom: "1px solid var(--line)",
                  marginBottom: "16px",
                }}
              >
                <Building2 size={20} style={{ color: "var(--orange)" }} />
                <h2 style={{ fontSize: "17px", fontWeight: "700", margin: 0, color: "var(--text)" }}>
                  Company Information
                </h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Company Name */}
                <div className="input-wrapper" style={{ gridColumn: "span 2" }}>
                  <span className="input-label">Company Name *</span>
                  <div className="input-field-box">
                    <Building2 size={18} className="input-icon" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Apex Industrial Manufacturing Ltd"
                      required
                    />
                  </div>
                </div>

                {/* Authorized Person Name */}
                <div className="input-wrapper">
                  <span className="input-label">Authorized Person Name *</span>
                  <div className="input-field-box">
                    <User size={18} className="input-icon" />
                    <input
                      type="text"
                      value={authorizedPersonName}
                      onChange={(e) => setAuthorizedPersonName(e.target.value)}
                      placeholder="Full Name (Director / Officer)"
                      required
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="input-wrapper">
                  <span className="input-label">Mobile Number *</span>
                  <div className="input-field-box">
                    <Phone size={18} className="input-icon" />
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="+91 98400 12345"
                      required
                    />
                  </div>
                </div>

                {/* GST Number */}
                <div className="input-wrapper">
                  <span className="input-label">GST Number *</span>
                  <div className="input-field-box">
                    <ShieldCheck size={18} className="input-icon" />
                    <input
                      type="text"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                      placeholder="33AAAAA0000A1Z5"
                      maxLength={15}
                      required
                    />
                  </div>
                </div>

                {/* PAN Number */}
                <div className="input-wrapper">
                  <span className="input-label">PAN Number *</span>
                  <div className="input-field-box">
                    <FileText size={18} className="input-icon" />
                    <input
                      type="text"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="input-wrapper" style={{ gridColumn: "span 2" }}>
                  <span className="input-label">Registered Address *</span>
                  <div className="input-field-box">
                    <MapPin size={18} className="input-icon" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street / Industrial Estate / Site Address"
                      required
                    />
                  </div>
                </div>

                {/* City, State, Pincode */}
                <div className="input-wrapper">
                  <span className="input-label">City</span>
                  <div className="input-field-box">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                    />
                  </div>
                </div>

                <div className="input-wrapper">
                  <span className="input-label">State</span>
                  <div className="input-field-box">
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: DOCUMENT UPLOADS */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  paddingBottom: "10px",
                  borderBottom: "1px solid var(--line)",
                  marginBottom: "16px",
                }}
              >
                <Upload size={20} style={{ color: "var(--orange)" }} />
                <h2 style={{ fontSize: "17px", fontWeight: "700", margin: 0, color: "var(--text)" }}>
                  Document Uploads
                </h2>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-dim)", margin: "0 0 14px" }}>
                Accepted formats: PDF, PNG, JPG (Max 10MB per file). Documents will be audited by Operations.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* 1. PAN Document */}
                <div
                  style={{
                    padding: "14px",
                    background: "var(--panel-alt)",
                    borderRadius: "10px",
                    border: "1px dashed var(--line)",
                  }}
                >
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--text)", marginBottom: "6px" }}>
                    PAN Document *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setPanDocument(e.target.files[0] || null)}
                    style={{ fontSize: "12px", width: "100%" }}
                  />
                  {panDocument && (
                    <small style={{ color: "var(--green-neon)", display: "block", marginTop: "4px" }}>
                      ✓ {panDocument.name}
                    </small>
                  )}
                </div>

                {/* 2. GST Certificate */}
                <div
                  style={{
                    padding: "14px",
                    background: "var(--panel-alt)",
                    borderRadius: "10px",
                    border: "1px dashed var(--line)",
                  }}
                >
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--text)", marginBottom: "6px" }}>
                    GST Certificate *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setGstCertificate(e.target.files[0] || null)}
                    style={{ fontSize: "12px", width: "100%" }}
                  />
                  {gstCertificate && (
                    <small style={{ color: "var(--green-neon)", display: "block", marginTop: "4px" }}>
                      ✓ {gstCertificate.name}
                    </small>
                  )}
                </div>

                {/* 3. Company Registration Certificate */}
                <div
                  style={{
                    padding: "14px",
                    background: "var(--panel-alt)",
                    borderRadius: "10px",
                    border: "1px dashed var(--line)",
                  }}
                >
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--text)", marginBottom: "6px" }}>
                    Company Registration Certificate *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) =>
                      setCompanyRegistrationCertificate(e.target.files[0] || null)
                    }
                    style={{ fontSize: "12px", width: "100%" }}
                  />
                  {companyRegistrationCertificate && (
                    <small style={{ color: "var(--green-neon)", display: "block", marginTop: "4px" }}>
                      ✓ {companyRegistrationCertificate.name}
                    </small>
                  )}
                </div>

                {/* 4. Address Proof */}
                <div
                  style={{
                    padding: "14px",
                    background: "var(--panel-alt)",
                    borderRadius: "10px",
                    border: "1px dashed var(--line)",
                  }}
                >
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--text)", marginBottom: "6px" }}>
                    Address Proof *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setAddressProof(e.target.files[0] || null)}
                    style={{ fontSize: "12px", width: "100%" }}
                  />
                  {addressProof && (
                    <small style={{ color: "var(--green-neon)", display: "block", marginTop: "4px" }}>
                      ✓ {addressProof.name}
                    </small>
                  )}
                </div>

                {/* 5. Additional Supporting Documents */}
                <div
                  style={{
                    gridColumn: "span 2",
                    padding: "14px",
                    background: "var(--panel-alt)",
                    borderRadius: "10px",
                    border: "1px dashed var(--line)",
                  }}
                >
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--text)", marginBottom: "6px" }}>
                    Additional Supporting Documents (Optional)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) =>
                      setAdditionalSupportingDocuments(e.target.files[0] || null)
                    }
                    style={{ fontSize: "12px", width: "100%" }}
                  />
                  {additionalSupportingDocuments && (
                    <small style={{ color: "var(--green-neon)", display: "block", marginTop: "4px" }}>
                      ✓ {additionalSupportingDocuments.name}
                    </small>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "10px" }}>
              <button type="submit" className="saas-submit-btn" disabled={loading}>
                <span>{loading ? "Submitting Application..." : "Submit Registration Application"}</span>
                <ArrowRight size={18} />
              </button>

              <div style={{ textAlign: "center", fontSize: "13px", color: "var(--text-dim)" }}>
                Already registered?{" "}
                <Link to="/login" style={{ color: "var(--orange)", fontWeight: "700", textDecoration: "none" }}>
                  Sign in here
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
