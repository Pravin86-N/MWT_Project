import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Fuel,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Shield,
  Building2,
  ArrowRight,
  Mail,
  Lock,
  Check,
  Truck,
  KeyRound,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import CompanyRegisterModal from "../components/CompanyRegisterModal";

export default function Login() {
  const navigate = useNavigate();
  const { state, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  // Login Mode Tab: "password" vs "otp"
  const [authTab, setAuthTab] = useState("password"); // 'password' | 'otp'
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const [email, setEmail] = useState("pravin@123");
  const [password, setPassword] = useState("pravin123");
  const [otpCode, setOtpCode] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);

  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, [authTab]);

  useEffect(() => {
    if (state.status === "authenticated" && state.user) {
      if (state.user.role === "Customer") {
        navigate("/customer-portal", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [state.status, state.user, navigate]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      await login(email, password);
    },
    [email, password, login]
  );

  const handleQuickDemo = async (demoEmail, demoPw) => {
    setEmail(demoEmail);
    setPassword(demoPw);
    await login(demoEmail, demoPw);
  };

  const handleGoogleLogin = async () => {
    // Demo SSO Login trigger using default admin
    await login("admin@fdms.com", "admin123");
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

            {/* Pill-Style Login Tabs */}
            <div className="pill-tab-group">
              <button
                type="button"
                className={`pill-tab ${authTab === "password" ? "active" : ""}`}
                onClick={() => setAuthTab("password")}
              >
                <Lock size={15} />
                <span>Password Login</span>
              </button>
              <button
                type="button"
                className={`pill-tab ${authTab === "otp" ? "active" : ""}`}
                onClick={() => setAuthTab("otp")}
              >
                <KeyRound size={15} />
                <span>OTP Login</span>
              </button>
            </div>

            {/* Google SSO Login Button */}
            <button type="button" className="google-btn" onClick={handleGoogleLogin}>
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

            <div className="auth-divider">
              <span>Or sign in with email</span>
            </div>

            {/* Input Form Fields */}
            {authTab === "password" ? (
              <>
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
                        alert("For demo, use credentials listed under Demo Accounts card.");
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
              </>
            ) : (
              <>
                <div className="input-wrapper">
                  <span className="input-label">Email or Phone Number</span>
                  <div className="input-field-box">
                    <Mail size={18} className="input-icon" />
                    <input
                      ref={emailRef}
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com or +91 98765 43210"
                      required
                    />
                  </div>
                </div>

                <div className="input-wrapper">
                  <span className="input-label">6-Digit One Time Password (OTP)</span>
                  <div className="input-field-box">
                    <Shield size={18} className="input-icon" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Invalid Credentials Banner */}
            {state.status === "error" && (
              <div className="auth-error" style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "10px" }}>
                {t("invalidCredentials")}
              </div>
            )}

            {/* Primary Submit Button */}
            <button type="submit" className="saas-submit-btn" disabled={state.status === "loading"}>
              <span>{state.status === "loading" ? t("signingIn") : "Sign In to Dashboard"}</span>
              <ArrowRight size={18} />
            </button>

            {/* B2B Customer Registration Toggle */}
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed var(--line)", textAlign: "center" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "var(--text-dim)" }}>
                Don't have a corporate fuel account?
              </p>
              <button
                type="button"
                className="btn-secondary full"
                onClick={() => setRegisterModalOpen(true)}
                style={{ fontWeight: "800", borderColor: "var(--orange)", color: "var(--orange)", gap: "8px" }}
              >
                <Building2 size={16} /> Register Your Company
              </button>
            </div>
          </form>

          {/* ==========================================
              SEPARATE DEMO ACCOUNTS CARD
             ========================================== */}
          <div className="demo-accounts-card">
            <div className="demo-card-head">
              <span>⚡ Quick Demo Accounts</span>
              <UserCheck size={16} />
            </div>
            <div className="demo-chips-grid">
              <button
                type="button"
                className="demo-chip-btn"
                onClick={() => handleQuickDemo("admin@fdms.com", "admin123")}
              >
                <span>Admin</span>
                <small style={{ color: "var(--text-dim)", fontSize: "10px" }}>Fleet Admin</small>
              </button>
              <button
                type="button"
                className="demo-chip-btn"
                onClick={() => handleQuickDemo("pravin@123", "pravin123")}
              >
                <span>Depot Mgr</span>
                <small style={{ color: "var(--text-dim)", fontSize: "10px" }}>Pravin</small>
              </button>
              <button
                type="button"
                className="demo-chip-btn"
                onClick={() => handleQuickDemo("customer@fdms.com", "customer123")}
              >
                <span>Customer</span>
                <small style={{ color: "var(--text-dim)", fontSize: "10px" }}>Chennai Steel</small>
              </button>
            </div>
          </div>
        </div>
      </div>

      <CompanyRegisterModal open={registerModalOpen} onClose={() => setRegisterModalOpen(false)} />
    </div>
  );
}
