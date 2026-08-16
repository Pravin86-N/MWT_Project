# Fuel Delivery Management System — Dispatch Console

A more complete React (Vite) app for a fuel-depot dispatch console: a
sidebar-driven multi-page app with authentication, live order management,
a driver roster, a customer directory, basic analytics, and a settings
page with theme + language switching.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. Demo accounts:

- `priya@fdms.com` / `depot123` (Depot Manager)
- `admin@fdms.com` / `admin123` (Admin)

## What's in it

- **Routing** — `react-router-dom` with a shared `AppLayout` (sidebar +
  topbar) wrapping every authenticated page, a `ProtectedRoute` guard,
  a dynamic `/orders/:id` detail route (`useParams`), filter/pagination
  state kept in the URL on `/orders` (`useSearchParams`), and a 404 page.
- **Pages** — Login, Dashboard, Orders (search/filter/sort/paginate),
  Order Detail (edit assignment, advance/cancel/delete, status timeline),
  Drivers & Fleet, Customers (derived from live order data), Reports
  (revenue by fuel, orders by status, litres by city, top customers),
  and Settings.
- **Settings page** — theme toggle, **language switcher** (English /
  Tamil / Hindi), notification preferences, profile summary, and a
  "clear local data" reset — all persisted to `localStorage`.
- **Internationalisation** — `LanguageContext` + `src/i18n/translations.js`.
  Every page reads strings through `t(key)`; adding a language is just
  adding a dictionary object, no component changes required.
- **Shared state via Context** — orders now live in `OrdersContext`
  (a `useReducer` store, persisted to `localStorage`) so the Dashboard,
  Orders list, and Order Detail page all read/write the same data
  instead of each keeping its own copy.

## Where each hook is used, and why

| Hook | Where | Exact purpose |
|---|---|---|
| **useState** | `Login.jsx`, `Orders.jsx`, `Drivers.jsx`, `Settings.jsx`, `NewOrderModal.jsx`, `AppLayout.jsx` | Local component state: form fields, search text, modal open/close, the live clock, driver roster. |
| **useEffect** | `ThemeContext.jsx`, `AuthContext.jsx`, `LanguageContext.jsx`, `OrdersContext.jsx`, `SettingsContext.jsx`, `Dashboard.jsx`, `Login.jsx`, `OrderDetail.jsx` | Side effects: sync theme/language to `<html>` + `localStorage`, restore a saved session, load/persist the order list, run a live clock, sync the browser tab title, attach/detach a keyboard shortcut, autofocus fields, re-sync edit fields when the selected order changes. |
| **useContext** | `ThemeContext`, `AuthContext`, `LanguageContext`, `OrdersContext`, `SettingsContext` — consumed via `useTheme()`, `useAuth()`, `useLanguage()`, `useOrders()`, `useSettings()` | Global state shared across unrelated components without prop drilling: theme, auth, active language/translator, the shared order list, and notification preferences. |
| **useRef** | `Login.jsx`, `Dashboard.jsx`, `NewOrderModal.jsx`, `Settings.jsx` | Direct DOM access / mutable values that shouldn't trigger a re-render: autofocusing inputs, a `/`-shortcut search box reference, a failed-login counter, a "saved" flash timeout id. |
| **useCallback** | `AuthContext`, `OrdersContext` (`advanceStatus`, `cancelOrder`, `addOrder`, `updateOrder`, `deleteOrder`), `LanguageContext` (`t`), `Orders.jsx`, `Login.jsx` | Keep function identities stable across re-renders so they're safe to hand to `React.memo`-wrapped children (`OrderRow`, `StatusPill`) and to other hooks' dependency arrays. |
| **useMemo** | `Dashboard.jsx`, `Orders.jsx` (filter → search → sort pipeline), `OrderDetail.jsx`, `Reports.jsx` (each chart), `Customers.jsx`, `Login.jsx` (`passwordHint`), `NewOrderModal.jsx` (`preview`), context `value` objects | Avoid recomputing derived data (filtered/sorted lists, aggregated stats, price previews) on every render — only recompute when their actual inputs change. |
| **useReducer** | `AuthContext.jsx` (`authReducer`), `OrdersContext.jsx` (`ordersReducer`) | Models the login flow, and all order CRUD/status transitions, as explicit state machines instead of several independent `useState` calls that could get out of sync. |
| **useParams / useNavigate / useSearchParams / Link / NavLink / Outlet** | `OrderDetail.jsx`, `Orders.jsx`, `Sidebar.jsx`, `AppLayout.jsx` | Read the order id out of the URL, keep filters bookmarkable, highlight the active nav item, and render whichever child route matched inside the shared layout. |

## Project structure

```
src/
  context/
    ThemeContext.jsx     # theme (dark/light) via useContext
    AuthContext.jsx      # auth state machine via useReducer + useContext
    LanguageContext.jsx  # active language + t() translator via useContext
    OrdersContext.jsx    # shared order list via useReducer + useContext
    SettingsContext.jsx  # notification preferences via useContext
  i18n/
    translations.js      # en / ta / hi dictionaries
  layouts/
    AppLayout.jsx         # sidebar + topbar shell, renders <Outlet/>
  components/
    Navbar.jsx
    Sidebar.jsx
    ProtectedRoute.jsx
    StatusPill.jsx
    DispatchGauge.jsx
    OrderRow.jsx
    NewOrderModal.jsx
  pages/
    Login.jsx
    Dashboard.jsx
    Orders.jsx
    OrderDetail.jsx
    Drivers.jsx
    Customers.jsx
    Reports.jsx
    Settings.jsx
    NotFound.jsx
  data/
    seed.js              # mock users/orders/drivers standing in for the DB tables
  App.jsx
  main.jsx
  index.css
```

## Notes / next steps for a "real" backend

This is still a mock/demo data layer (localStorage + an in-memory seed).
To turn it into a production app you'd typically:

- Replace `AuthContext`'s fake `setTimeout` login with a real API call
  and JWT/session storage.
- Replace `OrdersContext`'s localStorage persistence with `fetch`/React
  Query calls to a real orders API, keeping the same reducer actions.
- Move `Drivers.jsx`'s local roster into its own context/API once other
  pages need to read it too.
- Add proper Tamil/Hindi coverage in `translations.js` (Hindi is
  intentionally partial right now, to show the fallback-to-English
  behaviour in `translate()`).
