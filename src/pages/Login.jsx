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
  Radio,
  Navigation,
  Sparkles,
  Activity,
  Gauge,
  Zap,
  CheckCircle2,
  UserCheck,
  Flame,
  Droplets,
  ShieldCheck,
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

  // 3D Perspective Tilt & Moving Truck State
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(true);
  const [cruiseSpeed, setCruiseSpeed] = useState(65);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
    setTilt({ x: y, y: x });
  };
  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Quick Demo Access Accounts (Exact Match to Reference UI)
  const demoRoles = [
    { role: "Admin", email: "admin@fdms.com", pass: "admin123", label: "Admin", badge: "All Depots" },
    { role: "Depot Manager", email: "coimbatore.mgr@fdms.com", pass: "manager123", label: "Manager", badge: "Coordinator" },
    { role: "Driver", email: "driver@fdms.com", pass: "driver123", label: "Driver", badge: "Fleet A" },
    { role: "Customer", email: "customer@fdms.com", pass: "customer123", label: "Customer", badge: "Steel Works" },
  ];

  const handleSelectDemoRole = (d) => {
    setEmail(d.email);
    setPassword(d.pass);
    setLoginError("");
  };

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
    <main className="saas-auth-page">
      {/* Top Floating Theme Switcher */}
      <button
        className="icon-btn theme-fab"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
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
            LEFT COLUMN: BRAND, 3D MOVING TRUCK & TELEMETRY
           ========================================== */}
        <div className="saas-auth-left">
          <div className="saas-brand-header">
            {/* Top Brand Logo & App Name Badge */}
            <div className="fdms-top-brand">
              <div className="fdms-top-logo-badge">
                <Fuel size={22} />
              </div>
              <div className="fdms-top-brand-text">
                <span className="fdms-brand-name">FDMS SAAS</span>
                <span className="fdms-brand-subtitle">LIVE FLEET TELEMETRY</span>
              </div>
            </div>

            {/* Cyan Outlined Pill Badge */}
            <div className="codefus-brand-badge">
              <div className="codefus-brand-badge-dot" />
              <span className="codefus-brand-badge-text">CODEFUS // FDMS SMART FUEL TELEMETRY</span>
            </div>

            {/* Main Headline */}
            <h1 className="codefus-brand-title">
              Smart Autonomous Fuel<br />
              Logistics &amp; <span className="highlight-orange">Dispatch System</span>
            </h1>

            {/* Tagline */}
            <p className="codefus-brand-tagline">
              Sub-second IoT tank inventory monitoring, predictive AI fleet routing, and tamper-proof valve cryptoseals for next-generation energy distribution.
            </p>
          </div>

          {/* Interactive 3D Moving Truck Stage with Parallax Perspective */}
          <div
            className="fdms-truck-stage"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: tilt.x === 0 && tilt.y === 0 ? "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)" : "transform 0.1s ease-out",
            }}
          >
            {/* Interactive Cruise Control Button on 3D Stage */}
            <button
              type="button"
              className="truck-cruise-toggle"
              onClick={() => setIsMoving((prev) => !prev)}
              title="Click to toggle Moving Truck cruise motion"
            >
              <span className={`codefus-beacon-dot ${isMoving ? "beacon-cyan" : "beacon-orange"}`} />
              <span>{isMoving ? `Live Cruise: ACTIVE (${cruiseSpeed} km/h)` : "Engine Idle (0 km/h)"}</span>
            </button>

            {/* Truck Stage Viewport with Moving/Rumble Animations */}
            <div className={`truck-stage-viewport ${isMoving ? "truck-is-cruising" : "truck-is-rumbling"}`}>
              {/* High-Fidelity 3D Volvo Fuel Tanker & Industrial Depot Render */}
              <img
                src="/assets/fuel_tanker_depot_3d.jpg"
                alt="Smart Autonomous Fuel Tanker Depot 3D Moving Illustration"
                className="truck-hero-img"
              />

              {/* Headlight Ray Projection on Wet Asphalt */}
              <div className="truck-headlight-beam" />

              {/* Wet Asphalt Ground Puddle Reflection Layer */}
              <div className="truck-road-reflections" />

              {/* LiDAR Laser Radar Scan Sweep */}
              <div className="truck-lidar-sweep" />

              {/* =======================================
                  3 FLOATING CYAN HOLOGRAPHIC HUD PANELS
                 ======================================= */}
              {/* 1. Fuel Level HUD (Top Left) */}
              <div className="fdms-hud-panel hud-fuel">
                <div className="hud-icon-circle">
                  <Droplets size={16} />
                </div>
                <div className="hud-fuel-content">
                  <div className="hud-header-row">
                    <span className="hud-label">FUEL LEVEL</span>
                    <div className="hud-eq-bars">
                      <span className="hud-eq-bar" />
                      <span className="hud-eq-bar" />
                      <span className="hud-eq-bar" />
                      <span className="hud-eq-bar" />
                      <span className="hud-eq-bar" />
                    </div>
                  </div>
                  <div className="hud-value-large">98.7%</div>
                </div>
              </div>

              {/* 2. GPS Tracking HUD (Top Center) */}
              <div className="fdms-hud-panel hud-gps">
                <div className="hud-gps-title">
                  <span className="hud-label">GPS TRACKING</span>
                  <div className="hud-live-badge">
                    <Radio size={14} style={{ color: "#00F0FF" }} />
                    <span>Live</span>
                  </div>
                </div>
                <div className="hud-route-container">
                  <svg className="hud-route-svg" viewBox="0 0 160 24" fill="none">
                    <path
                      d="M 6 18 Q 45 4 80 14 T 154 8"
                      stroke="rgba(0, 240, 255, 0.45)"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                    <circle cx="6" cy="18" r="3.5" fill="#10B981" />
                    <circle cx="154" cy="8" r="3.5" fill="#FF7700" />
                    <g className="hud-moving-truck">
                      <circle cx="0" cy="0" r="4.5" fill="#00F0FF" filter="drop-shadow(0 0 4px #00F0FF)" />
                    </g>
                  </svg>
                </div>
              </div>

              {/* 3. Temperature HUD (Top Right) */}
              <div className="fdms-hud-panel hud-temp">
                <div className="hud-icon-circle">
                  <Gauge size={16} />
                </div>
                <div className="hud-temp-content">
                  <span className="hud-label">TEMPERATURE</span>
                  <div className="hud-value-large">24.5°C</div>
                </div>
                <svg className="hud-temp-spline" viewBox="0 0 60 22" fill="none">
                  <path
                    d="M 0 16 Q 15 4 30 14 T 60 8"
                    stroke="#00F0FF"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path
                    d="M 0 16 Q 15 4 30 14 T 60 8 L 60 22 L 0 22 Z"
                    fill="url(#tempGlowGrad)"
                    opacity="0.35"
                  />
                  <defs>
                    <linearGradient id="tempGlowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00F0FF" />
                      <stop offset="100%" stopColor="#00F0FF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>

          {/* Horizontal Telemetry Metrics Row (Directly Beneath Truck Wheels) */}
          <div className="fdms-truck-metrics-row">
            <div className="metric-pill">
              <div className="metric-pill-icon">
                <Droplets size={14} />
              </div>
              <div className="metric-pill-text">
                <span className="metric-pill-primary">18,450L</span>
                <span className="metric-pill-secondary">Premium Octane • Sealed</span>
              </div>
            </div>

            <div className="metric-pill">
              <div className="metric-pill-icon">
                <Navigation size={14} />
              </div>
              <div className="metric-pill-text">
                <span className="metric-pill-primary">En-Route</span>
                <span className="metric-pill-secondary">AI Nav ETA 14m</span>
              </div>
            </div>

            <div className="metric-pill">
              <div className="metric-pill-icon">
                <ShieldCheck size={14} />
              </div>
              <div className="metric-pill-text">
                <span className="metric-pill-primary">RTK GPS Fix</span>
                <span className="metric-pill-secondary">99.98% • Latency 12ms</span>
              </div>
            </div>

            <div className="metric-pill">
              <div className="metric-pill-icon">
                <Shield size={14} />
              </div>
              <div className="metric-pill-text">
                <span className="metric-pill-primary">Valve Security</span>
                <span className="metric-pill-secondary">100% Cryptosealed</span>
              </div>
            </div>
          </div>

          {/* 2x2 Compact Feature Highlights Grid */}
          <div className="fdms-features-grid">
            <div className="fdms-feature-pill">
              <div className="fdms-feature-pill-icon">
                <Radio size={14} />
              </div>
              <span>Sub-Second Fleet Telemetry</span>
            </div>

            <div className="fdms-feature-pill">
              <div className="fdms-feature-pill-icon">
                <Navigation size={14} />
              </div>
              <span>AI Autonomous Route Engine</span>
            </div>

            <div className="fdms-feature-pill">
              <div className="fdms-feature-pill-icon">
                <Fuel size={14} />
              </div>
              <span>IoT Tank Hydrodynamics</span>
            </div>

            <div className="fdms-feature-pill">
              <div className="fdms-feature-pill-icon">
                <Shield size={14} />
              </div>
              <span>Cryptosealed Valve Security</span>
            </div>
          </div>
        </div>

        {/* ==========================================
            RIGHT COLUMN: GLOWING CYAN-NEON AUTH CARD
           ========================================== */}
        <div className="saas-auth-right">
          <form className="glowing-auth-card" onSubmit={handleSubmit}>
            {/* Top-left Illuminated Cyan Corner Arc */}
            <div className="glowing-card-neon-corner" />

            {/* Card Header */}
            <div className="auth-card-head">
              <div className="auth-card-logo-badge">
                <Fuel size={26} />
              </div>
              <h2>Welcome back</h2>
              <p>Sign in to your FDMS dispatch &amp; telemetry portal</p>
            </div>

            {/* Quick Demo Access Role Bar */}
            <div className="codefus-demo-roles">
              <div className="codefus-demo-header">
                <span>Quick Demo Access</span>
                <span style={{ color: "#FF7700", fontWeight: "800" }}>1-Click Fill</span>
              </div>
              <div className="codefus-demo-pills">
                {demoRoles.map((d) => (
                  <button
                    key={d.role}
                    type="button"
                    className={`codefus-role-pill ${email === d.email ? "active" : ""}`}
                    onClick={() => handleSelectDemoRole(d)}
                    title={`Click to fill ${d.role} credentials (${d.email})`}
                  >
                    <UserCheck size={12} style={{ opacity: 0.85 }} />
                    <span>{d.label}</span>
                    <span className="codefus-role-sub">{d.badge}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form Fields */}
            <div className="input-wrapper">
              <label htmlFor="login-email" className="input-label">Email address</label>
              <div className="input-field-box">
                <Mail size={18} className="input-icon" />
                <input
                  id="login-email"
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="input-wrapper">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="login-password" className="input-label">Password</label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: "13px", color: "#FF7700", textDecoration: "none", fontWeight: "700" }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="input-field-box">
                <Lock size={18} className="input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Invalid Credentials Banner */}
            {(loginError || state.status === "error") && (
              <div className="auth-error" style={{ fontSize: "14px", padding: "10px 14px", borderRadius: "10px" }}>
                {loginError || state.error || t("invalidCredentials")}
              </div>
            )}

            {/* Primary Submit Button with Glowing Flame Gradient */}
            <button type="submit" className="codefus-submit-btn saas-submit-btn" disabled={state.status === "loading"}>
              <span>{state.status === "loading" ? t("signingIn") : "Sign In to Dashboard"}</span>
              <ArrowRight size={18} />
            </button>

            {/* Additional Authentication Options Divider */}
            <div className="auth-divider">
              <span>Or continue with</span>
            </div>

            {/* 1. Continue with Google (Real Google Sign-In) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
              <div className="google-signin-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleCredentialResponse}
                  onError={() => setGoogleError("Google login failed. Please try again.")}
                  theme="filled_black"
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
              className="auth-otp-btn"
              onClick={() => {
                setShowOtpSection(!showOtpSection);
                setOtpMessage({ type: "", text: "", preview: "" });
                setOtp("");
                setOtpSent(false);
              }}
              style={{
                borderColor: showOtpSection ? "#FF7700" : "rgba(255, 255, 255, 0.12)",
                background: showOtpSection ? "rgba(255, 119, 0, 0.12)" : "rgba(12, 22, 38, 0.7)",
                color: showOtpSection ? "#FF7700" : "#FFFFFF",
              }}
            >
              <Smartphone size={16} />
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
                      <label htmlFor="otp-email-input" className="input-label" style={{ fontSize: "14px" }}>Registered Email Address</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <div className="input-field-box" style={{ flex: 1, height: "46px" }}>
                          <Mail size={16} className="input-icon" />
                          <input
                            id="otp-email-input"
                            type="email"
                            value={otpEmail}
                            onChange={(e) => setOtpEmail(e.target.value)}
                            placeholder="user@company.com"
                            aria-label="Registered Email Address"
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
                            fontSize: "13px",
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
                          <label htmlFor="otp-email-code" className="input-label" style={{ fontSize: "14px" }}>Enter 6-Digit Email OTP</label>
                          <span style={{ fontSize: "12px", color: otpTimer > 0 ? "var(--orange)" : "var(--red, #ef4444)", fontWeight: "700" }}>
                            {otpTimer > 0 ? `Expires in ${formatTimer(otpTimer)} (5 mins)` : "Expired"}
                          </span>
                        </div>
                        <div className="input-field-box" style={{ height: "46px" }}>
                          <Shield size={16} className="input-icon" />
                          <input
                            id="otp-email-code"
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            placeholder="••••••"
                            aria-label="Enter 6-digit email OTP"
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
                            fontSize: "14px",
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
                      <label htmlFor="otp-mobile-input" className="input-label" style={{ fontSize: "14px" }}>Registered Mobile Number</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <div className="input-field-box" style={{ flex: 1, height: "46px" }}>
                          <Phone size={16} className="input-icon" />
                          <input
                            id="otp-mobile-input"
                            type="tel"
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            placeholder="+91 98401 23456"
                            aria-label="Registered Mobile Number"
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
                            fontSize: "13px",
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
                          <label htmlFor="otp-mobile-code" className="input-label" style={{ fontSize: "14px" }}>Enter 6-Digit Mobile OTP</label>
                          <span style={{ fontSize: "12px", color: otpTimer > 0 ? "var(--orange)" : "var(--red, #ef4444)", fontWeight: "700" }}>
                            {otpTimer > 0 ? `Expires in ${formatTimer(otpTimer)} (5 mins)` : "Expired"}
                          </span>
                        </div>
                        <div className="input-field-box" style={{ height: "46px" }}>
                          <Shield size={16} className="input-icon" />
                          <input
                            id="otp-mobile-code"
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            placeholder="••••••"
                            aria-label="Enter 6-digit mobile OTP"
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
                            fontSize: "14px",
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
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed rgba(255, 255, 255, 0.1)", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                <span style={{ fontSize: "13.5px", color: "#94A3B8" }}>Don't have an account?</span>
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#FF7700",
                    fontWeight: "800",
                    cursor: "pointer",
                    fontSize: "13.5px",
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
                style={{
                  fontWeight: "700",
                  fontSize: "13.5px",
                  border: "1px solid rgba(255, 119, 0, 0.45)",
                  background: "rgba(14, 22, 38, 0.8)",
                  color: "#FFFFFF",
                  gap: "8px",
                  height: "44px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
              >
                <Building2 size={16} color="#FF7700" /> Register Corporate Account
              </button>
            </div>
          </form>
        </div>
      </div>



      <CompanyRegisterModal open={registerModalOpen} onClose={() => setRegisterModalOpen(false)} />
    </main>
  );
}
