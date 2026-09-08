import React, { useState, useEffect, useRef } from "react";
import { Sun, Moon, Check, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useSettings } from "../context/SettingsContext";
import { useOrders } from "../context/OrdersContext";
import { LANGUAGES } from "../i18n/translations";

export default function Settings() {
  const { state, updateProfile, changePassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { prefs, togglePref } = useSettings();
  const { resetToSeed } = useOrders();

  const [savedFlash, setSavedFlash] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(state.user?.name || "");
  const [profilePhone, setProfilePhone] = useState(state.user?.phone || "");
  const [profileCompany, setProfileCompany] = useState(state.user?.company || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Sync profile values when state.user loads
  useEffect(() => {
    if (state.user) {
      setProfileName(state.user.name || "");
      setProfilePhone(state.user.phone || "");
      setProfileCompany(state.user.company || "");
    }
  }, [state.user]);

  // useRef: holds the pending timeout id across renders so a rapid
  // sequence of toggles doesn't leave several timers racing each
  // other — a value that survives renders but shouldn't trigger one.
  const flashTimer = useRef(null);

  const flashSaved = () => {
    setSavedFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1800);
  };

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const onToggleTheme = () => {
    toggleTheme();
    flashSaved();
  };
  const onChangeLanguage = (e) => {
    setLanguage(e.target.value);
    flashSaved();
  };
  const onTogglePref = (key) => {
    togglePref(key);
    flashSaved();
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    try {
      const res = await updateProfile({
        name: profileName.trim(),
        phone: profilePhone.trim(),
        company: profileCompany.trim(),
      });
      if (res.ok) {
        setIsEditingProfile(false);
        flashSaved();
      } else {
        setProfileError(res.error || "Failed to update profile.");
      }
    } catch (err) {
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    setPasswordError("");
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.ok) {
        setIsChangingPassword(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        flashSaved();
      } else {
        setPasswordError(res.error || "Failed to change password.");
      }
    } catch (err) {
      setPasswordError(err.message || "Failed to change password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const clearLocalData = () => {
    if (!window.confirm(t("clearLocalDataDesc"))) return;
    localStorage.removeItem("fdms-orders");
    localStorage.removeItem("fdms-drivers");
    localStorage.removeItem("fdms-prefs");
    resetToSeed();
    flashSaved();
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{t("settingsTitle")}</h1>
          <p className="page-sub">{t("settingsSubtitle")}</p>
        </div>
        {savedFlash && (
          <div className="save-flash">
            <Check size={14} /> {t("savedChanges")}
          </div>
        )}
      </div>

      <section className="panel settings-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>{t("profile")}</h3>
          {!isEditingProfile && (
            <button
              className="btn-ghost"
              style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}
              onClick={() => setIsEditingProfile(true)}
            >
              Edit Profile
            </button>
          )}
        </div>

        {profileError && (
          <div style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            {profileError}
          </div>
        )}

        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile} style={{ display: "grid", gap: "1rem" }}>
            <div className="settings-row" style={{ alignItems: "center" }}>
              <span style={{ fontWeight: 500 }}>{t("name")}</span>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--line)",
                  borderRadius: "6px",
                  padding: "0.5rem 0.75rem",
                  color: "var(--text)",
                  width: "260px",
                }}
              />
            </div>
            <div className="settings-row" style={{ alignItems: "center" }}>
              <span style={{ fontWeight: 500 }}>Phone</span>
              <input
                type="text"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="+91 98765 43210"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--line)",
                  borderRadius: "6px",
                  padding: "0.5rem 0.75rem",
                  color: "var(--text)",
                  width: "260px",
                }}
              />
            </div>
            <div className="settings-row" style={{ alignItems: "center" }}>
              <span style={{ fontWeight: 500 }}>Organization</span>
              <input
                type="text"
                value={profileCompany}
                onChange={(e) => setProfileCompany(e.target.value)}
                placeholder="Company / Depot Name"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--line)",
                  borderRadius: "6px",
                  padding: "0.5rem 0.75rem",
                  color: "var(--text)",
                  width: "260px",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setIsEditingProfile(false);
                  setProfileError("");
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={profileSaving}
                className="btn-primary"
                style={{
                  background: "var(--orange)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                }}
              >
                {profileSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="detail-list">
            <div><dt>{t("name")}</dt><dd>{state.user?.name}</dd></div>
            <div><dt>{t("email")}</dt><dd>{state.user?.email}</dd></div>
            <div><dt>{t("role")}</dt><dd>{state.user?.role}</dd></div>
            {state.user?.phone && <div><dt>Phone</dt><dd>{state.user.phone}</dd></div>}
            {state.user?.company && <div><dt>Company</dt><dd>{state.user.company}</dd></div>}
          </dl>
        )}
      </section>

      <section className="panel settings-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isChangingPassword ? "1rem" : 0 }}>
          <div>
            <h3 style={{ margin: 0 }}>Security & Password</h3>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-dim)" }}>Update your MongoDB authenticated account password</p>
          </div>
          {!isChangingPassword && (
            <button
              className="btn-ghost"
              style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}
              onClick={() => setIsChangingPassword(true)}
            >
              Change Password
            </button>
          )}
        </div>

        {passwordError && (
          <div style={{ color: "var(--red)", fontSize: "0.85rem", margin: "0.75rem 0" }}>
            {passwordError}
          </div>
        )}

        {isChangingPassword && (
          <form onSubmit={handleChangePassword} style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
            <div className="settings-row" style={{ alignItems: "center" }}>
              <span style={{ fontWeight: 500 }}>Current Password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--line)",
                  borderRadius: "6px",
                  padding: "0.5rem 0.75rem",
                  color: "var(--text)",
                  width: "260px",
                }}
              />
            </div>
            <div className="settings-row" style={{ alignItems: "center" }}>
              <span style={{ fontWeight: 500 }}>New Password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--line)",
                  borderRadius: "6px",
                  padding: "0.5rem 0.75rem",
                  color: "var(--text)",
                  width: "260px",
                }}
              />
            </div>
            <div className="settings-row" style={{ alignItems: "center" }}>
              <span style={{ fontWeight: 500 }}>Confirm Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--line)",
                  borderRadius: "6px",
                  padding: "0.5rem 0.75rem",
                  color: "var(--text)",
                  width: "260px",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordError("");
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passwordSaving}
                className="btn-primary"
                style={{
                  background: "var(--orange)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                }}
              >
                {passwordSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="panel settings-panel">
        <h3>{t("appearance")}</h3>
        <div className="settings-row">
          <span>{t("theme")}</span>
          <button className="btn-ghost" onClick={onToggleTheme}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            {theme === "dark" ? t("light") : t("dark")}
          </button>
        </div>
        <div className="settings-row">
          <span>{t("language")}</span>
          <select value={language} onChange={onChangeLanguage}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="panel settings-panel">
        <h3>{t("notifications")}</h3>
        {[
          { key: "notifyOrderUpdates", label: t("notifyOrderUpdates") },
          { key: "notifyLowStock", label: t("notifyLowStock") },
          { key: "notifyDailySummary", label: t("notifyDailySummary") },
        ].map((row) => (
          <label className="settings-row toggle-row" key={row.key}>
            <span>{row.label}</span>
            <input type="checkbox" checked={prefs[row.key]} onChange={() => onTogglePref(row.key)} />
          </label>
        ))}
      </section>

      <section className="panel settings-panel danger">
        <h3>{t("dangerZone")}</h3>
        <div className="settings-row">
          <div>
            <div>{t("clearLocalData")}</div>
            <div className="cell-dim">{t("clearLocalDataDesc")}</div>
          </div>
          <button className="btn-ghost danger" onClick={clearLocalData}>
            <Trash2 size={14} /> {t("clearData")}
          </button>
        </div>
      </section>
    </div>
  );
}
