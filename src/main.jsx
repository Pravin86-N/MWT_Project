import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// Ensure process.env is safely accessible in the browser runtime for Vercel Multi-Services
if (typeof window !== "undefined") {
  window.process = window.process || {};
  window.process.env = window.process.env || {};
  try {
    if (typeof process !== "undefined" && process?.env?.BACKEND_URL && !window.process.env.BACKEND_URL) {
      window.process.env.BACKEND_URL = process.env.BACKEND_URL;
    }
  } catch (e) {}
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
