import React from "react";

/**
 * Standard Skeleton Loader Elements & Layout Presets for FuelNet 360.
 */
export function SkeletonBlock({ width = "100%", height = "20px", borderRadius = "6px", style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: "linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.09) 50%, rgba(255, 255, 255, 0.04) 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.5s infinite ease-in-out",
        ...style,
      }}
    />
  );
}

export function SkeletonTable({ rows = 5, columns = 6 }) {
  return (
    <div style={{ width: "100%", padding: "12px", background: "var(--panel)", borderRadius: "12px" }}>
      {/* Header bar */}
      <div style={{ display: "flex", gap: "12px", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
        {Array.from({ length: columns }).map((_, c) => (
          <SkeletonBlock key={`th-${c}`} height="16px" style={{ flex: 1 }} />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={`tr-${r}`}
          style={{
            display: "flex",
            gap: "12px",
            padding: "16px 0",
            borderBottom: r < rows - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
          }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <SkeletonBlock key={`td-${r}-${c}`} height="18px" style={{ flex: 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export const TableSkeleton = SkeletonTable;

export function SkeletonKpiCard() {
  return (
    <div
      style={{
        padding: "20px",
        background: "var(--panel)",
        borderRadius: "14px",
        border: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SkeletonBlock width="120px" height="14px" />
        <SkeletonBlock width="28px" height="28px" borderRadius="8px" />
      </div>
      <SkeletonBlock width="160px" height="32px" />
      <SkeletonBlock width="100px" height="12px" />
    </div>
  );
}

export function SkeletonCard({ height = "180px" }) {
  return (
    <div
      style={{
        padding: "20px",
        background: "var(--panel)",
        borderRadius: "14px",
        border: "1px solid var(--line)",
        height,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <SkeletonBlock width="60%" height="20px" />
      <SkeletonBlock width="100%" height="16px" />
      <SkeletonBlock width="80%" height="16px" />
      <div style={{ marginTop: "auto", display: "flex", gap: "10px" }}>
        <SkeletonBlock width="90px" height="30px" borderRadius="8px" />
      </div>
    </div>
  );
}
