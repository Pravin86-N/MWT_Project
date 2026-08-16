import React from "react";

export default function DispatchGauge({ pct }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(pct, 100) / 100) * c;
  return (
    <svg viewBox="0 0 140 140" className="gauge">
      <circle cx="70" cy="70" r={r} className="gauge-track" />
      <circle
        cx="70"
        cy="70"
        r={r}
        className="gauge-fill"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
      <text x="70" y="66" textAnchor="middle" className="gauge-number">
        {Math.round(pct)}%
      </text>
      <text x="70" y="86" textAnchor="middle" className="gauge-label">
        DISPATCHED
      </text>
    </svg>
  );
}
