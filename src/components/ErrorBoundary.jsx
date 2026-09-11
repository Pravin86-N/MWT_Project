import React from "react";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "400px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px",
            width: "100%",
          }}
        >
          <div
            style={{
              maxWidth: "540px",
              width: "100%",
              background: "var(--panel, #0f172a)",
              border: "1px solid var(--line, #334155)",
              borderRadius: "18px",
              padding: "28px 24px",
              boxShadow: "var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.5))",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "rgba(255, 94, 0, 0.15)",
                color: "var(--orange, #ff5e00)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={26} />
            </div>

            <div>
              <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: "700", color: "var(--text, #f8fafc)" }}>
                Interface Recovery Mode
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-dim, #94a3b8)", lineHeight: "1.5" }}>
                A temporary rendering exception occurred. The system has prevented a blank screen.
              </p>
            </div>

            {this.state.error?.message && (
              <div
                style={{
                  width: "100%",
                  background: "rgba(0, 0, 0, 0.25)",
                  border: "1px solid var(--line, #334155)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  fontSize: "12px",
                  color: "var(--red, #ef4444)",
                  fontFamily: "monospace",
                  textAlign: "left",
                  wordBreak: "break-word",
                  maxHeight: "120px",
                  overflowY: "auto",
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "6px" }}>
              <button
                onClick={this.handleReset}
                className="btn-primary"
                style={{
                  flex: 1,
                  height: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontSize: "13px",
                  fontWeight: "700",
                }}
              >
                <RefreshCw size={15} /> Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="btn-secondary"
                style={{
                  flex: 1,
                  height: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontSize: "13px",
                  fontWeight: "700",
                }}
              >
                <LayoutDashboard size={15} /> Reload Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
