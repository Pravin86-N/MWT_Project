import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Fuel,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Building2,
  ArrowRight,
  Mail,
  Lock,
  Check,
  Smartphone,
  Phone,
  Shield,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { authApi } from "../services/api";
import CompanyRegisterModal from "../components/CompanyRegisterModal";

export default function Login() {
  const navigate = useNavigate();
  const { state, login, loginWithGoogle, loginWithOtp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  // Form fields start completely empty - user must manually enter email & password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Google OAuth Login State
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  // Mobile OTP Login State
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0); // 5 minutes (300 seconds)
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState({ type: "", text: "", preview: "" });

  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // OTP Countdown Timer (5 Minutes Expiry)
  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Role-Based Navigation Routing
  const handleRoleRedirect = useCallback(
    (user) => {
      if (!user) return;
      if (user.role === "Customer") {
        navigate("/customer-portal", { replace: true });
      } else if (user.role === "Driver") {
        navigate("/driver-portal", { replace: true });
      } else {
        // Admin or Depot Manager -> Dashboard
        navigate("/dashboard", { replace: true });
      }
    },
    [navigate]
  );

  // 1. Standard Email + Password Login
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!email.trim() || !password) return;

      const res = await login(email.trim(), password);
      if (res.ok && res.user) {
        handleRoleRedirect(res.user);
      }
    },
    [email, password, login, handleRoleRedirect]
  );

  // 2. Google OAuth Login Handler
  const handleGoogleSubmit = async (emailToUse) => {
    const targetEmail = (emailToUse || googleEmail).trim();
    if (!targetEmail) {
      setGoogleError("Please enter or select a Google account email.");
      return;
    }
    setGoogleLoading(true);
    setGoogleError("");
    const res = await loginWithGoogle({ email: targetEmail });
    setGoogleLoading(false);
    if (res.ok && res.user) {
      setGoogleModalOpen(false);
      handleRoleRedirect(res.user);
    } else {
      setGoogleError(res.error || "Google authentication failed.");
    }
  };

  // 3. Mobile OTP - Send OTP (5 Mins Validity)
  const handleSendOtp = async () => {
    const digits = mobile.replace(/\D/g, "");
    if (!digits || digits.length < 10) {
      setOtpMessage({ type: "error", text: "Please enter a valid 10-digit registered mobile number.", preview: "" });
      return;
    }
    setOtpLoading(true);
    setOtpMessage({ type: "", text: "", preview: "" });
    try {
      const res = await authApi.sendOtp(mobile.trim());
      setOtpSent(true);
      setOtpTimer(300); // 5 minutes expiry
      setOtpMessage({
        type: "success",
        text: res.message || "OTP sent successfully. Valid for 5 minutes.",
        preview: res.otpPreview,
      });
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Failed to send OTP.";
      setOtpMessage({ type: "error", text: errMsg, preview: "" });
    } finally {
      setOtpLoading(false);
    }
  };

  // 4. Mobile OTP - Verify OTP & Sign In
  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      setOtpMessage({ type: "error", text: "Please enter the complete 6-digit OTP code.", preview: "" });
      return;
    }
    if (otpTimer === 0 && otpSent) {
      setOtpMessage({ type: "error", text: "OTP has expired (validity is 5 minutes). Please click Resend OTP.", preview: "" });
      return;
    }
    setOtpLoading(true);
    setOtpMessage({ type: "", text: "", preview: "" });
    const res = await loginWithOtp(mobile.trim(), otp.trim());
    setOtpLoading(false);
    if (res.ok && res.user) {
      handleRoleRedirect(res.user);
    } else {
      setOtpMessage({ type: "error", text: res.error || "OTP verification failed.", preview: "" });
    }
  };

  return (
    <div className="saas-auth-page">
      {/* Top Floating Theme Switcher */}
      <button
        className="icon-btn theme-fab"
        onClick={toggleTheme}
        title={t("toggleTheme")}
        style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 50,
          boxShadow: "var(--shadow-md)",
        }}
      >
        {theme === "dark" ? <Sun size={20} style={{ color: "var(--amber)" }} /> : <Moon size={20} style={{ color: "var(--blue)" }} />}
      </button>

      <div className="saas-auth-container">
        {/* ==========================================
            LEFT COLUMN (55% Width Feature & Graphics)
           ========================================== */}
        <div className="saas-auth-left">
          <div className="saas-brand-header">
            <div className="saas-brand-badge">
              <div className="saas-brand-icon">
                <Fuel size={28} />
              </div>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "800",
                  color: "var(--orange)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                FDMS LOGISTICS PLATFORM
              </span>
            </div>
            <h1 className="saas-brand-title">Smart Fuel Dispatch & Fleet Telemetry System</h1>
            <p className="saas-brand-tagline">
              Automated tank inventory monitoring, real-time GPS fleet tracking, and instant delivery dispatch management for enterprise fuel logistics.
            </p>
          </div>

          {/* Animated Fuel Tanker Graphics Banner */}
          <div className="truck-graphic-container">
            <div className="truck-radar-bg">
              <div className="truck-radar-ring r1"></div>
              <div className="truck-radar-ring r2"></div>
            </div>

            {/* Custom Animated Fuel Truck SVG */}
            <svg
              className="truck-svg-anim"
              viewBox="0 0 300 160"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Truck Body Shadow */}
              <ellipse cx="150" cy="142" rx="110" ry="10" fill="rgba(0,0,0,0.3)" />

              {/* Tank Body */}
              <rect x="50" y="45" width="140" height="65" rx="30" fill="url(#tankGrad)" />
              <path d="M50 75 Q120 65 190 75 L190 110 Q120 110 50 110 Z" fill="rgba(255,255,255,0.15)" />

              {/* Tank Stripes */}
              <rect x="75" y="45" width="6" height="65" fill="rgba(255,255,255,0.25)" />
              <rect x="135" y="45" width="6" height="65" fill="rgba(255,255,255,0.25)" />

              {/* Fuel Level Waves */}
              <path d="M60 85 Q90 80 120 85 T180 85 L180 100 L60 100 Z" fill="url(#fuelGrad)" opacity="0.8" />

              {/* Cabin */}
              <path d="M190 60 H225 L245 85 V110 H190 V60 Z" fill="#0F172A" stroke="var(--orange)" strokeWidth="2" />
              <path d="M200 68 H220 L232 85 H200 V68 Z" fill="#38BDF8" opacity="0.8" />

              {/* Wheels */}
              <circle cx="85" cy="115" r="16" fill="#1E293B" stroke="var(--orange)" strokeWidth="3" />
              <circle cx="85" cy="115" r="6" fill="#F8FAFC" />
              <circle cx="155" cy="115" r="16" fill="#1E293B" stroke="var(--orange)" strokeWidth="3" />
              <circle cx="155" cy="115" r="6" fill="#F8FAFC" />
              <circle cx="215" cy="115" r="16" fill="#1E293B" stroke="var(--orange)" strokeWidth="3" />
              <circle cx="215" cy="115" r="6" fill="#F8FAFC" />

              {/* Headlight Beam */}
              <polygon points="245,90 290,75 290,115 245,100" fill="url(#lightBeam)" opacity="0.6" />

              {/* Gradients */}
              <defs>
                <linearGradient id="tankGrad" x1="50" y1="45" x2="190" y2="110" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FF5E00" />
                  <stop offset="1" stopColor="#FFB703" />
                </linearGradient>
                <linearGradient id="fuelGrad" x1="60" y1="85" x2="180" y2="100" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00E676" />
                  <stop offset="1" stopColor="#10B981" />
                </linearGradient>
                <linearGradient id="lightBeam" x1="245" y1="95" x2="290" y2="95" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFD166" stopOpacity="0.8" />
                  <stop offset="1" stopColor="#FFD166" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Feature Highlights Grid */}
          <div className="saas-features-grid">
            <div className="saas-feature-item">
              <div className="saas-feature-check">
                <Check size={16} />
              </div>
              <span>Live Fleet Tracking</span>
            </div>
            <div className="saas-feature-item">
              <div className="saas-feature-check">
                <Check size={16} />
              </div>
              <span>Smart Fuel Dispatch</span>
            </div>
            <div className="saas-feature-item">
              <div className="saas-feature-check">
                <Check size={16} />
              </div>
              <span>Inventory Monitoring</span>
            </div>
            <div className="saas-feature-item">
              <div className="saas-feature-check">
                <Check size={16} />
              </div>
              <span>Real-Time Analytics</span>
            </div>
          </div>
        </div>

        {/* ==========================================
            RIGHT COLUMN (45% Centered Glass Card)
           ========================================== */}
        <div className="saas-auth-right">
          <form className="glass-auth-card" onSubmit={handleSubmit}>
            {/* Card Header */}
            <div className="auth-card-head">
              <div className="auth-card-logo">
                <Fuel size={24} />
              </div>
              <h2>Welcome back</h2>
              <p>Sign in to your FDMS dispatch portal</p>
            </div>

            {/* Input Form Fields */}
            <div className="input-wrapper">
              <span className="input-label">Email address</span>
              <div className="input-field-box">
                <Mail size={18} className="input-icon" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            <div className="input-wrapper">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="input-label">Password</span>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Please contact your system administrator to reset your password.");
                  }}
                  style={{ fontSize: "12px", color: "var(--orange)", textDecoration: "none", fontWeight: "600" }}
                >
                  Forgot password?
                </a>
              </div>
              <div className="input-field-box">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
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

            {/* Invalid Credentials Banner */}
            {state.status === "error" && (
              <div className="auth-error" style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "10px" }}>
                {state.error || t("invalidCredentials")}
              </div>
            )}

            {/* Primary Submit Button */}
            <button type="submit" className="saas-submit-btn" disabled={state.status === "loading"}>
              <span>{state.status === "loading" ? t("signingIn") : "Sign In to Dashboard"}</span>
              <ArrowRight size={18} />
            </button>

            {/* Additional Authentication Options Divider */}
            <div className="auth-divider" style={{ margin: "4px 0" }}>
              <span>Or continue with</span>
            </div>

            {/* 1. Continue with Google */}
            <button
              type="button"
              className="google-btn"
              onClick={() => {
                setGoogleError("");
                setGoogleModalOpen(true);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* 2. Login with Mobile OTP */}
            <button
              type="button"
              className="btn-secondary full"
              onClick={() => {
                setShowOtpSection(!showOtpSection);
                setOtpMessage({ type: "", text: "", preview: "" });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontWeight: "700",
                fontSize: "13px",
                height: "50px",
                borderRadius: "12px",
                borderColor: showOtpSection ? "var(--orange)" : "var(--line)",
                background: showOtpSection ? "rgba(255, 94, 0, 0.06)" : "transparent",
                color: showOtpSection ? "var(--orange)" : "var(--text)",
              }}
            >
              <Smartphone size={18} />
              <span>{showOtpSection ? "Hide Mobile OTP" : "Login with Mobile OTP"}</span>
            </button>

            {/* Mobile OTP Section (Collapsible) */}
            {showOtpSection && (
              <div
                style={{
                  background: "var(--panel-alt)",
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  marginTop: "-6px",
                }}
              >
                {/* OTP Feedback Alert Banner */}
                {otpMessage.text && (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "600",
                      background: otpMessage.type === "error" ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                      color: otpMessage.type === "error" ? "var(--red, #ef4444)" : "var(--green, #10b981)",
                      border: `1px solid ${otpMessage.type === "error" ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                    }}
                  >
                    <div>{otpMessage.text}</div>
                    {otpMessage.preview && (
                      <div style={{ marginTop: "4px", color: "var(--orange)", fontWeight: "800" }}>
                        🔑 Verification OTP: {otpMessage.preview}
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile Number Input with Send OTP Button */}
                <div className="input-wrapper">
                  <span className="input-label" style={{ fontSize: "12px" }}>Registered Mobile Number</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div className="input-field-box" style={{ flex: 1, height: "46px" }}>
                      <Phone size={16} className="input-icon" />
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="+91 98401 23456"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSendOtp}
                      disabled={otpLoading || (otpTimer > 0 && otpSent)}
                      style={{
                        height: "46px",
                        padding: "0 14px",
                        fontSize: "12px",
                        fontWeight: "700",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {otpLoading ? "Sending..." : otpSent ? (otpTimer > 0 ? `Resend (${otpTimer}s)` : "Resend") : "Send OTP"}
                    </button>
                  </div>
                </div>

                {/* 6-Digit OTP Input Field and Verify Button */}
                {otpSent && (
                  <div className="input-wrapper">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="input-label" style={{ fontSize: "12px" }}>Enter 6-Digit OTP</span>
                      <span style={{ fontSize: "11px", color: otpTimer > 0 ? "var(--orange)" : "var(--red, #ef4444)", fontWeight: "700" }}>
                        {otpTimer > 0 ? `Expires in ${formatTimer(otpTimer)} (5 mins)` : "Expired"}
                      </span>
                    </div>
                    <div className="input-field-box" style={{ height: "46px" }}>
                      <Shield size={16} className="input-icon" />
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••••"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleVerifyOtp}
                      disabled={otpLoading || otp.trim().length !== 6}
                      style={{
                        height: "44px",
                        width: "100%",
                        fontSize: "13px",
                        fontWeight: "800",
                        marginTop: "4px",
                        background: "var(--grad-flame)",
                      }}
                    >
                      {otpLoading ? "Verifying..." : "Verify OTP & Sign In"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* B2B Customer Registration Toggle */}
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed var(--line)", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Don't have an account?</span>
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--orange)",
                    fontWeight: "800",
                    cursor: "pointer",
                    fontSize: "12px",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  Sign Up (Register)
                </button>
              </div>
              <button
                type="button"
                className="btn-secondary full"
                onClick={() => navigate("/register")}
                style={{ fontWeight: "800", borderColor: "var(--orange)", color: "var(--orange)", gap: "8px" }}
              >
                <Building2 size={16} /> Register Corporate Account
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Google OAuth Account Selection Modal */}
      {googleModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setGoogleModalOpen(false)}
        >
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "20px",
              padding: "28px 24px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "var(--shadow-xl)",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "var(--text)" }}>Sign in with Google</h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-dim)" }}>Choose account to continue to FDMS Logistics</p>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setGoogleModalOpen(false)}
                style={{ padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Google Error Banner */}
            {googleError && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "var(--red, #ef4444)",
                  fontSize: "12px",
                  fontWeight: "600",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                {googleError}
              </div>
            )}

            {/* Quick Role Selection for Google OAuth */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-dim)", textTransform: "uppercase" }}>
                Select Existing System Account
              </span>
              {[
                { label: "Admin", email: "admin@fdms.com", portal: "Admin Dashboard" },
                { label: "Depot Manager", email: "pravin@123", portal: "Depot Manager Dashboard" },
                { label: "Driver", email: "driver@fdms.com", portal: "Driver Dashboard" },
                { label: "Customer", email: "customer@fdms.com", portal: "Customer Dashboard" },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleGoogleSubmit(acc.email)}
                  disabled={googleLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid var(--line)",
                    background: "var(--panel-alt)",
                    color: "var(--text)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--orange)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
                >
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "13px" }}>{acc.label}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{acc.email}</div>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--orange)", fontWeight: "600" }}>{acc.portal}</span>
                </button>
              ))}
            </div>

            {/* Custom Google Email Input */}
            <div className="input-wrapper" style={{ borderTop: "1px dashed var(--line)", paddingTop: "14px" }}>
              <span className="input-label" style={{ fontSize: "12px" }}>Or enter another Google account email</span>
              <div className="input-field-box" style={{ height: "44px" }}>
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="name@gmail.com"
                />
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleGoogleSubmit()}
                disabled={googleLoading || !googleEmail.trim()}
                style={{
                  height: "44px",
                  fontSize: "13px",
                  fontWeight: "700",
                  marginTop: "8px",
                  background: "var(--grad-flame)",
                }}
              >
                {googleLoading ? "Connecting..." : "Continue with Google Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CompanyRegisterModal open={registerModalOpen} onClose={() => setRegisterModalOpen(false)} />
    </div>
  );
}
