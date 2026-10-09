import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def build_chapters_5_to_7(doc, img_dir, helpers):
    add_chapter_header = helpers['add_chapter_header']
    add_heading_2 = helpers['add_heading_2']
    add_subheading = helpers['add_subheading']
    add_paragraph = helpers['add_paragraph']
    add_bullet = helpers['add_bullet']
    add_image_with_caption = helpers['add_image_with_caption']
    add_styled_table = helpers['add_styled_table']

    # ==================== CHAPTER 5 ====================
    add_chapter_header(doc, "5", "TABLE STRUCTURES")

    add_paragraph(
        doc,
        "The Smart Fuel Dispatch & Fleet Telemetry System utilizes MongoDB Atlas as its primary database management "
        "system. In MongoDB, data models are defined using Mongoose schemas and stored as collections of flexible BSON documents. "
        "Every document automatically receives an immutable primary key `_id` of type ObjectId, as well as automatic `createdAt` "
        "and `updatedAt` audit timestamps where `timestamps: true` is configured in the schema options. The tables below specify "
        "the field definitions, data types, required validations, and constraints for all twelve schemas implemented in the project."
    )

    tbl_headers = ["Field", "Type", "Required", "Default / Constraints"]
    col_w = [1.6, 1.0, 0.8, 2.87]

    # 1. User
    add_subheading(doc, "1. User Schema (Collection: users)")
    add_paragraph(doc, "Stores credentials, personal profiles, contact details, assigned roles, and approval statuses for all system users.")
    data_user = [
        ["name", "String", "Yes", "Trimmed string; display name"],
        ["email", "String", "Yes", "Unique, lowercase, trimmed; primary login identifier"],
        ["password", "String", "No", "Bcrypt hash; optional for OAuth/OTP accounts"],
        ["phone", "String", "No", "Trimmed; mobile number for OTP/SMS"],
        ["company", "String", "No", "Trimmed; associated corporate organization"],
        ["role", "String", "Yes", "Enum: Admin, Depot Manager, Customer, Driver, Support Executive, Auditor (Default: Customer)"],
        ["status", "String", "Yes", "Enum: Active, Inactive, Pending Approval, Rejected (Default: Active)"],
        ["googleId", "String", "No", "Google OAuth 2.0 unique subject identifier"],
        ["isApproved", "Boolean", "Yes", "Default true for staff; false for pending customers"],
        ["avatar", "String", "No", "URL string to profile image"],
        ["lastLogin", "Date", "No", "Timestamp of most recent authentication session"],
        ["createdAt", "Date", "Auto", "Managed timestamp; index for recency queries"],
        ["updatedAt", "Date", "Auto", "Managed timestamp"]
    ]
    add_styled_table(doc, tbl_headers, data_user, col_w)

    # 2. Order
    add_subheading(doc, "2. Order Schema (Collection: orders)")
    add_paragraph(doc, "Encapsulates bulk fuel delivery orders, customer references, quantities, financials, assigned assets, and lifecycle status.")
    data_order = [
        ["orderNumber", "String", "No", "Unique generated identifier; format ORD-YYMMDD-NNN"],
        ["customerId", "ObjectId", "Yes", "Reference to users collection; indexed"],
        ["customerName", "String", "Yes", "Denormalized customer company name for query speed"],
        ["customerPhone", "String", "No", "Customer contact number"],
        ["fuelType", "String", "Yes", "Enum: Diesel, Petrol, Premium Diesel, CNG; alias fuelCode"],
        ["quantity", "Number", "Yes", "Ordered volume in liters; minimum 100 L; alias qty"],
        ["deliveryAddress", "String", "Yes", "Destination site address; alias site"],
        ["city", "String", "Yes", "Target delivery city/region in Tamil Nadu"],
        ["deliverySlot", "String", "No", "Enum: Morning (06-12), Afternoon (12-18), Evening (18-22)"],
        ["status", "String", "Yes", "Enum: Pending, Approved, Assigned, Dispatched, Delivered, Cancelled, Rejected (Default: Pending)"],
        ["assignedDriver", "String", "No", "Denormalized driver name; default null"],
        ["assignedTanker", "String", "No", "Vehicle registration number (e.g., TN-72-AB-1234); default null"],
        ["basePrice", "Number", "Yes", "Unit tariff per liter fetched from FuelPricing"],
        ["taxAmount", "Number", "Yes", "18% GST statutory amount"],
        ["deliveryCharge", "Number", "Yes", "Calculated freight delivery charge"],
        ["totalAmount", "Number", "Yes", "Total invoice amount in INR; index for reporting"],
        ["paymentStatus", "String", "Yes", "Enum: Pending, Paid, COD, Invoiced (Default: Pending)"]
    ]
    add_styled_table(doc, tbl_headers, data_order, col_w)
    add_paragraph(doc, "Note: A Mongoose pre-validate hook ensures that alias field pairs (`fuelType`/`fuelCode`, `quantity`/`qty`, `deliveryAddress`/`site`) remain perfectly synchronized across client payloads.")

    # 3. Driver
    add_subheading(doc, "3. Driver Schema (Collection: drivers)")
    add_paragraph(doc, "Manages fleet drivers, license documentation, current availability, and assigned vehicles.")
    data_driver = [
        ["name", "String", "Yes", "Driver full name; trimmed"],
        ["phone", "String", "Yes", "Mobile contact number; unique indexed"],
        ["email", "String", "No", "Contact email address"],
        ["assignedVehicle", "String", "No", "Tanker registration plate number; default null"],
        ["status", "String", "Yes", "Enum: Available, On Duty, Inactive, On Leave (Default: Available)"],
        ["licenseNumber", "String", "Yes", "Heavy vehicle commercial license identifier"],
        ["totalTrips", "Number", "No", "Completed delivery trip counter (Default: 0)"],
        ["currentLocation", "Object", "No", "Subdocument: { lat: Number, lng: Number, timestamp: Date }"]
    ]
    add_styled_table(doc, tbl_headers, data_driver, col_w)

    # 4. Vehicle
    add_subheading(doc, "4. Vehicle Schema (Collection: vehicles)")
    add_paragraph(doc, "Maintains tanker vehicle master records, diagnostic sensor parameters, and real-time transit state.")
    data_vehicle = [
        ["vehicleNumber", "String", "Yes", "Unique registration plate (e.g., TN-69-X-9988); alias vehicle"],
        ["driverName", "String", "No", "Currently assigned driver name"],
        ["status", "String", "Yes", "Enum: Available, In Transit, Maintenance, Out of Service (Default: Available)"],
        ["cargoType", "String", "Yes", "Enum: Diesel, Petrol, Premium Diesel, CNG, Multi-Chamber"],
        ["capacity", "Number", "Yes", "Tanker gross capacity in liters (e.g., 10,000 to 24,000 L)"],
        ["fuelLevel", "Number", "Yes", "Current liquid level percentage (0 to 100%)"],
        ["tyrePressure", "Number", "No", "Diagnostic tyre pressure in PSI (nominal: 110 PSI)"],
        ["engineTemp", "Number", "No", "Diagnostic engine coolant temperature in °C"],
        ["latitude", "Number", "Yes", "Current GPS latitude coordinate"],
        ["longitude", "Number", "Yes", "Current GPS longitude coordinate"],
        ["speed", "Number", "No", "Current road speed in km/h"],
        ["destination", "String", "No", "Assigned drop-off location or customer site"],
        ["estimatedTime", "String", "No", "Computed ETA string (e.g., '45 mins')"]
    ]
    add_styled_table(doc, tbl_headers, data_vehicle, col_w)
    add_paragraph(doc, "Note: The schema implements two virtual getters, `googleMapsLatLng` and `googleMapsUrl`, which expose coordinates for mapping integrations.")

    # 5. VehicleLocation
    add_subheading(doc, "5. VehicleLocation Schema (Collection: VehicleLocation)")
    add_paragraph(doc, "Stores historical GPS breadcrumb pings recorded from tanker vehicles for trail rendering and speed auditing.")
    data_vloc = [
        ["vehicleId", "String", "Yes", "Tanker registration number; indexed"],
        ["latitude", "Number", "Yes", "Recorded latitude coordinate"],
        ["longitude", "Number", "Yes", "Recorded longitude coordinate"],
        ["speed", "Number", "No", "Instantaneous road velocity in km/h"],
        ["heading", "Number", "No", "Compass heading angle in degrees (0 - 359°)"],
        ["timestamp", "Date", "Yes", "Hardware telemetry timestamp; compound index with vehicleId"]
    ]
    add_styled_table(doc, tbl_headers, data_vloc, col_w)

    # 6. DriverLocation
    add_subheading(doc, "6. DriverLocation Schema (Collection: DriverLocations)")
    add_paragraph(doc, "Tracks driver-centric mobile GPS location logs when drivers transmit pings independently of onboard vehicle modems.")
    data_dloc = [
        ["driverId", "Mixed", "No", "Driver identifier (ObjectId or numeric string); indexed"],
        ["vehicleId", "String", "No", "Associated vehicle plate number; indexed"],
        ["latitude", "Number", "Yes", "Driver device latitude coordinate"],
        ["longitude", "Number", "Yes", "Driver device longitude coordinate"],
        ["timestamp", "Date", "Yes", "Telemetry capture timestamp (Default: Date.now)"]
    ]
    add_styled_table(doc, tbl_headers, data_dloc, col_w)

    # 7. Inventory (Tank)
    add_subheading(doc, "7. Inventory Schema (Collection: tanks)")
    add_paragraph(doc, "Maintains bulk fuel storage vaults, physical stock volumes, reserved quantities, and environmental telemetry.")
    data_inv = [
        ["fuelType", "String", "Yes", "Fuel category: Diesel, Petrol, Premium Diesel, CNG; alias fuelCode"],
        ["tankName", "String", "Yes", "Vault name/number (e.g., Underground Vault Alpha-1)"],
        ["capacity", "Number", "Yes", "Vault physical volume capacity in liters (e.g., 50,000 L)"],
        ["currentStock", "Number", "Yes", "Current gross liquid inventory in liters"],
        ["reservedStock", "Number", "Yes", "Volume committed to approved pending dispatches (Default: 0)"],
        ["minThreshold", "Number", "Yes", "Safety threshold triggering low-stock alert (e.g., 10,000 L)"],
        ["temperature", "Number", "No", "Ambient vault temperature in °C (Default: 28°C)"],
        ["pressure", "Number", "No", "Underground chamber vapor pressure in PSI (Default: 14.7 PSI)"],
        ["lastRefillDate", "Date", "No", "Timestamp of most recent bulk tanker decanting"],
        ["lastRefillAmount", "Number", "No", "Volume added during last refill in liters"]
    ]
    add_styled_table(doc, tbl_headers, data_inv, col_w)
    add_paragraph(doc, "Note: Virtual fields `availableStock` (`currentStock - reservedStock`), `fillPercentage`, and `isLowStock` are calculated dynamically on document read.")

    # 8. FuelPricing
    add_subheading(doc, "8. FuelPricing Schema (Collection: fuelpricings)")
    add_paragraph(doc, "Maintains tariff rates, tax levies, and delivery freight rates for all fuel types.")
    data_price = [
        ["code", "String", "Yes", "Fuel code: DSL, PTL, PDSL, CNG; unique indexed"],
        ["name", "String", "Yes", "Descriptive name: Diesel, Petrol, Premium Diesel, CNG"],
        ["pricePerLiter", "Number", "Yes", "Commercial base rate per liter in INR (e.g., 89.50)"],
        ["taxRate", "Number", "Yes", "Statutory tax percentage (Default: 18 for 18% GST)"],
        ["deliveryFee", "Number", "Yes", "Standard freight charge per trip in INR (Default: 500)"],
        ["lastUpdated", "Date", "Auto", "Timestamp of last tariff adjustment (Default: Date.now)"]
    ]
    add_styled_table(doc, tbl_headers, data_price, col_w)

    # 9. Notification
    add_subheading(doc, "9. Notification Schema (Collection: notifications)")
    add_paragraph(doc, "Stores targeted event notifications pushed to individual users or broadcast across role rooms.")
    data_notif = [
        ["userId", "ObjectId", "No", "Target user identifier; null for role-wide broadcasts; indexed"],
        ["role", "String", "No", "Target audience role: Admin, Depot Manager, Customer, Driver"],
        ["title", "String", "Yes", "Notification headline (e.g., 'Order Approved')"],
        ["message", "String", "Yes", "Descriptive alert message with order/stock context"],
        ["type", "String", "Yes", "Enum: info, success, warning, alert (Default: info)"],
        ["read", "Boolean", "Yes", "Read status flag (Default: false); indexed"],
        ["createdAt", "Date", "Auto", "Creation timestamp; indexed descending for recent feeds"]
    ]
    add_styled_table(doc, tbl_headers, data_notif, col_w)

    # 10. ActivityLog
    add_subheading(doc, "10. ActivityLog Schema (Collection: activitylogs)")
    add_paragraph(doc, "Maintains an immutable audit trail of system events, security operations, and transactional approvals.")
    data_log = [
        ["userId", "ObjectId", "No", "Identifier of user executing the action; indexed"],
        ["userName", "String", "No", "Display name of performing user"],
        ["userRole", "String", "No", "Role of performing user at time of action execution"],
        ["action", "String", "Yes", "Action description: Login, Order Created, Status Change, Tank Refill"],
        ["entityType", "String", "No", "Target domain collection: Order, User, Inventory, Vehicle"],
        ["entityId", "String", "No", "String representation of target entity identifier"],
        ["ipAddress", "String", "No", "Client network IP address"],
        ["createdAt", "Date", "Auto", "Timestamp; indexed descending; compound indexed with action"]
    ]
    add_styled_table(doc, tbl_headers, data_log, col_w)

    # 11. Otp
    add_subheading(doc, "11. Otp Schema (Collection: otps)")
    add_paragraph(doc, "Stores short-lived one-time verification passcodes for multi-factor SMS authentication.")
    data_otp = [
        ["mobile", "String", "Yes", "Target phone number; indexed"],
        ["otp", "String", "Yes", "6-digit cryptographic verification passcode"],
        ["createdAt", "Date", "Auto", "Creation timestamp; configured with MongoDB TTL expiry index"]
    ]
    add_styled_table(doc, tbl_headers, data_otp, col_w)
    add_paragraph(doc, "Note: The schema utilizes MongoDB's Time-To-Live (TTL) index feature on `createdAt` with `expires: 300`, causing passcodes to automatically self-purge after 5 minutes.")

    # 12. Registration
    add_subheading(doc, "12. Registration Schema (Collection: customerregistrations)")
    add_paragraph(doc, "Captures corporate customer onboarding applications, statutory business identifiers, and KYC document uploads.")
    data_reg = [
        ["regId", "String", "No", "Unique application code; format REG-YYYY-NNNN"],
        ["companyName", "String", "Yes", "Registered corporate trade name; trimmed"],
        ["contactPerson", "String", "Yes", "Authorized representative full name"],
        ["email", "String", "Yes", "Official corporate contact email; indexed"],
        ["phone", "String", "Yes", "Authorized mobile phone number"],
        ["gstNumber", "String", "Yes", "15-character statutory GSTIN tax identifier"],
        ["panNumber", "String", "Yes", "10-character corporate Permanent Account Number (PAN)"],
        ["address", "String", "Yes", "Registered physical corporate headquarters address"],
        ["city", "String", "Yes", "Operating city / dispatch region"],
        ["fuelRequirement", "String", "Yes", "Estimated monthly fuel requirement (e.g., '15,000 Liters / Month')"],
        ["documents", "Array", "No", "Array of uploaded file metadata: { fileName, filePath, uploadDate }"],
        ["status", "String", "Yes", "Enum: Pending, Approved, Rejected (Default: Pending); indexed"],
        ["reviewedBy", "ObjectId", "No", "Reference to reviewing Depot Manager or Admin user"],
        ["reviewNotes", "String", "No", "Reviewer justification notes or rejection reasons"]
    ]
    add_styled_table(doc, tbl_headers, data_reg, col_w)

    # ==================== CHAPTER 6 ====================
    add_chapter_header(doc, "6", "ER DIAGRAM")

    add_paragraph(
        doc,
        "The Entity-Relationship (ER) design of the Smart Fuel Dispatch & Fleet Telemetry System is organized "
        "into three logical data tiers: Master Entities, Transactional Entities, and Time-Series Telemetry Entities. "
        "Master entities (User, Registration, Driver, Vehicle, Inventory, FuelPricing) define static and semi-static "
        "organizational assets. Transactional entities (Order, Notification, ActivityLog, Otp) capture operational events "
        "and business workflows. Time-series entities (VehicleLocation, DriverLocation) record high-frequency spatial streams, "
        "intentionally isolated from core records to safeguard query throughput. Figure 6.1 illustrates the Core ER Diagram."
    )

    er1_img = os.path.join(img_dir, "image3.png")
    add_image_with_caption(
        doc,
        er1_img,
        "Figure 6.1: Core Entity-Relationship Diagram (PK = Primary Key, FK = Foreign Reference, IX = Index)",
        width_inches=5.8
    )

    add_paragraph(
        doc,
        "In MongoDB's document-oriented architecture, relationships are implemented via a combination of ObjectId "
        "references and denormalized snapshots. Table 6.1 details the complete cardinality and referencing mechanics "
        "established across the system models."
    )

    # Relationship Table (Table #12)
    rel_headers = ["Entity A", "Cardinality", "Entity B", "Linking Field", "Kind", "Description"]
    rel_data = [
        ["User", "1 : N", "Order", "customerId", "Reference", "A customer user places multiple commercial fuel delivery orders."],
        ["User", "1 : N", "Notification", "userId", "Reference", "Notifications targeted directly to an individual user account."],
        ["User", "1 : N", "ActivityLog", "userId", "Reference", "Audit log capturing the specific user who executed an operation."],
        ["Registration", "1 : 1", "User", "email", "Logical", "Approving a registration provisions an active User account with role Customer."],
        ["Order", "N : 1", "FuelPricing", "fuelType / code", "Logical", "Orders reference fuel code to calculate unit price and 18% GST."],
        ["Order", "N : 1", "Inventory", "fuelType / tank", "Logical", "Order approvals atomically reserve stock in the matching depot tank."],
        ["Driver", "1 : 1", "Vehicle", "assignedVehicle", "Logical", "A driver is assigned to one primary tanker vehicle registration."],
        ["Order", "N : 1", "Driver", "assignedDriver", "Snapshot", "Orders record driver name at dispatch; remains immutable for history."],
        ["Order", "N : 1", "Vehicle", "assignedTanker", "Snapshot", "Orders record vehicle registration number at dispatch time."],
        ["Vehicle", "1 : N", "VehicleLocation", "vehicleId", "Foreign Key", "A vehicle produces an append-only sequence of GPS location pings."],
        ["Driver", "1 : N", "DriverLocation", "driverId", "Foreign Key", "A driver produces an append-only stream of mobile GPS pings."],
        ["Depot Tank", "1 : N", "ActivityLog", "entityId", "Logical", "Tank decanting and threshold alarms are logged for auditing."],
        ["User (Reviewer)", "1 : N", "Registration", "reviewedBy", "Reference", "Depot manager or Admin reviewing KYC applications."],
        ["User (Phone)", "1 : N", "Otp", "mobile", "Logical", "Mobile passcodes linked temporarily to phone during OTP sign-in."]
    ]
    rel_widths = [1.0, 0.7, 1.0, 1.0, 0.8, 1.77]
    add_styled_table(doc, rel_headers, rel_data, rel_widths)

    add_paragraph(
        doc,
        "Figure 6.2 illustrates the specialized Fleet and Telemetry Entity Relationship topology, depicting how "
        "high-frequency GPS coordinates integrate with dispatch transactions while preserving system responsiveness."
    )

    er2_img = os.path.join(img_dir, "image4.png")
    add_image_with_caption(
        doc,
        er2_img,
        "Figure 6.2: Fleet and Telemetry Entities Linkage Diagram",
        width_inches=5.6
    )

    add_paragraph(
        doc,
        "A critical architectural pattern utilized throughout the platform is immutable historical snapshotting. "
        "When an order is approved and dispatched, the assigned driver's name, vehicle plate number, fuel price, "
        "tax rate, and delivery freight are denormalized and stored directly on the Order document. Consequently, "
        "if a driver resigns, a vehicle undergoes re-registration, or state petroleum tariffs fluctuate in the future, "
        "completed historical orders remain completely unaffected, maintaining strict legal and financial auditability."
    )

    # ==================== CHAPTER 7 ====================
    add_chapter_header(doc, "7", "TECH STACK")

    add_heading_2(doc, "7.1 TECH STACK")

    add_paragraph(
        doc,
        "The Smart Fuel Dispatch & Fleet Telemetry System is built entirely on modern web engineering standards, "
        "utilizing a cohesive JavaScript/Node.js full-stack ecosystem. Every technology choice in the project has been "
        "strictly verified against the active source code, package manifests (`package.json`), and build configurations. "
        "The application integrates specialized frontend libraries for interactive mapping and reactive state management, "
        "an enterprise Express.js backend with WebSocket support, and a scalable cloud database deployment. Table 7.1 "
        "consolidates the overall project technology stack, detailing the exact role and responsibility of each component."
    )

    # Consolidated Tech Stack Table (Table #13 from source doc)
    tech_headers = ["Layer", "Technology", "Role & Operational Purpose"]
    tech_data = [
        ["Frontend Core", "React 18.2 with Vite 5.1", "Single-page application framework delivering reactive component rendering and fast HMR development."],
        ["Client Routing", "React Router DOM 6.22", "Declarative client-side routing, nested route layouts, and role-based protected route wrappers."],
        ["State Management", "React Context API & useReducer", "Global state orchestration across eight dedicated contexts (Auth, Orders, Inventory, Notification, etc.)."],
        ["HTTP Client", "Axios 1.20", "Promise-based REST client configured with automatic Bearer token injection and global error handling."],
        ["Real-Time Gateway", "Socket.IO 4.8 (Client & Server)", "Bi-directional WebSocket streaming for instant GPS coordinates, dispatch alerts, and notifications."],
        ["GIS & Mapping", "Leaflet 1.9 & React-Leaflet 4.2", "Interactive fleet visualization, coordinate markers, vehicle popup cards, and OpenStreetMap tiles."],
        ["Social Auth", "@react-oauth/google & jwt-decode", "Google OAuth 2.0 Identity Services client button integration and client-side JWT claims parsing."],
        ["UI Iconography", "Lucide React 0.383", "Lightweight SVG icon library integrated across all operational navigation and dashboard cards."],
        ["Backend Runtime", "Node.js 20+ with Express 5.2", "Asynchronous JavaScript server runtime providing high-throughput REST APIs and JSON endpoints."],
        ["Database Layer", "MongoDB Atlas with Mongoose 9.9", "Scalable cloud document store; ODM schemas, compound indexes, virtual getters, and lifecycle hooks."],
        ["Authentication", "jsonwebtoken 9.0 & bcryptjs 3.0", "Stateless session authorization via signed JWTs and one-way cryptographic password salting and hashing."],
        ["OAuth Verification", "google-auth-library 11.0", "Cryptographic verification of Google OAuth 2.0 ID tokens against Google public RSA signing keys."],
        ["File Processing", "Multer 2.3", "Multipart/form-data upload middleware processing PDF, DOC, DOCX, JPEG, PNG KYC documents up to 10 MB."],
        ["Configuration & CORS", "dotenv 17.4 & cors 2.8", "Environment configuration isolation and cross-origin resource sharing policy management."],
        ["CI/CD Automation", "Jenkins (Jenkinsfile)", "Declarative build pipeline automating git checkout, npm installation, linting, build, and deploy stages."],
        ["Cloud Hosting", "Vercel Platform (vercel.json)", "Serverless deployment configuration routing static frontend assets and proxying `/api` to Express backend."]
    ]
    tech_widths = [1.3, 1.8, 3.17]
    add_styled_table(doc, tech_headers, tech_data, tech_widths)

    add_heading_2(doc, "7.2 ARCHITECTURE OVERVIEW")

    add_paragraph(
        doc,
        "The architecture of the Smart Fuel Dispatch & Fleet Telemetry System is structured following the classic "
        "Three-Tier / Model-View-Controller (MVC) architectural design, augmented with a real-time event-driven WebSocket gateway. "
        "This architectural separation ensures decoupling between presentation concerns, business rules, and persistence logic. "
        "Figure 7.1 illustrates the overall architectural flow and request-response lifecycle of the application."
    )

    sys_arch_img = os.path.join(img_dir, "image5.png")
    add_image_with_caption(
        doc,
        sys_arch_img,
        "Figure 7.1: Overall Three-Tier MVC Architecture and Request Flow",
        width_inches=6.0
    )

    add_paragraph(
        doc,
        "As illustrated in Figure 7.1, the architectural layers interact across well-defined boundaries:"
    )

    add_bullet(
        doc,
        "Presentation Tier (View)",
        "Implemented as a React SPA running in the user's browser. The UI layer consists of reusable interface components (Navbar, Sidebar, StatCards, ModalDialogs), role-specific page views (CustomerPortal, DriverPortal, Dashboard, FleetMap), and React Context providers. Axios dispatches asynchronous HTTPS requests to REST endpoints, while the Socket.IO client maintains a persistent WebSocket connection to receive real-time telemetry and alerts."
    )
    add_bullet(
        doc,
        "Application Tier (Controller)",
        "Hosted on the Node.js/Express server. HTTP requests pass through security middleware (CORS, body parser, and token authentication). Specialized Express controllers (`authController`, `orderController`, `inventoryController`, `vehicleController`) execute business validation, calculate Haversine proximity, reserve depot stock, and write audit trails. The Socket.IO server pushes room-targeted telemetry packets upon state updates."
    )
    add_bullet(
        doc,
        "Persistence Tier (Model)",
        "Managed by MongoDB Atlas through Mongoose schemas. Collections store user accounts, orders, tankers, drivers, vaults, and location history. Mongoose provides schema validation, compound indexes for fast lookups, and virtual fields for dynamic computations."
    )

    # MVC Layer Table (Table #14 from source doc)
    mvc_headers = ["Architectural Layer", "Implementation Components", "Key Operational Responsibilities"]
    mvc_data = [
        ["Model (Data Tier)", "Mongoose schemas, MongoDB Atlas", "Encapsulates data models, schema validation rules, compound indexes, virtual getters, and database persistence."],
        ["View (Presentation)", "React 18, Vite, Context API, Leaflet", "Renders responsive user interfaces, maintains client state, captures user interactions, and renders real-time maps."],
        ["Controller (App Tier)", "Express routes, controllers, middleware", "Handles REST endpoints, enforces JWT authentication, executes business rules, and updates models."],
        ["Real-Time Gateway", "Socket.IO server, WebSocket rooms", "Broadcasts GPS coordinate pings, vehicle status updates, and critical system alerts to connected clients."]
    ]
    mvc_widths = [1.5, 2.0, 2.77]
    add_styled_table(doc, mvc_headers, mvc_data, mvc_widths)

    add_heading_2(doc, "7.3 PROJECT SIZE & SOURCE CODE METRICS")

    add_paragraph(
        doc,
        "The project represents a comprehensive full-stack codebase engineered to production standards. A quantitative "
        "audit of the repository source code verifies the extensive scope of implementation, summarized in Table 7.3."
    )

    # Project Size Table (Table #15 from source doc)
    size_headers = ["Project Metric", "Verified Count", "Source Code Verification Basis"]
    size_data = [
        ["Frontend Pages", "22 pages", "React page components located in src/pages directory."],
        ["Reusable UI Components", "14 components", "Modular React components located in src/components."],
        ["Global Context Providers", "8 contexts", "Auth, Orders, Inventory, Notification, Theme, Language, Settings, Simulation."],
        ["Frontend Services", "3 services", "REST api.js, WebSocket socket.js, and recentAccess.js cache."],
        ["Backend Route Gateways", "13 route files", "Mounted API routers in backend/routes handling 60+ endpoints."],
        ["Backend Controllers", "13 controllers", "Business logic modules located in backend/controllers."],
        ["Database Schemas", "12 core schemas", "15 model files in backend/models (Tank, Customer are aliases)."],
        ["User Stakeholder Roles", "6 roles", "Admin, Depot Manager, Customer, Driver, Support Executive, Auditor."],
        ["Supported Languages", "3 languages", "English, Tamil, and Hindi translation dictionaries in src/locales."],
        ["Automated Test Suites", "9 test scripts", "Dedicated verification scripts in backend/ validating all flows."]
    ]
    size_widths = [1.8, 1.4, 3.07]
    add_styled_table(doc, size_headers, size_data, size_widths)

    print("Chapters 5 to 7 generated successfully.")

if __name__ == "__main__":
    print("content_chapters_5_to_7 module ready.")
