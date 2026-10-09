import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Standard Enterprise Pagination Component for FuelNet 360.
 *
 * Supports:
 * - Previous / Next buttons
 * - Page numbers with ellipsis (1, 2, 3, ..., N)
 * - Rows per page dropdown (10, 20, 50)
 * - "Showing X–Y of Z records" summary
 * - Responsive mobile wrapping
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}) {
  if (totalRecords === 0) {
    return (
      <div className="pagination-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", fontSize: "14px", color: "var(--text-dim)" }}>
        <span>Showing 0 of 0 records</span>
      </div>
    );
  }

  const startRecord = Math.min((currentPage - 1) * pageSize + 1, totalRecords);
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  // Generate pagination items with ellipses
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let leftBound = Math.max(2, currentPage - 1);
      let rightBound = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        rightBound = 4;
      } else if (currentPage >= totalPages - 2) {
        leftBound = totalPages - 3;
      }

      if (leftBound > 2) pages.push("...");

      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
      }

      if (rightBound < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className="pagination-container"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "14px",
        padding: "14px 20px",
        borderTop: "1px solid var(--line)",
        background: "var(--panel)",
        fontSize: "14px",
        borderRadius: "0 0 12px 12px",
      }}
    >
      {/* Left: Summary text & Rows per page */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <span style={{ color: "var(--text-secondary)", fontWeight: "500" }}>
          Showing <strong style={{ color: "var(--text-primary)" }}>{startRecord}–{endRecord}</strong> of{" "}
          <strong style={{ color: "var(--text-primary)" }}>{totalRecords}</strong> records
        </span>

        {onPageSizeChange && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                background: "var(--panel-alt)",
                border: "1px solid var(--line)",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Previous, Page Buttons, Next */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button
          className="btn-ghost"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
          style={{
            padding: "6px 12px",
            fontSize: "13px",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            borderRadius: "6px",
            opacity: currentPage <= 1 ? 0.45 : 1,
            cursor: currentPage <= 1 ? "not-allowed" : "pointer",
          }}
        >
          <ChevronLeft size={15} />
          <span>Previous</span>
        </button>

        {pages.map((p, idx) => {
          if (p === "...") {
            return (
              <span key={`ellipsis-${idx}`} style={{ padding: "0 6px", color: "var(--text-secondary)" }}>
                ...
              </span>
            );
          }

          const isActive = p === currentPage;
          return (
            <button
              key={`page-${p}`}
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={isActive ? "page" : undefined}
              style={{
                minWidth: "34px",
                height: "34px",
                padding: "0 8px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: isActive ? "700" : "500",
                border: isActive ? "1px solid var(--fuel-diesel)" : "1px solid transparent",
                background: isActive ? "rgba(245, 158, 11, 0.15)" : "transparent",
                color: isActive ? "var(--fuel-diesel)" : "var(--text-primary)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {p}
            </button>
          );
        })}

        <button
          className="btn-ghost"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
          style={{
            padding: "6px 12px",
            fontSize: "13px",
            fontWeight: "600",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            borderRadius: "6px",
            opacity: currentPage >= totalPages ? 0.45 : 1,
            cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
          }}
        >
          <span>Next</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
