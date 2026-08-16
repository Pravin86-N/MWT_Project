import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

/**
 * AppLayout
 * -------------------------------------------------------------
 * Every protected page (Dashboard, Orders, Drivers, Customers,
 * Reports, Settings) shares the same sidebar + topbar chrome.
 * Rather than repeating <Sidebar/> and <Navbar/> in every page
 * component, App.jsx nests all of their routes under a single
 * <AppLayout> route whose <Outlet/> renders whichever child
 * route matched. This is the standard react-router-dom pattern
 * for shared layouts, and it also means the clock/live-time
 * state below only has to live in one place.
 */
export default function AppLayout() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="shell">
      <Sidebar />
      <div className="shell-main">
        <Navbar now={now} />
        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
