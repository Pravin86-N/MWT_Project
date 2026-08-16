import React from "react";
import { STATUS_COLOR } from "../data/seed";
import { useLanguage } from "../context/LanguageContext";

// React.memo: pure presentational piece, memoized so it only
// re-renders when its own `status` prop (or the active language)
// changes — pairs with the useCallback-wrapped handlers passed to
// its parent OrderRow.
const StatusPill = React.memo(function StatusPill({ status }) {
  const { t } = useLanguage();
  return (
    <span className="pill" style={{ "--pill-color": STATUS_COLOR[status] }}>
      {t(`status_${status}`)}
    </span>
  );
});

export default StatusPill;
