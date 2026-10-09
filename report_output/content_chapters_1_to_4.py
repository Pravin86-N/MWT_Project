import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def build_chapters_1_to_4(doc, img_dir, helpers):
    add_chapter_header = helpers['add_chapter_header']
    add_heading_2 = helpers['add_heading_2']
    add_subheading = helpers['add_subheading']
    add_paragraph = helpers['add_paragraph']
    add_bullet = helpers['add_bullet']
    add_image_with_caption = helpers['add_image_with_caption']

    # ==================== CHAPTER 1 ====================
    add_chapter_header(doc, "1", "INTRODUCTION")

    add_paragraph(
        doc,
        "Fuel distribution and bulk petroleum dispatch represent time-critical supply chain operations "
        "where order processing, resource allocation, inventory levels, route telemetry, and delivery "
        "visibility must operate in complete synchronization. Traditional fuel distribution setups often "
        "depend on disconnected manual procedures, including phone calls, paper delivery slips, and isolated "
        "spreadsheet logs. When these activities are coordinated without an integrated digital backbone, "
        "it becomes exceptionally difficult for dispatchers and station managers to know which tanker is "
        "carrying an order, where the driver currently is along the transit corridor, whether sufficient "
        "stock is available in the depot storage tanks, and whether an order has reached the customer site securely."
    )

    add_paragraph(
        doc,
        "The Smart Fuel Dispatch & Fleet Telemetry System is a modern full-stack web application engineered "
        "to solve these operational challenges for bulk fuel delivery logistics. Known internally within the "
        "codebase and user interface as the Fuel Delivery Management System (FDMS), the platform consolidates "
        "corporate customer onboarding, KYC document verification, commercial fuel order placement, depot manager "
        "approvals, automated inventory reservation, tanker vehicle and driver assignment, smart dispatch routing, "
        "live GPS telemetry tracking, underground tank telemetry, multi-product pricing engines, real-time alerts, "
        "immutable audit logging, multi-role analytics dashboards, and an operational AI logistics assistant into a single unified web platform."
    )

    add_paragraph(
        doc,
        "The frontend architecture is implemented with React 18 and Vite, delivering an ultra-responsive, component-driven "
        "single-page application (SPA). React Router DOM manages client-side navigation and role-aware protected route "
        "guards. Global application state is orchestrated using React's Context API with useReducer patterns, while Axios "
        "handles authenticated REST communication via automatic Bearer token interceptors. Real-time telemetry and instant "
        "operational notifications are powered by Socket.IO client connections. Interactive fleet positioning and route "
        "corridors are rendered using Leaflet and React-Leaflet with OpenStreetMap cartographic tiles. The user interface "
        "features a modern design system with dark and light themes and complete internationalization supporting English, Tamil, and Hindi."
    )

    add_paragraph(
        doc,
        "The backend server is implemented using Node.js and Express 5, architected around modular controllers and domain-specific "
        "route gateways. Persistent data storage is managed using MongoDB Atlas and the Mongoose Object Data Modeling (ODM) library, "
        "utilizing schema validation, compound indexes, virtual getters, and pre-save hooks. Authentication security is enforced "
        "via JSON Web Tokens (JWT) and bcryptjs cryptographic password hashing, complemented by Google OAuth 2.0 verification and "
        "SMS-ready one-time password (OTP) verification. Multipart KYC document uploads are processed securely via Multer middleware. "
        "A Socket.IO server gateway broadcasts real-time telemetry coordinates and targeted event notifications to role-based rooms."
    )

    add_paragraph(
        doc,
        "The platform natively accommodates six distinct user roles: Administrator, Depot Manager, Customer, Driver, "
        "Support Executive, and Auditor. In addition, the codebase includes an automated continuous integration pipeline "
        "configured via Jenkins (`Jenkinsfile`) and production-grade cloud deployment configurations via Vercel (`vercel.json`), "
        "backed by nine automated Node.js validation test suites. This report provides an exhaustive, academically rigorous "
        "record of the architectural design, schema models, module implementations, telemetry workflows, and experimental results."
    )

    # ==================== CHAPTER 2 ====================
    add_chapter_header(doc, "2", "OBJECTIVES")

    add_paragraph(
        doc,
        "The primary purpose of the Smart Fuel Dispatch & Fleet Telemetry System is to design, develop, and evaluate "
        "a reliable, modern web platform that replaces fragmented manual coordination with an automated, role-aware, "
        "and real-time logistics solution. The project accomplishes the following eleven key technical objectives:"
    )

    add_bullet(
        doc,
        "Digitize Bulk Fuel Delivery Operations",
        "Replace fragmented paper delivery slips, manual phone dispatching, and manual spreadsheets with a centralized, automated web platform that unifies all stakeholder interactions."
    )
    add_bullet(
        doc,
        "Role-Based Access Control & Multi-Modal Authentication",
        "Implement secure authentication supporting email/password with bcrypt hashing, Google OAuth 2.0 single sign-on, and mobile OTP login, enforced across six distinct user roles using JWT and route protection middleware."
    )
    add_bullet(
        doc,
        "Verified Corporate Onboarding & KYC Workflow",
        "Provide a multi-step registration workflow that captures company information, GSTIN, PAN, and fuel requirements with multipart document uploads, requiring administrative review before granting access."
    )
    add_bullet(
        doc,
        "End-to-End Fuel Order Lifecycle Management",
        "Manage the full lifecycle of commercial fuel orders—including creation, dynamic pricing, depot approval, stock reservation, tanker assignment, transit tracking, delivery proof submission, and automated PDF invoicing."
    )
    add_bullet(
        doc,
        "Intelligent Dispatch & Proximity Recommendations",
        "Implement a smart dispatch recommendation engine utilizing the Haversine great-circle formula to calculate Euclidean road proximity, recommending the nearest depot and tanker to optimize delivery timelines."
    )
    add_bullet(
        doc,
        "Real-Time Fleet Telemetry & GPS Tracking",
        "Capture periodic GPS coordinate pings (latitude, longitude, speed, heading, timestamp) via REST and Socket.IO, streaming live vehicle positions to an interactive Leaflet map and preserving historical breadcrumb trails."
    )
    add_bullet(
        doc,
        "Depot Tank Inventory Telemetry & Low-Stock Alerts",
        "Monitor depot fuel storage vaults with real-time tracking of capacity, current volume, reserved stock, temperature, and pressure, automatically triggering threshold alerts and locking orders when stock is depleted."
    )
    add_bullet(
        doc,
        "Dynamic Multi-Product Pricing & Taxation Engine",
        "Provide centralized rate configuration for Diesel, Petrol, Premium Diesel, and CNG, calculating base fuel charges, 18% GST, and delivery freight dynamically across all orders and formal quotation requests."
    )
    add_bullet(
        doc,
        "Real-Time Notification Gateway & Immutable Audit Trail",
        "Broadcast instant event alerts across role-specific Socket.IO channels and maintain an append-only activity log that captures user ID, role, action, target entity, timestamp, and IP address for compliance."
    )
    add_bullet(
        doc,
        "Executive Dashboards, Internationalization & AI Assistant",
        "Provide tailored analytical dashboards for all roles, complete multilingual support for English, Tamil, and Hindi, a responsive dark/light visual theme, and a context-aware logistics query assistant."
    )
    add_bullet(
        doc,
        "Automated CI/CD Deployment Pipeline & Verification Suite",
        "Establish an automated build and test pipeline via Jenkins, serverless multi-service deployment via Vercel, and nine dedicated Node.js test scripts validating authorization, state lifecycles, and telemetry."
    )

    # ==================== CHAPTER 3 ====================
    add_chapter_header(doc, "3", "DESCRIPTION")

    add_paragraph(
        doc,
        "The Smart Fuel Dispatch & Fleet Telemetry System is architected as a layered full-stack web application "
        "structured around the Model-View-Controller (MVC) paradigm. The React client delivers an interactive presentation "
        "layer, the Node.js/Express server provides RESTful microservices and a WebSocket gateway, and MongoDB Atlas serves "
        "as the persistent document store. The operational surface of the platform is partitioned into eight comprehensive functional areas:"
    )

    add_subheading(doc, "1. Authentication and Access Control")
    add_paragraph(
        doc,
        "The authentication subsystem guarantees identity verification and access segregation across the platform. "
        "Users authenticate using standard credentials (email and password), Google OAuth 2.0 social sign-in, or mobile OTP. "
        "Passwords are cryptographically salted and hashed using bcryptjs. Upon successful authentication, the server signs "
        "a JSON Web Token (JWT) encapsulating the user ID, email, and assigned role. On the client side, AuthContext "
        "maintains session state, while ProtectedRoute wrappers redirect unauthenticated visitors and restrict portal views "
        "based on role permissions. On the server side, `protect` and `authorize` middleware validate incoming Bearer tokens "
        "and enforce role permissions across sensitive endpoints. Rejected or pending corporate accounts are strictly denied login."
    )

    add_subheading(doc, "2. Customer and Registration Management")
    add_paragraph(
        doc,
        "Corporate fuel buyers must undergo a formal vetting process before purchasing fuel. The registration workflow collects "
        "corporate identity, trade license numbers, GSTIN, PAN, registered office address, contact coordinates, and projected fuel "
        "consumption. Applicants upload verification documents (business registration certificates, GST filings, PAN cards) "
        "via multipart form uploads handled by Multer. Submissions enter a 'Pending' queue in the database. Authorized Depot Managers "
        "or Administrators review the application through the Applications Review Portal. Approving an application automatically "
        "provisions an active User account, establishes the Customer master record, and dispatches an acceptance notification."
    )

    add_subheading(doc, "3. Order and Dispatch Management")
    add_paragraph(
        doc,
        "Commercial fuel orders represent the core transaction within the system. An order document records the customer ID, "
        "selected fuel type (Diesel, Petrol, Premium Diesel, CNG), requested volume in liters, delivery site coordinates, scheduled "
        "delivery window, assigned driver, assigned tanker vehicle, itemized financials, and lifecycle timestamps. When an order is "
        "submitted, the system calculates pricing against active FuelPricing tariffs, including an 18% GST levy and delivery freight. "
        "Upon Depot Manager approval, the requested fuel volume is atomically reserved in the corresponding depot tank. When the order "
        "is dispatched, the assigned tanker and driver transition to active duty. Upon delivery verification, stock is formally deducted "
        "from the vault, and a digital invoice is finalized."
    )

    add_subheading(doc, "4. Driver and Fleet Management")
    add_paragraph(
        doc,
        "The fleet management module maintains operational oversight of transportation assets and personnel. Driver entities record "
        "full name, phone number, assigned vehicle number, duty status (Available, On Duty, Inactive), total completed trips, commercial "
        "driver license number, and email. Tanker vehicle records track registration number, assigned driver, operational status "
        "(Available, In Transit, Maintenance, Out of Service), fuel capacity, fuel cargo type, current fuel level, tyre pressure, "
        "engine temperature, destination coordinates, estimated time of arrival (ETA), and last known latitude and longitude. "
        "Fleet managers can register new tankers, inspect diagnostic telemetry, and adjust duty rosters in real time."
    )

    add_subheading(doc, "5. GPS and Telemetry Management")
    add_paragraph(
        doc,
        "Location telemetry flows continuously into the platform via REST API ingestion and WebSocket events. Telemetry packets "
        "containing vehicle ID, driver ID, latitude, longitude, speed (km/h), heading (degrees), and timestamp are validated by "
        "the backend. Each ping updates the live coordinates on the primary Vehicle document and is simultaneously written as an "
        "immutable record in the VehicleLocation and DriverLocation historical collections. The Socket.IO server broadcasts the coordinates "
        "to connected client rooms, causing the interactive Leaflet Fleet Map to update smoothly without page reloading. Historical trails "
        "store up to 1,000 points per vehicle for route analysis."
    )

    add_subheading(doc, "6. Inventory and Fuel Pricing")
    add_paragraph(
        doc,
        "Depot storage vaults are represented as tank documents storing fuel code, name, total capacity (liters), current physical stock, "
        "reserved stock (allocated to approved pending orders), minimum safety threshold, temperature (°C), pressure (PSI), and refill logs. "
        "Virtual Mongoose getters automatically compute available free stock (`currentStock - reservedStock`), fill percentage, and low-stock "
        "warning status. The pricing subsystem manages base prices per liter, standard tax percentages (18% GST), and delivery charges across "
        "all fuel categories, ensuring quotes and order bills reflect accurate commercial rates."
    )

    add_subheading(doc, "7. Notifications, Audit Logs and Reports")
    add_paragraph(
        doc,
        "Operational awareness and regulatory governance are maintained through real-time notifications and immutable audit logging. "
        "System events—such as new registrations, order approvals, dispatch departures, delivery completions, and tank threshold warnings—"
        "create notification documents pushed immediately to role-specific Socket.IO rooms. The audit logging engine captures every "
        "critical state change, logging the performing user ID, user role, action type (e.g., Login, Order Approved, Tank Refilled), "
        "affected entity ID, IP address, and timestamp. The reporting module aggregates transactional data to produce revenue summaries, "
        "consumption charts, and CSV/Excel exports."
    )

    add_subheading(doc, "8. Dashboard, Settings, Localisation and Assistant")
    add_paragraph(
        doc,
        "Role-tailored dashboards provide executive, managerial, and operational overviews customized to each stakeholder role. "
        "The Settings portal enables individual users to configure visual themes (dark or light mode), notification sound and alert preferences, "
        "and interface language. Localisation is implemented using client-side translation dictionaries supporting English, Tamil, and Hindi. "
        "Finally, an interactive floating Fuel Logistics Assistant analyzes active order states, inventory levels, and fleet availability to "
        "provide rapid answers to common operational inquiries and offer role-specific quick action shortcuts."
    )

    # ==================== CHAPTER 4 ====================
    add_chapter_header(doc, "4", "CLASS DIAGRAM")

    add_paragraph(
        doc,
        "The domain structure of the Smart Fuel Dispatch & Fleet Telemetry System is structured using object-oriented "
        "principles mapped onto MongoDB document collections via Mongoose models. Figure 4.1 illustrates the comprehensive "
        "Class Diagram representing the core domain models, their internal attributes, methods, and relationships."
    )

    class_diagram_img = os.path.join(img_dir, "image2.png")
    add_image_with_caption(
        doc,
        class_diagram_img,
        "Figure 4.1: Class Diagram of the Smart Fuel Dispatch & Fleet Telemetry System",
        width_inches=6.0
    )

    add_paragraph(
        doc,
        "As depicted in Figure 4.1, the class structure cleanly decouples master entities, operational transactions, and time-series telemetry. "
        "The `Order` class forms the central transactional entity, connecting the `User` (acting as customer), the assigned `Driver`, "
        "and the dispatched `Vehicle`. Solid association arrows represent referential integrity enforced via MongoDB ObjectIds "
        "(e.g., `Order.customerId` referencing `User._id`, and `Notification.userId` referencing `User._id`). Dashed arrows indicate "
        "logical associations resolved programmatically within controller business logic using unique identifiers, such as linking an order "
        "to a `Driver` by name and to a `Vehicle` by registration plate number."
    )

    add_paragraph(
        doc,
        "The `User` model represents all authenticated actors across the six system roles (Admin, Depot Manager, Customer, Driver, "
        "Support Executive, Auditor). Corporate customer applicants are represented by `Registration` (aliased as `Customer` and `CustomerRegistration`), "
        "which encapsulates company identity, GSTIN/PAN data, and uploaded document paths. The `Vehicle` and `Driver` classes represent physical "
        "delivery resources, while `VehicleLocation` and `DriverLocation` isolate historical telemetry pings from the active master records "
        "to maintain query responsiveness. `Inventory` (aliased as `Tank`) monitors underground fuel vaults, and `FuelPricing` manages commercial rates. "
        "Finally, `Notification`, `ActivityLog`, and `Otp` provide communication, auditability, and multi-factor authentication services across the system."
    )

    print("Chapters 1 to 4 generated successfully.")

if __name__ == "__main__":
    print("content_chapters_1_to_4 module ready.")
