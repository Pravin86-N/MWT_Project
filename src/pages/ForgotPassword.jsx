import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Fuel,
  Mail,
  Shield,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  KeyRound,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { authApi } from "../services/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, toggleTheme } = useTheme();

  // Multi-step state: 1 = Email, 2 = Verify OTP, 3 = New Password, 4 = Success
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [otpPreview, setOtpPreview] = useState("");
  const [otpTimer, setOtpTimer] = useState(0); // 300s = 5 mins

  // Detect token from URL query params (/forgot-password?token=...&email=...)
  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    const emailFromUrl = searchParams.get("email");
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      if (emailFromUrl) setEmail(emailFromUrl);
      setStep(3);
      setSuccessMsg("Reset link verified! Please enter your new password below.");
    }
  }, [searchParams]);

  // Countdown timer
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

  // Step 1: Send Reset Link / OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await authApi.forgotPassword(email.trim());
      setStep(2);
      setOtpTimer(300); // 5 minutes expiry
      setSuccessMsg(res.message || "Password reset instructions sent.");
      if (res.otpPreview) {
        setOtpPreview(res.otpPreview);
      }
      if (res.resetLink) {
        setResetLink(res.resetLink);
      }
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Reset OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMsg("Please enter the complete 6-digit OTP code.");
      return;
    }
    if (otpTimer === 0) {
      setErrorMsg("OTP has expired (validity is 5 minutes). Please click Resend OTP.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const res = await authApi.verifyResetOtp(email.trim(), otp.trim());
      setStep(3);
      setSuccessMsg(res.message || "OTP verified! Please set your new password.");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please verify and try again.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      await authApi.resetPassword({
        email: email.trim(),
        token: resetToken,
        otp: otp.trim(),
        newPassword,
      });
      setStep(4);
      setSuccessMsg("Password reset successfully! You can now log in with your new credentials.");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-auth-page">
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
        {theme === "dark" ? <Sun size={20} style={{ color: "var(--amber)" }} /> : <Moon size={20} style={{ color: "var(--blue)" }} />}
      </button>

      <div className="saas-auth-container">
        {/* Left Column Graphic */}
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
                FDMS SECURITY PORTAL
              </span>
            </div>
            <h1 className="saas-brand-title">Account Recovery & Password Reset</h1>
            <p className="saas-brand-tagline">
              Secure single-use OTP verification with encrypted credential update to keep your corporate fuel logistics account safe.
            </p>
          </div>

          <div className="truck-graphic-container">
            <div className="truck-radar-bg">
              <div className="truck-radar-ring r1"></div>
              <div className="truck-radar-ring r2"></div>
            </div>

            <div style={{ textAlign: "center", position: "relative", zIndex: 5, padding: "40px 20px" }}>
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "24px",
                  background: "var(--grad-flame)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  boxShadow: "0 0 30px var(--orange-glow)",
                  color: "#FFFFFF",
                }}
              >
                <KeyRound size={40} />
              </div>
              <h3 style={{ color: "var(--text)", fontWeight: "800", margin: "0 0 8px" }}>
                Multi-Factor OTP Guard
              </h3>
              <p style={{ color: "var(--text-dim)", fontSize: "13px", maxWidth: "280px", margin: "0 auto" }}>
                5-minute time-bound OTP generation guarantees single-use recovery protection.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column Form */}
        <div className="saas-auth-right">
          <div className="login-card-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Link to="/login" style={{ color: "var(--orange)", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "700" }}>
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
            <h2>
              {step === 1 && "Forgot Password"}
              {step === 2 && "Verify OTP Code"}
              {step === 3 && "Set New Password"}
              {step === 4 && "Password Recovered!"}
            </h2>
            <p>
              {step === 1 && "Enter your account email to receive a secure 6-digit reset OTP."}
              {step === 2 && `Enter the 6-digit OTP code sent to ${email}.`}
              {step === 3 && "Create a strong new password (minimum 6 characters)."}
              {step === 4 && "Your password has been successfully updated. You can now log in."}
            </p>
          </div>

          {/* Progress Indicator */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: "4px",
                  borderRadius: "2px",
                  background: step >= s ? "var(--orange)" : "var(--line)",
                  transition: "background 0.3s ease",
                }}
              />
            ))}
          </div>

          {/* Alert Error Banner */}
          {errorMsg && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "600",
                background: "rgba(239, 68, 68, 0.12)",
                color: "var(--red, #ef4444)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Alert Success Banner */}
          {successMsg && step !== 4 && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "600",
                background: "rgba(16, 185, 129, 0.12)",
                color: "var(--green, #10b981)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                marginBottom: "16px",
              }}
            >
              <div>{successMsg}</div>
              {otpPreview && (
                <div style={{ marginTop: "6px", color: "var(--orange)", fontWeight: "800" }}>
                  🔑 Reset OTP: {otpPreview}
                </div>
              )}
              {resetLink && (
                <div style={{ marginTop: "8px" }}>
                  <a
                    href={resetLink}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "var(--orange)",
                      fontWeight: "700",
                      textDecoration: "underline",
                      fontSize: "13px",
                    }}
                  >
                    🔗 Open Reset Password Link Directly
                  </a>
                </div>
              )}
            </div>
          )}

          {/* STEP 1: EMAIL INPUT */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="saas-form">
              <div className="input-wrapper">
                <span className="input-label">Registered Email Address</span>
                <div className="input-field-box">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@company.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" className="saas-submit-btn" disabled={loading}>
                <span>{loading ? "Sending OTP..." : "Send Reset OTP"}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="saas-form">
              <div className="input-wrapper">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="input-label">6-Digit Verification OTP</span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: otpTimer > 0 ? "var(--orange)" : "var(--red, #ef4444)",
                    }}
                  >
                    {otpTimer > 0 ? `Expires in ${formatTimer(otpTimer)} (5 mins)` : "Expired"}
                  </span>
                </div>
                <div className="input-field-box">
                  <Shield size={18} className="input-icon" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                className="saas-submit-btn"
                disabled={loading || otp.trim().length !== 6}
              >
                <span>{loading ? "Verifying..." : "Verify OTP Code"}</span>
                <ArrowRight size={18} />
              </button>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-dim)",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  ← Change Email
                </button>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || otpTimer > 0}
                  style={{
                    background: "none",
                    border: "none",
                    color: otpTimer > 0 ? "var(--text-dim)" : "var(--orange)",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: otpTimer > 0 ? "not-allowed" : "pointer",
                  }}
                >
                  {otpTimer > 0 ? `Resend OTP (${otpTimer}s)` : "Resend OTP"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="saas-form">
              <div className="input-wrapper">
                <span className="input-label">New Password</span>
                <div className="input-field-box">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="eye-toggle-btn"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="input-wrapper">
                <span className="input-label">Confirm New Password</span>
                <div className="input-field-box">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="eye-toggle-btn"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="saas-submit-btn"
                disabled={loading || newPassword.length < 6 || confirmPassword.length < 6}
              >
                <span>{loading ? "Updating Password..." : "Update Password"}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* STEP 4: SUCCESS CONFIRMATION */}
          {step === 4 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "var(--green, #10b981)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  border: "2px solid rgba(16, 185, 129, 0.4)",
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text)", marginBottom: "8px" }}>
                Password Reset Successfully!
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "24px", lineHeight: "1.5" }}>
                Your account password has been updated. You can now log into your FDMS dashboard using your new credentials.
              </p>
              <button
                type="button"
                className="saas-submit-btn"
                onClick={() => navigate("/login")}
                style={{ width: "100%" }}
              >
                <span>Proceed to Sign In</span>
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
