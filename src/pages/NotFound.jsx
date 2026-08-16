import React from "react";
import { Link } from "react-router-dom";
import { Fuel } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div className="auth-logo" style={{ display: "flex", justifyContent: "center" }}>
          <Fuel size={26} />
        </div>
        <h1>404</h1>
        <p className="auth-sub">{t("notFoundTitle")}</p>
        <p className="cell-dim">{t("notFoundDesc")}</p>
        <Link className="btn-primary full" to="/dashboard">
          {t("goHome")}
        </Link>
      </div>
    </div>
  );
}
