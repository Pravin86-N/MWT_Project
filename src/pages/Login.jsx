import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Fuel, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

export default function Login() {
  const navigate = useNavigate();
  const { state, login } = useAuth(); // useContext (via useAuth) — auth status + login()
  const { theme, toggleTheme } = useTheme(); // useContext (via useTheme) — theme toggle
  const { t } = useLanguage(); // useContext (via useLanguage) — active translations

  // useState: everything the form itself needs to track.
  const [email, setEmail] = useState("pravin@123");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // useRef #1: focus the email field on mount without causing a
  // re-render (a state variable like `isFocused` would be overkill).
  const emailRef = useRef(null);

  // useRef #2: count failed login attempts. This value influences
  // what we show, but it doesn't need to trigger its own render —
  // it's read only inside the submit handler and rendered lazily,
  // so a ref is more appropriate than another useState.
  const attemptsRef = useRef(0);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // useEffect: if the user is already logged in (e.g. session
  // restored from localStorage), skip the login page entirely.
  useEffect(() => {
    if (state.status === "authenticated") navigate("/dashboard", { replace: true });
  }, [state.status, navigate]);

  // useMemo: a small derived value (password strength label) that
  // only needs to be recalculated when `password` itself changes.
  const passwordHint = useMemo(() => {
    if (!password) return "";
    if (password.length < 6) return t("passwordWeak");
    if (password.length < 10) return t("passwordOkay");
    return t("passwordStrong");
  }, [password, t]);

  // useCallback: the submit handler is stable across renders
  // (only changes if `email`/`password`/`login` change), which
  // matters if this form ever passes it down to a child button
  // component wrapped in React.memo.
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const result = await login(email, password);
      if (!result.ok) {
        attemptsRef.current += 1;
      }
    },
    [email, password, login]
  );

  return (
    <div className="auth-page">
      <button className="icon-btn theme-fab" onClick={toggleTheme} title={t("toggleTheme")}>
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo">
          <Fuel size={26} />
        </div>
        <h1>{t("appSub")}</h1>
        <p className="auth-sub">{t("signInSubtitle")}</p>

        <label className="field">
          <span>{t("email")}</span>
          <input
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />
        </label>

        <label className="field">
          <span>{t("password")}</span>
          <div className="password-row">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button type="button" className="icon-btn" onClick={() => setShowPassword((s) => !s)}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {password && <span className="hint">{passwordHint}</span>}
        </label>

        {state.status === "error" && <div className="auth-error">{t("invalidCredentials")}</div>}

        <button className="btn-primary full" type="submit" disabled={state.status === "loading"}>
          {state.status === "loading" ? t("signingIn") : t("signIn")}
        </button>

        <div className="auth-demo">
          {t("demoAccounts")}: <code>pravin@123 / pravin123</code> ·{" "}
          <code>admin@fdms.com / admin123</code>
        </div>
      </form>
    </div>
  );
}
