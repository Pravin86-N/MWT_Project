# Fuel Delivery Management System (FDMS) — Role-Based Access Control (RBAC) Specification

## 1. Executive Summary & Domain Separation

In an enterprise fuel logistics operations network, **Platform Governance** and **Local Terminal Operations** have strictly distinct responsibilities:

1. **Admin (Platform Governance & Compliance):**
   - **Multi-Depot Visibility:** Oversight across all 5 regional terminals (`ALL`).
   - **Wholesale Fuel Tariffs:** Centrally establishes official base rates for fuels (HSD Diesel, MS Petrol, LPG, Kerosene, Jet A-1) and volume rebate tiers.
   - **Corporate Customer Onboarding:** Approves or rejects corporate credit accounts (GST, PAN, credit limit assessments).
   - **Staff & User Access Control:** Grants and revokes roles, assigns depot jurisdictions, toggles user access.
   - **Audit Trail & Regulatory Oversight:** Reviews immutable activity logs across logins, approvals, status overrides, and system changes.
   - *Operational Restriction:* Admin does **NOT** dispatch physical delivery tankers or trigger depot tank refills.

2. **Depot Manager (Operational Logistics & Dispatch):**
   - **Assigned Terminal Jurisdiction:** Strictly scoped to their local terminal (e.g., `DEP-CHN-01` Chennai, `DEP-CBE-05` Coimbatore).
   - **Tanker Fleet Management:** Registers delivery tankers, tracks maintenance, and assigns vehicle statuses.
   - **Driver Fleet & Duty Rosters:** Onboards local drivers, verifies hazardous materials transport licensing, and sets on-duty status.
   - **Physical Depot Vault Refills:** Initiates and records tank replenishment from oil marketing companies (IOCL, BPCL, HPCL).
   - **Smart Fuel Dispatch:** Matches approved customer delivery orders with available on-duty drivers and calibrated fuel tankers within their terminal jurisdiction.
   - *Governance Restriction:* Depot Manager **CANNOT** alter official fuel tariffs, approve new customer credit accounts, view platform-wide audit logs, or manage staff user credentials.

3. **Support Executive (Customer Service & Assistance):**
   - Read-oriented customer service role. Monitors customer order progress, answers customer inquiries, views delivery statuses, but cannot alter tariffs, approve accounts, or dispatch tankers.

4. **Auditor (Regulatory Compliance & Independent Verification):**
   - Read-only inspection role for statutory audits (Weights & Measures, PESO compliance). Inspects order manifests, transaction volumes, and full immutable audit logs. Cannot modify fleet, tariffs, or accounts.

5. **Customer (Commercial & Industrial Fuel Buyer):**
   - Self-service portal: places bulk fuel orders, tracks live tanker GPS dispatch, downloads computerized GST invoices, views credit limit consumption.

6. **Driver (Delivery Tanker Operator):**
   - Field operations portal: receives assigned delivery consignments, broadcasts live GPS coordinates and speed telemetry, confirms customer site delivery discharge.

---

## 2. Depot Registry & Jurisdictions

FDMS partitions Tamil Nadu into 5 regional operational hubs:

| Depot Code | Depot Name | City | District Coverage | Default Manager |
|---|---|---|---|---|
| `DEP-CHN-01` | Chennai Central Terminal | Chennai | Chennai, Kanchipuram, Tiruvallur, Chengalpattu | `pravin@123` |
| `DEP-SLM-02` | Salem Inland Fuel Hub | Salem | Salem, Namakkal, Dharmapuri, Erode | System Allocated |
| `DEP-MDU-03` | Madurai South Petroleum Base | Madurai | Madurai, Dindigul, Virudhunagar, Theni | System Allocated |
| `DEP-TRY-04` | Trichy Central Logistics Hub | Trichy | Tiruchirappalli, Thanjavur, Karur, Perambalur | System Allocated |
| `DEP-CBE-05` | Coimbatore Western Vault | Coimbatore | Coimbatore, Tiruppur, Nilgiris | `coimbatore.mgr@fdms.com` |

---

## 3. Comprehensive RBAC Matrix

| Resource / Endpoint | Action / Capability | Admin | Depot Mgr | Support | Auditor | Customer | Driver |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `/api/auth/users` | List all staff & customer accounts | ✅ (200) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `/api/auth/users/:id/role` | Promote/demote user roles | ✅ (200) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `/api/auth/users/:id/depot` | Assign staff depot jurisdiction | ✅ (200) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `/api/pricing` (GET) | View official fuel price tariffs | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/api/pricing/:code` (PUT) | Edit official wholesale fuel rates | ✅ (200) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `/api/registrations/:id/approve` | Approve corporate customer KYC | ✅ (200) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `/api/customers/:id` (DELETE) | Delete customer account | ✅ (200) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `/api/activities` (GET) | View system audit trail logs | ✅ (200) | ❌ (403) | ❌ (403) | ✅ (200) | ❌ (403) | ❌ (403) |
| `/api/inventory` (GET) | View storage tanks & fuel levels | ✅ (Global) | ✅ (Scoped) | ✅ | ✅ | ❌ | ❌ |
| `/api/inventory/refill` (POST) | Order physical depot tank refill | ❌ (403) | ✅ (200) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `/api/vehicles` (POST) | Register delivery tanker | ❌ (403) | ✅ (201) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `/api/vehicles/:id` (DELETE) | Decommission / delete vehicle | ✅ (200) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `/api/drivers` (POST) | Onboard driver to local fleet | ❌ (403) | ✅ (201) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `/api/drivers/:id` (DELETE) | Delete driver account | ✅ (200) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `/api/orders/:id/approve` | Authorize pending fuel order | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `/api/orders/:id/assign` | Assign tanker & driver (Dispatch) | ❌ (403) | ✅ (200) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) |
| `/api/orders` (POST) | Place new fuel purchase order | ✅ | ✅ | ❌ | ❌ | ✅ (201) | ❌ |
| `/api/orders/delivery-queue` | View active dispatch delivery queue | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ (200) |
| `/api/gps/broadcast` | Broadcast driver live location | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (200) |

---

## 4. Frontend Route Guards & UI Segregation

### Client Route Protection (`src/components/ProtectedRoute.jsx`)
Routes specify an `allowedRoles` array. If an authenticated user accesses a forbidden route, they are gracefully redirected to their designated landing page:
- **Admin & Depot Manager & Staff:** `/dashboard`
- **Customer:** `/customer-portal`
- **Driver:** `/driver-portal`

### Navigation Menu Differentiation (`src/components/Sidebar.jsx`)
- **Admin:**
  - Executive Dashboard, User Governance (`/users`), Fuel Pricing & Tariffs (`/pricing`), Customer Approvals (`/applications`), All Customers (`/customers`), Orders Oversight (`/orders`), Depot Storage Vaults (`/inventory`), Tanker Fleet (`/vehicles` - View Only), Drivers (`/drivers` - View Only), Live Fleet Map (`/map` - All Depots filter), Reports (`/reports` - Multi-depot selector), Audit Trail Logs (`/audit-logs`).
  - *Jurisdiction Chip:* "Tamil Nadu (All Depots)".
- **Depot Manager:**
  - Terminal Dashboard, Pending Approvals (`/pending-requests`), Dispatch Queue & Orders (`/orders`), Fleet Map (`/map` - Local Depot Locked Radar), Tanker Vehicles (`/vehicles` - Add/Manage), Drivers Roster (`/drivers` - Add/Manage), Depot Storage Tanks (`/inventory` - Refills enabled), Fuel Pricing (`/pricing` - View Only), Terminal Reports (`/reports` - Scoped).
  - *Jurisdiction Chip:* `DEP-CHN-01` or assigned depot badge.
- **Auditor:**
  - Audit Trail Logs, Inventory Telemetry, Order Manifests, Compliance Status.
- **Support Executive:**
  - Customer Accounts, Order Statuses, Delivery Verification, Support Tickets.

---

## 5. Demo Accounts

| Role | Email / Identifier | Password | Depot Jurisdiction |
|---|---|---|---|
| **Platform Admin** | `admin@fdms.com` | `admin123` | `ALL` (Global Oversight) |
| **Depot Manager (Chennai)** | `pravin@123` | `pravin123` | `DEP-CHN-01` (Chennai Central) |
| **Depot Manager (Coimbatore)** | `coimbatore.mgr@fdms.com` | `manager123` | `DEP-CBE-05` (Coimbatore Western) |
| **Support Executive** | `support@fdms.com` | `support123` | Multi-Depot Support |
| **Auditor** | `auditor@fdms.com` | `auditor123` | Platform Compliance |
| **Corporate Customer** | `customer@fdms.com` | `customer123` | Commercial Client |
| **Tanker Driver** | `driver@fdms.com` | `driver123` | Field Logistics |

---

## 6. Verification & Automated Test Suite

A comprehensive test suite is available in `backend/test_rbac_and_depots.js` verifying:
1. Token issuance and correct depot assignment for all 6 roles.
2. HTTP 403 enforcement on Admin-only routes when attempted by Depot Managers.
3. HTTP 403 enforcement on Depot Manager-only operations when attempted by Admins.
4. Tamper-proof depot scoping (`scopeToDepot`).
5. Customer order placement and Driver delivery queue access.

Run the test suite at any time via:
```bash
node backend/test_rbac_and_depots.js
```
Expected result: **44/44 Tests Passed (100% Success)**.
