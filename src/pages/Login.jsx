import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { GoogleLogin } from "@react-oauth/google";
import { authApi } from "../services/api";
import CompanyRegisterModal from "../components/CompanyRegisterModal";

export default function Login() {
  const navigate = useNavigate();
  const { state, login, loginWithGoogle, loginWithOtp, loginWithEmailOtp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  // Form fields start completely empty - user must manually enter email & password
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Google OAuth Login State
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  // OTP Login Mode: "email" (default per requirements) | "mobile"
  const [showOtpSection, setShowOtpSection] = useState(false);
  const [otpMode, setOtpMode] = useState("email");
  const [otpEmail, setOtpEmail] = useState("");
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
      const role = (user.role || "").toLowerCase();
      if (role === "customer") {
        navigate("/customer-portal", { replace: true });
      } else if (role === "driver") {
        navigate("/driver-portal", { replace: true });
      } else {
        // Admin or Depot Manager -> Dashboard
        navigate("/dashboard", { replace: true });
      }
    },
    [navigate]
  );

  // If already authenticated, redirect to appropriate role dashboard
  useEffect(() => {
    if (state.status === "authenticated" && state.user) {
      console.log("[Auth] User already authenticated. Redirecting to dashboard...");
      handleRoleRedirect(state.user);
    }
  }, [state.status, state.user, handleRoleRedirect]);

  // 1. Standard Email + Password Login
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setLoginError("");

      if (!email.trim() || !password) {
        setLoginError("Please enter both email and password.");
        return;
      }

      console.log("[Auth] Login request sent:", { email: email.trim() });
      const res = await login(email.trim(), password);
      console.log("[Auth] Login response received:", res);

      if (res.ok && res.user) {
        const role = (res.user.role || "").toLowerCase();
        const targetPath =
          role === "customer"
            ? "/customer-portal"
            : role === "driver"
            ? "/driver-portal"
            : "/dashboard";

        console.log("[Auth] User role:", res.user.role);
        console.log("[Auth] Token stored:", !!(res.token || res.user.token));
        console.log("[Auth] Redirect target:", targetPath);

        handleRoleRedirect(res.user);
      } else {
        const errMsg = res.error || state.error || "Authentication failed. Please check your credentials.";
        console.warn("[Auth] Login failed:", errMsg);
        setLoginError(errMsg);
      }
    },
    [email, password, login, handleRoleRedirect, state.error]
  );

  // 2. Real Google Identity Credential Handler
  const handleGoogleCredentialResponse = useCallback(
    async (response) => {
      if (!response || !response.credential) return;
      setGoogleLoading(true);
      setGoogleError("");
      const res = await loginWithGoogle({ credential: response.credential });
      setGoogleLoading(false);
      if (res.ok && res.user) {
        handleRoleRedirect(res.user);
      } else {
        setGoogleError(res.error || "Google authentication failed.");
      }
    },
    [loginWithGoogle, handleRoleRedirect]
  );

  // Initialize Google Identity Services if client SDK loaded in window
  useEffect(() => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "834977368397-qaip36ga1e6or3gujguc950kkajb4vjd.apps.googleusercontent.com",
          callback: handleGoogleCredentialResponse,
        });
      } catch (e) {
        console.warn("[Google Identity] Initialization:", e.message);
      }
    }
  }, [handleGoogleCredentialResponse]);

  // 3. Email OTP - Send OTP (5 Mins Validity)
  const handleSendEmailOtp = async () => {
    if (!otpEmail.trim()) {
      setOtpMessage({ type: "error", text: "Please enter your registered email address.", preview: "" });
      return;
    }
    setOtpLoading(true);
    setOtpMessage({ type: "", text: "", preview: "" });
    try {
      const res = await authApi.sendLoginOtp(otpEmail.trim());
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

  // 4. Email OTP - Verify OTP & Sign In (Max 5 Attempts)
  const handleVerifyEmailOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      setOtpMessage({ type: "error", text: "Please enter the complete 6-digit OTP code.", preview: "" });
      return;
    }
    if (otpTimer === 0 && otpSent) {
      setOtpMessage({ type: "error", text: "OTP has expired (validity is 5 minutes). Please request a new OTP.", preview: "" });
      return;
    }
    setOtpLoading(true);
    setOtpMessage({ type: "", text: "", preview: "" });
    const res = await loginWithEmailOtp(otpEmail.trim(), otp.trim());
    setOtpLoading(false);
    if (res.ok && res.user) {
      handleRoleRedirect(res.user);
    } else {
      setOtpMessage({ type: "error", text: res.error || "OTP verification failed.", preview: "" });
    }
  };

  // 5. Mobile OTP - Send OTP (5 Mins Validity)
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

  // 6. Mobile OTP - Verify OTP & Sign In
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
                <Link
                  to="/forgot-password"
                  style={{ fontSize: "12px", color: "var(--orange)", textDecoration: "none", fontWeight: "600" }}
                >
                  Forgot password?
                </Link>
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
            {(loginError || state.status === "error") && (
              <div className="auth-error" style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "10px" }}>
                {loginError || state.error || t("invalidCredentials")}
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

            {/* 1. Continue with Google (Real Google Sign-In) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  width: "100%",
                  minHeight: "44px",
                }}
              >
                <GoogleLogin
                  onSuccess={handleGoogleCredentialResponse}
                  onError={() => setGoogleError("Google login failed. Please try again.")}
                  theme={theme === "dark" ? "filled_black" : "outline"}
                  size="large"
                  text="continue_with"
                  shape="rectangular"
                  width="380"
                />
              </div>

              {googleError && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "rgba(239, 68, 68, 0.12)",
                    color: "var(--red, #ef4444)",
                    fontSize: "13px",
                    fontWeight: "600",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Shield size={16} />
                  <span>{googleError}</span>
                </div>
              )}
            </div>

            {/* 2. Login with OTP (Email OTP / Mobile OTP) */}
            <button
              type="button"
              className="btn-secondary full"
              onClick={() => {
                setShowOtpSection(!showOtpSection);
                setOtpMessage({ type: "", text: "", preview: "" });
                setOtp("");
                setOtpSent(false);
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
              <span>{showOtpSection ? "Hide OTP Login" : "Login with OTP"}</span>
            </button>

            {/* OTP Section (Collapsible) */}
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
                {/* Mode Selector Tabs: Email OTP (Default) vs Mobile OTP */}
                <div style={{ display: "flex", gap: "6px", background: "var(--panel)", padding: "4px", borderRadius: "10px", border: "1px solid var(--line)" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpMode("email");
                      setOtp("");
                      setOtpSent(false);
                      setOtpMessage({ type: "", text: "", preview: "" });
                    }}
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: "7px",
                      fontSize: "12px",
                      fontWeight: "700",
                      border: "none",
                      cursor: "pointer",
                      background: otpMode === "email" ? "var(--orange)" : "transparent",
                      color: otpMode === "email" ? "#FFFFFF" : "var(--text-dim)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Email OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpMode("mobile");
                      setOtp("");
                      setOtpSent(false);
                      setOtpMessage({ type: "", text: "", preview: "" });
                    }}
                    style={{
                      flex: 1,
                      padding: "6px 12px",
                      borderRadius: "7px",
                      fontSize: "12px",
                      fontWeight: "700",
                      border: "none",
                      cursor: "pointer",
                      background: otpMode === "mobile" ? "var(--orange)" : "transparent",
                      color: otpMode === "mobile" ? "#FFFFFF" : "var(--text-dim)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Mobile OTP
                  </button>
                </div>

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

                {/* EMAIL OTP FLOW */}
                {otpMode === "email" && (
                  <>
                    <div className="input-wrapper">
                      <span className="input-label" style={{ fontSize: "12px" }}>Registered Email Address</span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <div className="input-field-box" style={{ flex: 1, height: "46px" }}>
                          <Mail size={16} className="input-icon" />
                          <input
                            type="email"
                            value={otpEmail}
                            onChange={(e) => setOtpEmail(e.target.value)}
                            placeholder="user@company.com"
                          />
                        </div>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={handleSendEmailOtp}
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

                    {otpSent && (
                      <div className="input-wrapper">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="input-label" style={{ fontSize: "12px" }}>Enter 6-Digit Email OTP</span>
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
                          onClick={handleVerifyEmailOtp}
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
                  </>
                )}

                {/* MOBILE OTP FLOW */}
                {otpMode === "mobile" && (
                  <>
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

                    {otpSent && (
                      <div className="input-wrapper">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="input-label" style={{ fontSize: "12px" }}>Enter 6-Digit Mobile OTP</span>
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
                  </>
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



      <CompanyRegisterModal open={registerModalOpen} onClose={() => setRegisterModalOpen(false)} />
    </div>
  );
}
