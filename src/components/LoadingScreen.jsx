import React from "react";
import { Fuel } from "lucide-react";

export default function LoadingScreen({ message = "Loading FDMS Command Center..." }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg, #080C14)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        gap: "18px",
      }}
    >
      <div
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "18px",
          background: "var(--grad-flame, linear-gradient(135deg, #FF5E00 0%, #FFB703 100%))",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 25px rgba(255, 94, 0, 0.4)",
          animation: "pulse 1.5s infinite ease-in-out",
        }}
      >
        <Fuel size={32} />
      </div>

      <div style={{ textAlign: "center" }}>
        <h3
          style={{
            margin: "0 0 6px 0",
            fontSize: "16px",
            fontWeight: "700",
            color: "var(--text, #F8FAFC)",
            letterSpacing: "0.02em",
          }}
        >
          FDMS LOGISTICS PLATFORM
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "var(--orange, #FF5E00)",
            fontWeight: "600",
          }}
        >
          {message}
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
