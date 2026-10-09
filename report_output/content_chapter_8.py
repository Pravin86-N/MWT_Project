import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def build_chapter_8(doc, img_dir, helpers):
    add_chapter_header = helpers['add_chapter_header']
    add_heading_2 = helpers['add_heading_2']
    add_subheading = helpers['add_subheading']
    add_paragraph = helpers['add_paragraph']
    add_bullet = helpers['add_bullet']
    add_image_with_caption = helpers['add_image_with_caption']
    add_styled_table = helpers['add_styled_table']

    # ==================== CHAPTER 8 ====================
    add_chapter_header(doc, "8", "MODULES")

    # -------------------- 8.0 DESIGN APPROACH --------------------
    add_heading_2(doc, "8.0 DESIGN APPROACH")

    add_paragraph(
        doc,
        "The Smart Fuel Dispatch & Fleet Telemetry System is partitioned into domain-specific operational modules "
        "following high-cohesion, low-coupling design principles. Each module encapsulates an independent operational "
        "facet of the bulk petroleum supply chain—from identity verification and customer onboarding to physical tanker dispatch, "
        "live telemetry ingestion, underground vault monitoring, and administrative reporting."
    )

    add_paragraph(
        doc,
        "To ensure architectural consistency across the entire documentation, each operational module is evaluated against "
        "standard software engineering criteria: operational purpose and functional scope, non-functional constraints, "
        "workload scaling estimates, interface design (API endpoints), and database storage mapping. In strict accordance "
        "with report guidelines, detailed Low-Level Architecture (LLA) specifications and low-level component diagrams are "
        "focused exclusively on the first two foundational modules: Authentication & Access Control (Section 8.2) and "
        "Order & Dispatch Management (Section 8.3). The overall technology stack is presented once in Chapter 7 and is "
        "not repeated redundantly within each individual module."
    )

    # Design Approach Steps Table (Table #16)
    step_headers = ["Engineering Criterion", "Key Focus & Analytical Content"]
    step_data = [
        ["Purpose & Scope", "Defines the core operational responsibilities, target stakeholders, and business boundaries of the module."],
        ["Functional Requirements", "Enumerates the verifiable features, workflows, validation checks, and operational transitions."],
        ["Non-Functional Requirements", "Specifies system quality attributes, including security, latency, data integrity, and availability."],
        ["Scale & Workload Estimation", "Back-of-the-envelope quantitative sizing assessing daily transactions, memory, and storage growth."],
        ["Low-Level Architecture (Modules 1 & 2)", "Component structure, internal functions, data flow, and low-level architecture diagram."],
        ["API Interface Design", "RESTful HTTP endpoints, supported request methods, payload structures, and authorization guards."],
        ["Database Schema Design", "MongoDB collections, indexed fields, document references, and persistent state representations."],
        ["Operational Interfaces & Evidence", "Genuine application interface screenshots, annotated features, and user interaction walkthroughs."]
    ]
    step_widths = [2.2, 4.07]
    add_styled_table(doc, step_headers, step_data, step_widths)

    add_paragraph(
        doc,
        "Shared Architectural Baseline: All modules adhere to a common architectural baseline. Every incoming HTTP request "
        "from the React client passes through Express security layers, where CORS validates origin headers, Express JSON "
        "middleware parses request payloads, and the `protect` and `authorize` middleware verify JWT signatures and RBAC roles. "
        "Database transactions operate on MongoDB Atlas, ensuring consistent document reads and writes. Passwords are never "
        "stored in plaintext and are salted and hashed using bcryptjs. The sections that follow present the complete module specifications."
    )

    # -------------------- 8.1 FOLDER STRUCTURE --------------------
    add_heading_2(doc, "8.1 FOLDER STRUCTURE")

    add_paragraph(
        doc,
        "The project repository is strictly partitioned into two decoupled workspaces: a client-side React SPA workspace "
        "and a server-side Node.js/Express API workspace. This decoupled structure allows independent scaling, testing, "
        "and continuous deployment. The folder structure diagrams below illustrate the organization of the codebase."
    )

    add_subheading(doc, "Project Root Layout")
    add_paragraph(
        doc,
        "At the root directory level, configuration files govern dependencies, environment variables, build scripts, "
        "and deployment automation pipelines. Figure 8.1 illustrates the project root organization."
    )

    img_root = os.path.join(img_dir, "image6.png")
    add_image_with_caption(doc, img_root, "Figure 8.1: High-Level Project Root Directory Structure", width_inches=2.8)

    add_paragraph(
        doc,
        "Key root files include `package.json` and `package-lock.json` defining frontend dependencies, `vite.config.js` "
        "configuring build optimizations and development proxies, `index.html` acting as the single-page entry point, "
        "`Jenkinsfile` declaring the CI/CD stages, and `vercel.json` managing multi-service cloud hosting."
    )

    add_subheading(doc, "Backend Architecture and Folder Structure")
    add_paragraph(
        doc,
        "The backend server is entirely self-contained within the `backend/` directory. It adheres strictly to the "
        "Model-View-Controller design pattern, decoupling routing definitions from business controllers and database schemas. "
        "Figure 8.2 illustrates the backend directory layout."
    )

    img_backend = os.path.join(img_dir, "image7.png")
    add_image_with_caption(doc, img_backend, "Figure 8.2: Backend Architecture and Directory Layout", width_inches=2.8)

    add_paragraph(
        doc,
        "The backend structure contains seven core functional subdirectories: `config/` (database connection and environment setup), "
        "`controllers/` (business logic for authentication, orders, inventory, fleet, and reports), `middleware/` (JWT token "
        "verification and role authorization guards in `permissions.js`), `models/` (15 Mongoose schema definitions), `routes/` "
        "(13 mounted REST route modules), `uploads/` (secure local storage for customer KYC documents), and `utils/` (helper utilities)."
    )

    add_subheading(doc, "Frontend Architecture and Folder Structure")
    add_paragraph(
        doc,
        "The frontend is organized within the `src/` directory, following a feature-oriented component architecture. "
        "Figure 8.3 illustrates the frontend source organization."
    )

    img_frontend = os.path.join(img_dir, "image8.png")
    add_image_with_caption(doc, img_frontend, "Figure 8.3: Frontend Application Directory Layout (src/)", width_inches=2.8)

    add_paragraph(
        doc,
        "The frontend source is divided into: `components/` (14 reusable UI components like Navbar, Sidebar, StatCard, and Leaflet markers), "
        "`contexts/` (8 global React Context providers orchestrating authentication, orders, inventory, and notifications), "
        "`pages/` (22 specialized screen views for all stakeholder roles), `services/` (Axios API client and Socket.IO connection handlers), "
        "and `locales/` (translation dictionaries supporting English, Tamil, and Hindi)."
    )

    add_subheading(doc, "Client-Server Interaction Boundary")
    add_paragraph(
        doc,
        "The frontend React client never communicates directly with the MongoDB database. Every data operation is mediated "
        "via authenticated HTTP REST calls through Axios or real-time event packets via Socket.IO. The client attaches the "
        "JWT Bearer token to request headers, and the backend verifies permissions before executing database queries."
    )

    # -------------------- 8.2 AUTHENTICATION & ACCESS CONTROL --------------------
    add_heading_2(doc, "8.2 AUTHENTICATION & ACCESS CONTROL")

    add_paragraph(
        doc,
        "The Authentication & Access Control module is the foundational security gateway of the Smart Fuel Dispatch & "
        "Fleet Telemetry System. It governs identity verification, multi-factor authentication, session management, and "
        "Role-Based Access Control (RBAC) across six user roles: Administrator, Depot Manager, Customer, Driver, "
        "Support Executive, and Auditor."
    )

    add_subheading(doc, "Purpose and Operational Responsibilities")
    add_paragraph(
        doc,
        "The module ensures that only authenticated and authorized users access platform resources. It supports three distinct "
        "login modes: standard email and password, Google OAuth 2.0 single sign-on, and mobile phone OTP verification. "
        "Crucially, customer accounts in 'Pending Approval' or 'Rejected' states are strictly barred from logging in, ensuring "
        "that unverified businesses cannot place fuel orders or view pricing."
    )

    add_subheading(doc, "Functional Requirements")
    add_bullet(doc, "Multi-Modal Sign-In", "Supports email/password authentication, Google OAuth 2.0 social sign-in, and 6-digit SMS-ready OTP login.")
    add_bullet(doc, "Password Security", "Hashes all user passwords using bcryptjs with 10 salt rounds; plaintext passwords are never stored.")
    add_bullet(doc, "JWT Token Issuance", "Signs cryptographically secure JWT tokens containing user ID, email, and role, configured with a 30-day validity window.")
    add_bullet(doc, "Account Verification Gate", "Blocks login attempts from corporate customer accounts that have not received explicit administrative approval.")
    add_bullet(doc, "Role-Based Route Guards", "Enforces client-side navigation protection via `ProtectedRoute.jsx` and server-side API protection via `permissions.js`.")

    add_subheading(doc, "Non-Functional Requirements and Security Constraints")
    add_paragraph(
        doc,
        "Security: Passwords must withstand offline dictionary and rainbow table attacks via bcryptjs salting. "
        "Session tokens must be stateless, tamper-proof, and validated on every API call. "
        "Latency: Authentication verification, password hashing, and token generation must execute within 200 milliseconds. "
        "Availability: Authentication endpoints must maintain 99.9% uptime to prevent operational dispatch bottlenecks."
    )

    # Estimation Table for Auth
    add_subheading(doc, "Workload Scaling Estimation")
    auth_est_headers = ["Metric / Parameter", "Estimated Daily Volume", "Sizing & Capacity Basis"]
    auth_est_data = [
        ["Active User Base", "250 accounts", "Fleet drivers, depot personnel, customers, and corporate administrators."],
        ["Daily Login Operations", "600 sessions / day", "Average 2 to 3 logins per user per shift; peak logins during morning roster."],
        ["Password Verification Load", "0.01 ops / sec avg", "Handled effortlessly by single Node.js event loop with bcryptjs worker threads."],
        ["JWT Token Verifications", "15,000 req / day", "Every authenticated REST API request triggers synchronous cryptographic token verification."],
        ["Token Invalidation Overhead", "Negligible", "Stateless JWT verification eliminates server-side session lookup latency."]
    ]
    add_styled_table(doc, auth_est_headers, auth_est_data, [2.0, 1.8, 2.47])

    add_subheading(doc, "Detailed Low-Level Architecture (Module 1)")
    add_paragraph(
        doc,
        "The internal component structure of the Authentication module spans both frontend React architecture and backend Express modules:"
    )

    add_bullet(
        doc,
        "Frontend Components",
        "`Login.jsx` (presents tabbed authentication interfaces for password, Google OAuth, and OTP), `Register.jsx` (handles user registration), `ForgotPassword.jsx` (initiates password reset), and `AuthContext.jsx` (maintains reactive user state, token persistence in localStorage, and logout teardown)."
    )
    add_bullet(
        doc,
        "Backend Middleware & Controllers",
        "`authController.js` (contains `loginUser`, `registerUser`, `verifyOTP`, `googleAuth`, `getMe`, and `updateProfile`), `permissions.js` (middleware providing `protect` token verification and `authorize(...roles)` RBAC filtering), and `User.js` / `Otp.js` (Mongoose schema models)."
    )

    add_paragraph(
        doc,
        "Figure 8.4 illustrates the Low-Level Architecture diagram for the Authentication & Access Control module, "
        "detailing the exact data flow between the user interface, Express middleware, Google OAuth servers, and MongoDB Atlas."
    )

    img_lla_auth = os.path.join(img_dir, "image11.png")
    add_image_with_caption(
        doc,
        img_lla_auth,
        "Figure 8.4: Low-Level Architecture Diagram – Authentication & Access Control Module",
        width_inches=5.8
    )

    add_paragraph(
        doc,
        "Explanation of Low-Level Flow: When a user submits credentials in `Login.jsx`, Axios dispatches an HTTPS POST request "
        "to `/api/auth/login`. In `authController.js`, `loginUser` queries the `users` collection in MongoDB Atlas by email. "
        "If the user exists, `bcrypt.compare()` validates the plaintext password against the stored bcrypt hash. Next, the controller "
        "checks `user.isApproved` and `user.status`; if the account is a Customer that is pending or rejected, an HTTP 403 Forbidden "
        "response is immediately returned. Upon successful validation, `jwt.sign()` generates a signed JWT token containing `{ id, role }`. "
        "The response payload returns the token and sanitized user profile to `AuthContext.jsx`, which saves the token in `localStorage`, "
        "sets Axios default authorization headers, and redirects the user to their role-specific dashboard."
    )

    add_subheading(doc, "API Interface Design")
    auth_api_headers = ["HTTP Method", "REST Endpoint", "Role Access", "Description & Payload"]
    auth_api_data = [
        ["POST", "/api/auth/login", "Public", "Authenticates user with email and password; returns JWT token and profile."],
        ["POST", "/api/auth/register", "Public", "Registers new user account with default role Customer."],
        ["POST", "/api/auth/google", "Public", "Verifies Google OAuth 2.0 credential token; provisions or signs in user."],
        ["POST", "/api/auth/send-otp", "Public", "Generates 6-digit OTP code and records in MongoDB with 5-minute TTL."],
        ["POST", "/api/auth/verify-otp", "Public", "Validates mobile OTP code; issues JWT token upon successful match."],
        ["GET", "/api/auth/me", "All Roles (Auth)", "Fetches profile of currently authenticated user using Bearer token."],
        ["PUT", "/api/auth/profile", "All Roles (Auth)", "Updates display name, phone, or company profile parameters."]
    ]
    add_styled_table(doc, auth_api_headers, auth_api_data, [1.1, 1.8, 1.3, 2.07])

    add_subheading(doc, "Database Schema Design")
    auth_db_headers = ["Collection Name", "Access Pattern", "Indexing Strategy"]
    auth_db_data = [
        ["users", "Lookups by email, googleId, and _id", "Unique index on email; index on googleId; index on role."],
        ["otps", "Fast lookup by mobile number", "Index on mobile; TTL index on createdAt with 300 second auto-expiry."]
    ]
    add_styled_table(doc, auth_db_headers, auth_db_data, [1.6, 2.3, 2.37])

    add_subheading(doc, "Operational Interface and Evidence")
    add_paragraph(
        doc,
        "Figure 8.5 showcases the actual implemented Login Interface of the platform. The screen provides a clean, "
        "accessible user experience supporting standard credential input, Google OAuth one-click authentication, and mobile OTP verification."
    )

    img_login = os.path.join(img_dir, "image12.png")
    add_image_with_caption(
        doc,
        img_login,
        "Figure 8.5: User Login Interface with Multi-Modal Authentication Options",
        width_inches=5.8
    )

    add_paragraph(
        doc,
        "The interface includes real-time input validation, responsive visual feedback, password visibility toggles, and clear links "
        "for corporate account registration and password recovery. Role-based redirect logic immediately takes Administrators to the "
        "Executive Dashboard, Depot Managers to the Approval Center, Drivers to the Driver Duty Portal, and Customers to the Order Portal."
    )

    # -------------------- 8.3 ORDER & DISPATCH MANAGEMENT --------------------
    add_heading_2(doc, "8.3 ORDER & DISPATCH MANAGEMENT")

    add_paragraph(
        doc,
        "The Order & Dispatch Management module is the commercial and operational core of the platform. It orchestrates "
        "the complete lifecycle of bulk petroleum transactions—from customer order placement and dynamic pricing to "
        "depot managerial approvals, automated inventory reservations, intelligent tanker/driver dispatch, and delivery proof generation."
    )

    add_subheading(doc, "Purpose and Operational Responsibilities")
    add_paragraph(
        doc,
        "The module bridges corporate fuel demand with physical depot supply and fleet capacity. When an order is created, "
        "it calculates real-time tariffs, enforces minimum volume thresholds (100 L), and places the order in a pending queue. "
        "Depot Managers review pending requests, inspect real-time vault capacity, and approve or reject requests. Approving an "
        "order atomically reserves stock in the underground tank to prevent overselling. The module also features a Smart Dispatch "
        "algorithm that evaluates tanker distance and road proximity using the Haversine formula to recommend the optimal tanker."
    )

    add_subheading(doc, "Functional Requirements")
    add_bullet(doc, "Order Creation & Pricing", "Enables verified corporate customers to place orders; computes base price, 18% GST, and freight charges.")
    add_bullet(doc, "Managerial Review & Approval", "Provides an Approval Center for Depot Managers to inspect customer requests and approve or reject orders.")
    add_bullet(doc, "Atomic Stock Reservation", "Atomically increments `reservedStock` in the depot tank when an order is approved, locking stock.")
    add_bullet(doc, "Smart Dispatch Recommendation", "Calculates Euclidean distances to available tankers using Haversine equations, recommending the nearest tanker.")
    add_bullet(doc, "Driver & Tanker Assignment", "Assigns an available tanker and driver, transitioning the order to 'Assigned' and 'Dispatched' states.")
    add_bullet(doc, "Delivery Completion & Stock Deduction", "Marks deliveries complete upon driver confirmation, deducts vault stock, and generates digital invoices.")

    add_subheading(doc, "Non-Functional Requirements and Operational Constraints")
    add_paragraph(
        doc,
        "Consistency & Concurrency: Fuel stock reservation must be atomic to eliminate race conditions between simultaneous orders. "
        "Accuracy: Financial computations (fuel amount, 18% GST, delivery fee) must maintain exact double-precision arithmetic. "
        "Throughput: Order querying, filtering, and status transitions must execute under 150 milliseconds."
    )

    # Estimation Table for Orders
    add_subheading(doc, "Workload Scaling Estimation")
    order_est_headers = ["Metric / Parameter", "Estimated Daily Volume", "Sizing & Capacity Basis"]
    order_est_data = [
        ["Daily Fuel Orders", "80 - 150 orders / day", "Corporate fleets, manufacturing plants, and regional fuel stations."],
        ["Average Order Volume", "3,500 Liters / order", "Bulk diesel and petrol shipments ranging from 500 L to 15,000 L."],
        ["Total Daily Fuel Flow", "~450,000 Liters / day", "Aggregated throughput across regional depot distribution tanks."],
        ["Order Document Storage", "~1.2 MB / day", "BSON document footprint with delivery addresses, timestamps, and audit notes."],
        ["Annual Data Footprint", "~450 MB / year", "Extremely lightweight; easily maintained within MongoDB Atlas standard tiers."]
    ]
    add_styled_table(doc, order_est_headers, order_est_data, [2.0, 1.8, 2.47])

    add_subheading(doc, "Detailed Low-Level Architecture (Module 2)")
    add_paragraph(
        doc,
        "The internal component structure of the Order & Dispatch Management module comprises the following components:"
    )

    add_bullet(
        doc,
        "Frontend Components",
        "`Orders.jsx` (order management register with multi-criteria filters, search, and CSV export), `PendingRequests.jsx` (Depot Manager approval queue), `OrderDetail.jsx` (detailed order invoice and dispatch timeline), and `OrderContext.jsx` (manages global order state via useReducer)."
    )
    add_bullet(
        doc,
        "Backend Controllers & Models",
        "`orderController.js` (executes `createOrder`, `approveOrder`, `rejectOrder`, `assignDriverTanker`, `updateOrderStatus`, `getSmartDispatchRecommendation`, and `completeDelivery`), `Order.js` (core Mongoose schema), `pricingController.js` (fuel price lookups), and `inventoryController.js` (tank stock reservation and deduction)."
    )

    add_paragraph(
        doc,
        "Figure 8.6 illustrates the Low-Level Architecture diagram for the Order & Dispatch Management module, "
        "depicting the complete data flow from order submission to depot stock deduction and driver dispatch."
    )

    img_lla_order = os.path.join(img_dir, "image13.png")
    add_image_with_caption(
        doc,
        img_lla_order,
        "Figure 8.6: Low-Level Architecture Diagram – Order & Dispatch Management Module",
        width_inches=5.8
    )

    add_paragraph(
        doc,
        "Explanation of Low-Level Flow: When an order is placed, `orderController.js` fetches active tariffs from `FuelPricing` "
        "to calculate base price, 18% GST, and freight. When the Depot Manager clicks 'Approve' in `PendingRequests.jsx`, an HTTP PUT request "
        "triggers `approveOrder`. The controller verifies that available stock (`currentStock - reservedStock`) in the matching `Tank` exceeds "
        "the requested volume. If verified, Mongoose atomically updates `reservedStock += quantity` on the tank and advances the order status "
        "to 'Approved'. When the manager invokes the Smart Dispatch endpoint, the system calculates the Haversine distance between the delivery "
        "coordinates and all active `Vehicle` positions, recommending the nearest tanker. Assigning a driver and tanker transitions the order "
        "to 'Assigned'. When the driver confirms delivery, `completeDelivery` decrements both `currentStock` and `reservedStock` by the order volume, "
        "transitions the vehicle back to 'Available', updates driver trip counts, and emits a real-time completion alert via Socket.IO."
    )

    add_paragraph(
        doc,
        "Figure 8.7 illustrates the complete Order Lifecycle state machine and its direct synchronization with underground storage vault stock."
    )

    img_lifecycle = os.path.join(img_dir, "image16.png")
    add_image_with_caption(
        doc,
        img_lifecycle,
        "Figure 8.7: Fuel Order Lifecycle State Machine and Depot Tank Stock Impact",
        width_inches=5.8
    )

    add_subheading(doc, "API Interface Design")
    order_api_headers = ["HTTP Method", "REST Endpoint", "Role Access", "Description & Payload"]
    order_api_data = [
        ["POST", "/api/orders", "Customer, Admin", "Creates new fuel order with customer details, fuel type, volume, and site address."],
        ["GET", "/api/orders", "All Roles (Auth)", "Retrieves order register; customers view own orders; managers view all orders."],
        ["GET", "/api/orders/:id", "All Roles (Auth)", "Fetches detailed order specification, pricing breakdown, and dispatch status."],
        ["PUT", "/api/orders/:id/approve", "Depot Manager, Admin", "Approves pending order and atomically reserves fuel stock in matching tank."],
        ["PUT", "/api/orders/:id/reject", "Depot Manager, Admin", "Rejects order request with justification notes; unlocks reserved stock if any."],
        ["PUT", "/api/orders/:id/assign", "Depot Manager, Admin", "Assigns tanker vehicle and driver; updates status to 'Assigned'."],
        ["PUT", "/api/orders/:id/status", "Depot Manager, Driver", "Advances lifecycle status: Dispatched, In Transit, Delivered, Cancelled."],
        ["GET", "/api/orders/:id/smart-dispatch", "Depot Manager, Admin", "Calculates Haversine distance and recommends nearest available tanker."]
    ]
    add_styled_table(doc, order_api_headers, order_api_data, [1.1, 1.8, 1.3, 2.07])

    add_subheading(doc, "Database Schema Design")
    order_db_headers = ["Collection Name", "Access Pattern", "Indexing Strategy"]
    order_db_data = [
        ["orders", "Lookups by orderNumber, customerId, status, and createdAt", "Unique index on orderNumber; compound indexes on (customerId, createdAt) and (status, createdAt)."],
        ["tanks", "Atomic updates for stock reservation and deduction", "Index on fuelType; index on tankName."]
    ]
    add_styled_table(doc, order_db_headers, order_db_data, [1.6, 2.3, 2.37])

    add_subheading(doc, "Operational Interfaces and Evidence")
    add_paragraph(
        doc,
        "Figure 8.8 illustrates the Depot Manager Approval Center (`PendingRequests.jsx`), where incoming customer orders "
        "are reviewed, verified against vault stock, and either approved or rejected with operational notes."
    )

    img_approvals = os.path.join(img_dir, "image14.png")
    add_image_with_caption(
        doc,
        img_approvals,
        "Figure 8.8: Depot Manager Approval Center (Pending Requests Management)",
        width_inches=5.8
    )

    add_paragraph(
        doc,
        "Figure 8.9 showcases the Orders Management page (`Orders.jsx`), providing comprehensive search, status filtering, "
        "CSV export functionality, and direct links to order details and dispatch tracking."
    )

    img_orders = os.path.join(img_dir, "image15.png")
    add_image_with_caption(
        doc,
        img_orders,
        "Figure 8.9: Orders Management Register with Multi-Criteria Search, Filters, and CSV Export",
        width_inches=5.8
    )

    # -------------------- 8.4 FLEET, DRIVER & GPS TELEMETRY --------------------
    add_heading_2(doc, "8.4 FLEET, DRIVER & GPS TELEMETRY")

    add_paragraph(
        doc,
        "The Fleet, Driver & GPS Telemetry module provides real-time geospatial monitoring, asset management, and "
        "telemetry diagnostics for transport resources. It tracks mobile tankers and drivers across transit routes, "
        "capturing live GPS coordinates, vehicle diagnostic parameters, and duty status."
    )

    add_subheading(doc, "Purpose and Scope")
    add_paragraph(
        doc,
        "The module ingests continuous coordinate streams from mobile GPS modems or driver mobile devices via REST and WebSockets. "
        "It renders live vehicle positions on an interactive Leaflet map of Tamil Nadu, draws historical breadcrumb trails "
        "(up to 1,000 points per vehicle), and monitors critical diagnostic parameters including fuel level, tyre pressure, and engine temperature."
    )

    add_subheading(doc, "Functional Requirements")
    add_bullet(doc, "Real-Time GPS Map", "Renders tanker locations dynamically on an interactive map using custom colored icons reflecting vehicle status.")
    add_bullet(doc, "Telemetry Breadcrumbs", "Stores chronological historical location points in `VehicleLocation`, allowing route replay and audit.")
    add_bullet(doc, "Driver Workforce Management", "Maintains driver profiles, duty status toggles (Available, On Duty, Inactive), and trip counters.")
    add_bullet(doc, "Tanker Diagnostic Tracking", "Monitors onboard tank fill percentage, diagnostic tyre pressure (PSI), and engine coolant temperature (°C).")

    # Estimation Table for Fleet
    add_subheading(doc, "Workload Scaling Estimation")
    fleet_est_headers = ["Metric / Parameter", "Estimated Daily Volume", "Sizing & Capacity Basis"]
    fleet_est_data = [
        ["Active Tanker Fleet", "25 vehicles", "Fleet of heavy commercial fuel tankers operating across regional depot corridors."],
        ["Telemetry Ping Frequency", "Every 15 - 30 seconds", "Periodic GPS updates transmitted during transit operations."],
        ["Daily Location Pings", "~40,000 pings / day", "Aggregated coordinate packets ingested via REST and Socket.IO."],
        ["Historical Data Storage", "~4.8 MB / day", "Append-only BSON telemetry documents stored in VehicleLocation collection."]
    ]
    add_styled_table(doc, fleet_est_headers, fleet_est_data, [2.0, 1.8, 2.47])

    add_subheading(doc, "API Interface Design")
    fleet_api_headers = ["HTTP Method", "REST Endpoint", "Role Access", "Description & Payload"]
    fleet_api_data = [
        ["GET", "/api/vehicles", "All Roles (Auth)", "Retrieves tanker vehicles register with diagnostic and telemetry status."],
        ["POST", "/api/vehicles", "Depot Manager, Admin", "Registers new tanker vehicle with plate number, cargo type, and capacity."],
        ["POST", "/api/vehicles/location", "Driver, System", "Ingests GPS telemetry ping (lat, lng, speed, heading, vehicleId)."],
        ["GET", "/api/vehicles/:id/history", "All Roles (Auth)", "Fetches chronological GPS breadcrumb history for route visualization."],
        ["GET", "/api/drivers", "All Roles (Auth)", "Retrieves driver workforce roster, duty status, and assigned vehicles."],
        ["POST", "/api/drivers", "Depot Manager, Admin", "Onboards new driver with contact details, license number, and vehicle."]
    ]
    add_styled_table(doc, fleet_api_headers, fleet_api_data, [1.1, 1.8, 1.3, 2.07])

    add_subheading(doc, "Database Schema Design")
    fleet_db_headers = ["Collection Name", "Access Pattern", "Indexing Strategy"]
    fleet_db_data = [
        ["vehicles", "Lookups by vehicleNumber and status", "Unique index on vehicleNumber; index on status."],
        ["drivers", "Lookups by phone, licenseNumber, and status", "Unique index on phone; index on status."],
        ["VehicleLocation", "High-frequency historical queries", "Compound index on (vehicleId, timestamp descending)."]
    ]
    add_styled_table(doc, fleet_db_headers, fleet_db_data, [1.6, 2.3, 2.37])

    add_subheading(doc, "Operational Interfaces and Evidence")
    add_paragraph(
        doc,
        "Figure 8.10 showcases the Fleet GPS Control Center (`FleetMap.jsx`), featuring an interactive Leaflet map of Tamil Nadu "
        "with real-time tanker coordinate markers, route paths, and detailed vehicle status popup cards."
    )

    img_fleet_map = os.path.join(img_dir, "image18.png")
    add_image_with_caption(
        doc,
        img_fleet_map,
        "Figure 8.10: Fleet GPS Control Center with Interactive Real-Time Map and Telemetry Cards",
        width_inches=5.8
    )

    add_paragraph(
        doc,
        "Figure 8.11 illustrates the Driver Workforce and Duty Roster interface (`Drivers.jsx`), allowing managers to register "
        "drivers, assign vehicles, monitor completed trips, and adjust operational duty states."
    )

    img_drivers = os.path.join(img_dir, "image19.png")
    add_image_with_caption(
        doc,
        img_drivers,
        "Figure 8.11: Driver Workforce and Duty Roster Management Interface",
        width_inches=5.8
    )

    add_paragraph(
        doc,
        "Figure 8.12 displays the Fleet Tanker Vehicles Management interface (`Vehicles.jsx`), summarizing asset availability, "
        "cargo specifications, and onboard telemetry parameters."
    )

    img_vehicles = os.path.join(img_dir, "image20.png")
    add_image_with_caption(
        doc,
        img_vehicles,
        "Figure 8.12: Fleet Tanker Vehicles Management Register and Status Controls",
        width_inches=5.8
    )

    # -------------------- 8.5 INVENTORY & FUEL PRICING --------------------
    add_heading_2(doc, "8.5 INVENTORY & FUEL PRICING")

    add_paragraph(
        doc,
        "The Inventory & Fuel Pricing module maintains oversight of depot petroleum storage vaults and central commercial rates. "
        "It monitors underground vault capacity, tracks reserved stock allocations, alerts managers to low-stock conditions, and "
        "maintains transparent fuel pricing across all supported petroleum types."
    )

    add_subheading(doc, "Purpose and Scope")
    add_paragraph(
        doc,
        "Depot vaults store thousands of liters of volatile hydrocarbons. The module prevents physical stock-outs by tracking "
        "both gross physical inventory and committed reservations in real time. Virtual schema getters calculate available stock "
        "and fill percentages, automatically triggering visual warnings when stock falls below configured safety thresholds. "
        "The pricing subsystem manages base prices per liter, standard tax percentages (18% GST), and delivery freight rates."
    )

    add_subheading(doc, "Functional Requirements")
    add_bullet(doc, "Vault Telemetry Tracking", "Tracks physical volume, reserved volume, fill percentage, temperature (°C), and pressure (PSI).")
    add_bullet(doc, "Low-Stock Alarms", "Automatically generates visual warning badges and alert notifications when stock drops below minimum threshold.")
    add_bullet(doc, "Vault Refill Operations", "Allows depot managers to record bulk replenishment deliveries, updating current stock and refill history.")
    add_bullet(doc, "Dynamic Pricing Engine", "Maintains real-time commercial prices per liter, GST percentages, and freight rates for Diesel, Petrol, and CNG.")

    # Estimation Table for Inventory
    add_subheading(doc, "Workload Scaling Estimation")
    inv_est_headers = ["Metric / Parameter", "Estimated Daily Volume", "Sizing & Capacity Basis"]
    inv_est_data = [
        ["Monitored Depot Vaults", "10 - 20 storage tanks", "Regional underground storage tanks holding Diesel, Petrol, Premium Diesel, and CNG."],
        ["Stock Updates / Day", "150 - 300 transactions", "Triggered automatically upon order approvals, dispatches, and bulk replenishments."],
        ["Price Adjustments", "1 - 2 updates / week", "Commercial tariff revisions updated periodically by corporate administration."]
    ]
    add_styled_table(doc, inv_est_headers, inv_est_data, [2.0, 1.8, 2.47])

    add_subheading(doc, "API Interface Design")
    inv_api_headers = ["HTTP Method", "REST Endpoint", "Role Access", "Description & Payload"]
    inv_api_data = [
        ["GET", "/api/inventory", "All Roles (Auth)", "Fetches depot vault list with capacity, current stock, reserved stock, and status."],
        ["POST", "/api/inventory", "Depot Manager, Admin", "Creates new vault record with capacity, fuel type, and safety threshold."],
        ["PUT", "/api/inventory/:id/refill", "Depot Manager, Admin", "Records bulk fuel replenishment; increments physical stock and logs refill."],
        ["GET", "/api/pricing", "All Roles (Auth)", "Fetches active pricing tariffs for all fuel types including GST and delivery charge."],
        ["PUT", "/api/pricing/:code", "Admin", "Updates tariff rates per liter, tax rate, or delivery fee for specified fuel code."]
    ]
    add_styled_table(doc, inv_api_headers, inv_api_data, [1.1, 1.8, 1.3, 2.07])

    add_subheading(doc, "Database Schema Design")
    inv_db_headers = ["Collection Name", "Access Pattern", "Indexing Strategy"]
    inv_db_data = [
        ["tanks", "Lookups by fuelType and tankName", "Index on fuelType; index on tankName."],
        ["fuelpricings", "Lookups by fuel code", "Unique index on code (DSL, PTL, PDSL, CNG)."]
    ]
    add_styled_table(doc, inv_db_headers, inv_db_data, [1.6, 2.3, 2.37])

    add_subheading(doc, "Operational Interface and Evidence")
    add_paragraph(
        doc,
        "Figure 8.13 showcases the Depot Fuel Vault Telemetry screen (`Inventory.jsx`), displaying storage tank cards with "
        "dynamic gauge bars, temperature and pressure telemetry, and interactive refill controls."
    )

    img_inv = os.path.join(img_dir, "image22.png")
    add_image_with_caption(
        doc,
        img_inv,
        "Figure 8.13: Depot Fuel Vault Telemetry and Storage Tanks Management Interface",
        width_inches=5.8
    )

    # -------------------- 8.6 CUSTOMER, REGISTRATION & DOCUMENT MANAGEMENT --------------------
    add_heading_2(doc, "8.6 CUSTOMER, REGISTRATION & DOCUMENT MANAGEMENT")

    add_paragraph(
        doc,
        "The Customer, Registration & Document Management module implements corporate Know-Your-Customer (KYC) onboarding "
        "and corporate account administration. Because bulk fuel is a regulated commercial commodity, corporate buyers must undergo "
        "statutory verification before gaining order capabilities."
    )

    add_subheading(doc, "Purpose and Scope")
    add_paragraph(
        doc,
        "The module provides a self-service registration portal where companies submit corporate identification, GSTIN, PAN, "
        "office addresses, contact coordinates, and projected fuel volumes. Applicants upload statutory verification documents "
        "(incorporation certificates, tax registrations) via multipart form uploads handled by Multer. Submissions are queued "
        "for administrative review. Approving an application automatically creates a verified Customer user account and dispatches an acceptance notification."
    )

    add_subheading(doc, "Functional Requirements")
    add_bullet(doc, "Corporate Registration Form", "Captures company trade name, contact person, email, phone, GSTIN, PAN, and delivery address.")
    add_bullet(doc, "KYC Document Upload", "Supports multipart file uploads (PDF, DOC, DOCX, PNG, JPEG) up to 10 MB per document using Multer.")
    add_bullet(doc, "Reviewer Approval Workflow", "Allows Depot Managers and Admins to inspect applications, view uploaded files, and approve or reject submissions.")
    add_bullet(doc, "Customer Master Directory", "Maintains an active directory of verified corporate clients with order history and compliance status.")

    # Estimation Table for Customer
    add_subheading(doc, "Workload Scaling Estimation")
    cust_est_headers = ["Metric / Parameter", "Estimated Daily Volume", "Sizing & Capacity Basis"]
    cust_est_data = [
        ["Onboarding Applications", "5 - 15 applications / week", "Commercial fleet operators, manufacturing plants, infrastructure builders."],
        ["Document Storage Growth", "~15 - 50 MB / month", "Statutory PDF/JPEG business documents stored in secure backend upload directory."],
        ["Verified Corporate Accounts", "150+ active companies", "Maintaining active enterprise fuel procurement accounts."]
    ]
    add_styled_table(doc, cust_est_headers, cust_est_data, [2.0, 1.8, 2.47])

    add_subheading(doc, "API Interface Design")
    cust_api_headers = ["HTTP Method", "REST Endpoint", "Role Access", "Description & Payload"]
    cust_api_data = [
        ["POST", "/api/registrations", "Public", "Submits corporate registration application with multipart document uploads."],
        ["GET", "/api/registrations", "Depot Manager, Admin", "Retrieves application queue filtered by status (Pending, Approved, Rejected)."],
        ["PUT", "/api/registrations/:id/status", "Depot Manager, Admin", "Approves or rejects application; provisions User account upon approval."],
        ["GET", "/api/customers", "All Roles (Auth)", "Fetches verified corporate customers directory with order volume summaries."]
    ]
    add_styled_table(doc, cust_api_headers, cust_api_data, [1.1, 1.8, 1.3, 2.07])

    add_subheading(doc, "Database Schema Design")
    cust_db_headers = ["Collection Name", "Access Pattern", "Indexing Strategy"]
    cust_db_data = [
        ["customerregistrations", "Lookups by regId, email, and status", "Unique index on regId; index on email; index on status."]
    ]
    add_styled_table(doc, cust_db_headers, cust_db_data, [1.6, 2.3, 2.37])

    add_subheading(doc, "Operational Interfaces and Evidence")
    add_paragraph(
        doc,
        "Figure 8.14 illustrates the Customer Applications and KYC Approvals portal (`Applications.jsx`), where managers "
        "inspect incoming corporate registrations, review uploaded tax documents, and approve accounts."
    )

    img_apps = os.path.join(img_dir, "image24.png")
    add_image_with_caption(
        doc,
        img_apps,
        "Figure 8.14: Customer Applications and KYC Review Approval Portal",
        width_inches=5.8
    )

    add_paragraph(
        doc,
        "Figure 8.15 displays the Corporate Customers Directory (`Customers.jsx`), summarizing active clients, contact information, "
        "registered fuel consumption, and verification statuses."
    )

    img_cust = os.path.join(img_dir, "image25.png")
    add_image_with_caption(
        doc,
        img_cust,
        "Figure 8.15: Corporate Customers Directory and Account Verification Overview",
        width_inches=5.8
    )

    # -------------------- 8.7 NOTIFICATIONS, AUDIT LOGS & REPORTS --------------------
    add_heading_2(doc, "8.7 NOTIFICATIONS, AUDIT LOGS & REPORTS")

    add_paragraph(
        doc,
        "The Notifications, Audit Logs & Reports module delivers system observability, compliance tracking, and business intelligence. "
        "It broadcasts real-time operational alerts across WebSockets, preserves an immutable audit trail of critical events, and "
        "generates multi-dimensional executive reports."
    )

    add_subheading(doc, "Purpose and Scope")
    add_paragraph(
        doc,
        "Operational supply chain logistics requires immediate event awareness and verifiable accountability. This module "
        "generates targeted notifications whenever key events occur (order placed, approved, dispatched, delivered, low stock alarm) "
        "and streams them to connected users via Socket.IO. Simultaneously, an immutable audit logging service records every "
        "state-altering action with the user ID, role, action, target entity, IP address, and timestamp. The analytics engine aggregates "
        "historical data into revenue charts, fuel breakdown summaries, and exportable reports."
    )

    add_subheading(doc, "Functional Requirements")
    add_bullet(doc, "Real-Time Event Notifications", "Pushes instant alerts to user and role rooms via Socket.IO; tracks read/unread status in database.")
    add_bullet(doc, "Immutable System Audit Trail", "Records every security and operational event (Login, Order Approved, Stock Refilled) with user metadata.")
    add_bullet(doc, "Audit Log Search & Filters", "Enables Auditors and Admins to filter logs by user role, action type, date range, and keyword.")
    add_bullet(doc, "Executive Delivery Analytics", "Aggregates revenue, fuel volume by category, order counts, and top customers with CSV/Excel export.")

    # Estimation Table for Reports
    add_subheading(doc, "Workload Scaling Estimation")
    rep_est_headers = ["Metric / Parameter", "Estimated Daily Volume", "Sizing & Capacity Basis"]
    rep_est_data = [
        ["Event Notifications", "~500 alerts / day", "Order status changes, approvals, dispatch alerts, and stock threshold warnings."],
        ["Audit Log Records", "~1,200 records / day", "Captures user logins, approvals, stock modifications, and profile changes."],
        ["Analytical Query Load", "50 - 100 queries / day", "Depot manager dashboards, executive analytics, and end-of-day reconciliation."]
    ]
    add_styled_table(doc, rep_est_headers, rep_est_data, [2.0, 1.8, 2.47])

    add_subheading(doc, "API Interface Design")
    rep_api_headers = ["HTTP Method", "REST Endpoint", "Role Access", "Description & Payload"]
    rep_api_data = [
        ["GET", "/api/notifications", "All Roles (Auth)", "Retrieves notification feed for currently authenticated user/role."],
        ["PUT", "/api/notifications/:id/read", "All Roles (Auth)", "Marks specified notification as read in MongoDB."],
        ["GET", "/api/activity-logs", "Admin, Auditor", "Queries immutable audit trail with search, role, and action filters."],
        ["GET", "/api/reports/analytics", "Depot Manager, Admin", "Generates aggregated revenue, fuel volume, and delivery metrics."],
        ["GET", "/api/reports/export", "Depot Manager, Admin", "Exports comprehensive operational and dispatch reports as CSV/Excel."]
    ]
    add_styled_table(doc, rep_api_headers, rep_api_data, [1.1, 1.8, 1.3, 2.07])

    add_subheading(doc, "Database Schema Design")
    rep_db_headers = ["Collection Name", "Access Pattern", "Indexing Strategy"]
    rep_db_data = [
        ["notifications", "Lookups by userId, role, and read status", "Index on userId; index on role; index on createdAt descending."],
        ["activitylogs", "Filtered queries by action, userRole, and timestamp", "Compound index on (action, createdAt descending); index on userId."]
    ]
    add_styled_table(doc, rep_db_headers, rep_db_data, [1.6, 2.3, 2.37])

    add_subheading(doc, "Operational Interfaces and Evidence")
    add_paragraph(
        doc,
        "Figure 8.16 displays the Executive Delivery Analytics & Reports interface (`Reports.jsx`), featuring interactive KPI tabs, "
        "revenue metrics, fuel volume breakdown charts, and report export controls."
    )

    img_reports = os.path.join(img_dir, "image27.png")
    add_image_with_caption(
        doc,
        img_reports,
        "Figure 8.16: Executive Fuel Delivery Analytics and Comprehensive Reporting Interface",
        width_inches=5.8
    )

    add_paragraph(
        doc,
        "Figure 8.17 illustrates the System Audit Logs and Activity Trail interface (`AuditLogs.jsx`), presenting a searchable, "
        "verifiable chronological record of all user operations, action types, timestamps, and IP addresses."
    )

    img_audit = os.path.join(img_dir, "image28.png")
    add_image_with_caption(
        doc,
        img_audit,
        "Figure 8.17: System Audit Logs and Compliance Activity Trail Interface",
        width_inches=5.8
    )

    # -------------------- 8.8 DASHBOARD, SETTINGS, LOCALISATION & ASSISTANT --------------------
    add_heading_2(doc, "8.8 DASHBOARD, SETTINGS, LOCALISATION & ASSISTANT")

    add_paragraph(
        doc,
        "The Dashboard, Settings, Localisation & Assistant module delivers customized user experiences across all six stakeholder roles. "
        "It provides role-specific dashboards, responsive visual themes, multilingual accessibility, and an operational AI logistics assistant."
    )

    add_subheading(doc, "Purpose and Scope")
    add_paragraph(
        doc,
        "Different operational roles require distinct interface layouts. The Depot Manager requires operational throughput metrics "
        "(pending approvals, vault stock, in-transit tankers), while the Customer needs a streamlined ordering portal, and the "
        "Administrator requires enterprise governance controls. The module also manages user preferences (dark/light themes, "
        "alert sounds) and full interface localisation supporting English, Tamil, and Hindi. The integrated Fuel Logistics Assistant "
        "answers operational inquiries using live database state."
    )

    add_subheading(doc, "Functional Requirements")
    add_bullet(doc, "Role-Specific Dashboards", "Renders tailored operational overviews: Depot Operations Center, Admin Dashboard, Customer Portal, Driver Portal.")
    add_bullet(doc, "Multilingual Localisation", "Provides client-side translation dictionaries supporting English, Tamil, and Hindi, switchable instantly.")
    add_bullet(doc, "Theme Switching", "Supports light and dark UI themes with preference persistence in browser `localStorage`.")
    add_bullet(doc, "Fuel Logistics Assistant", "Interactive floating assistant analyzing live orders and tanks to provide rapid operational answers.")

    # Estimation Table for Dashboard
    add_subheading(doc, "Workload Scaling Estimation")
    dash_est_headers = ["Metric / Parameter", "Estimated Daily Volume", "Sizing & Capacity Basis"]
    dash_est_data = [
        ["Dashboard Page Views", "1,500 - 3,000 views / day", "Frequent refreshes and live socket updates across operational workstations."],
        ["Localisation Dictionary Size", "~45 KB total", "Lightweight JSON translation dictionaries cached in browser client bundle."],
        ["Assistant Inquiries", "100 - 250 queries / day", "Fast in-memory rule evaluation against active order and inventory states."]
    ]
    add_styled_table(doc, dash_est_headers, dash_est_data, [2.0, 1.8, 2.47])

    add_subheading(doc, "API Interface Design")
    dash_api_headers = ["HTTP Method", "REST Endpoint", "Role Access", "Description & Payload"]
    dash_api_data = [
        ["GET", "/api/dashboard/stats", "All Roles (Auth)", "Fetches aggregated KPI metrics tailored to role of requesting user."],
        ["GET", "/api/settings", "All Roles (Auth)", "Retrieves user interface preferences, notification triggers, and active locale."],
        ["PUT", "/api/settings", "All Roles (Auth)", "Updates user theme, language choice, and notification alert preferences."]
    ]
    add_styled_table(doc, dash_api_headers, dash_api_data, [1.1, 1.8, 1.3, 2.07])

    add_subheading(doc, "Database Schema Design")
    dash_db_headers = ["Collection Name", "Access Pattern", "Indexing Strategy"]
    dash_db_data = [
        ["users", "Lookups by _id for settings persistence", "Primary key index on _id."],
        ["orders, tanks, vehicles", "Aggregated metric reads for dashboard cards", "Indexed on status, fuelType, and createdAt."]
    ]
    add_styled_table(doc, dash_db_headers, dash_db_data, [1.6, 2.3, 2.37])

    add_subheading(doc, "Operational Interfaces and Evidence")
    add_paragraph(
        doc,
        "Figure 8.18 showcases the Depot Operations Control Center (`Dashboard.jsx`), providing the Depot Manager with live "
        "operational cards, reserved fuel gauges, pending approvals, and active tanker fleet dispatches."
    )

    img_depot_dash = os.path.join(img_dir, "image30.png")
    add_image_with_caption(
        doc,
        img_depot_dash,
        "Figure 8.18: Depot Operations Control Center (Depot Manager Operational Dashboard)",
        width_inches=5.8
    )

    add_paragraph(
        doc,
        "Figure 8.19 displays the Administrator Governance Dashboard, highlighting system-wide user counts, total customer accounts, "
        "pending KYC verifications, and platform health metrics."
    )

    img_admin_dash = os.path.join(img_dir, "image31.png")
    add_image_with_caption(
        doc,
        img_admin_dash,
        "Figure 8.19: Administrator Enterprise Governance and Platform Overview Dashboard",
        width_inches=5.8
    )

    add_paragraph(
        doc,
        "Figure 8.20 displays the System Settings Portal (`Settings.jsx`), allowing users to toggle visual themes, select display language "
        "(English, Tamil, Hindi), configure audio alerts, and manage notification preferences."
    )

    img_settings = os.path.join(img_dir, "image32.png")
    add_image_with_caption(
        doc,
        img_settings,
        "Figure 8.20: User Settings, Theme Configuration, and Multilingual Localisation Portal",
        width_inches=5.8
    )

    # -------------------- 8.9 DEPLOYMENT, CI/CD & TESTING --------------------
    add_heading_2(doc, "8.9 DEPLOYMENT, CI/CD & TESTING")

    add_paragraph(
        doc,
        "The Deployment, CI/CD & Testing module encompasses the build automation, continuous deployment pipelines, and "
        "automated software verification suites established for the Smart Fuel Dispatch & Fleet Telemetry System."
    )

    add_subheading(doc, "Purpose and Scope")
    add_paragraph(
        doc,
        "To ensure production readiness, the repository incorporates automated build and deployment pipelines configured "
        "via Jenkins (`Jenkinsfile`) and Vercel (`vercel.json`). The testing infrastructure comprises nine specialized Node.js "
        "verification scripts that systematically exercise API endpoints, authentication flows, role-based access rules, "
        "approval lifecycles, and GPS telemetry streaming."
    )

    add_subheading(doc, "Jenkins CI/CD Pipeline Architecture")
    add_paragraph(
        doc,
        "The Jenkins pipeline is defined in a declarative `Jenkinsfile` at the repository root, structuring continuous integration into four stages:"
    )

    add_bullet(doc, "Checkout Stage", "Pulls source code from the Git repository, checking out the latest commit on the production branch.")
    add_bullet(doc, "Install Stage", "Installs dependencies across both root (`npm install`) and backend (`cd backend && npm install`) environments.")
    add_bullet(doc, "Build Stage", "Executes the production Vite build (`npm run build`), generating bundled, tree-shaken static assets in `dist/`.")
    add_bullet(doc, "Deploy Stage", "Deploys artifacts to the hosting infrastructure, updating environment configurations and restarting services.")

    add_subheading(doc, "Vercel Cloud Deployment Configuration")
    add_paragraph(
        doc,
        "Production cloud hosting is configured via `vercel.json`, which defines a multi-service serverless architecture: "
        "static client assets are served from `dist/` via `@vercel/static`, while all API requests matching `/api/(.*)` are dynamically "
        "routed to the Express server entrypoint (`backend/index.js`) using `@vercel/node`."
    )

    add_subheading(doc, "Automated Verification Test Suite")
    add_paragraph(
        doc,
        "The project includes nine specialized Node.js automated test suites located in `backend/` that validate system correctness. "
        "Table 8.1 details the test suites and their verification results."
    )

    # Testing Verification Table
    test_headers = ["Test Suite Script", "Focus & Target Module", "Verification Scope & Outcome"]
    test_data = [
        ["test_e2e_flow.js", "End-to-End Workflow", "Simulates complete cycle: registration -> approval -> order -> stock reservation -> dispatch -> delivery (PASSED)."],
        ["test_approval_workflow.js", "Approval & KYC Logic", "Validates customer application review, status transitions, and user provisioning (PASSED)."],
        ["test_rbac_and_depots.js", "RBAC Route Security", "Exercises all endpoints with Admin, Manager, Customer, and Driver tokens; verifies 403 blocks (PASSED)."],
        ["test_google_and_otp_auth.js", "Multi-Modal Authentication", "Tests Google ID token verification and mobile OTP generation/verification cycles (PASSED)."],
        ["test_driver_location_flow.js", "GPS Telemetry Ingestion", "Transmits mock GPS coordinate streams; verifies Vehicle update and VehicleLocation log (PASSED)."],
        ["test_all_roles_auth.js", "Role Token Verification", "Verifies JWT signing and claims validation across all six system roles (PASSED)."],
        ["test_support_role_auth.js", "Support Executive Role", "Tests read-only and ticket handling permissions for Support Executive users (PASSED)."],
        ["test_all_fixes.js", "Regression Test Suite", "Executes regression checks on alias fields, pricing calculations, and virtual getters (PASSED)."],
        ["test_api.js", "REST Health & Latency", "Validates HTTP response codes, latency benchmarks, and CORS headers across routes (PASSED)."]
    ]
    test_widths = [2.0, 1.8, 2.47]
    add_styled_table(doc, test_headers, test_data, test_widths)

    print("Chapter 8 generated successfully.")

if __name__ == "__main__":
    print("content_chapter_8 module ready.")
