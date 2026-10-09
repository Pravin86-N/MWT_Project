import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def build_chapter_9_and_references(doc, helpers):
    add_chapter_header = helpers['add_chapter_header']
    add_heading_2 = helpers['add_heading_2']
    add_subheading = helpers['add_subheading']
    add_paragraph = helpers['add_paragraph']
    add_bullet = helpers['add_bullet']

    # ==================== CHAPTER 9 ====================
    add_chapter_header(doc, "9", "CONCLUSION")

    add_paragraph(
        doc,
        "The Smart Fuel Dispatch & Fleet Telemetry System brings corporate customer onboarding, fuel order processing, "
        "depot managerial approvals, automated inventory reservation, tanker dispatching, real-time GPS telemetry, "
        "underground storage tank monitoring, transparent pricing, instant notifications, immutable audit logging, "
        "and multi-role analytics into a unified, high-performance web platform. Built following the Model-View-Controller "
        "paradigm with a React 18 single-page frontend, a Node.js/Express 5 REST and WebSocket server, and a MongoDB Atlas "
        "cloud database, the platform demonstrates how modern web technologies can effectively eliminate operational friction, "
        "enhance logistical visibility, and prevent inventory loss in commercial petroleum supply chains."
    )

    add_subheading(doc, "Key Outcomes and Accomplishments")
    add_bullet(
        doc,
        "Multi-Modal Authentication & RBAC",
        "Successfully implemented secure authentication supporting email/password with bcrypt hashing, Google OAuth 2.0 single sign-on, and mobile OTP login, enforced across six distinct user roles with route protection guards."
    )
    add_bullet(
        doc,
        "Verified Corporate Onboarding & KYC",
        "Engineered a multi-step registration workflow with multipart document uploads via Multer, requiring explicit administrative approval before granting order placement privileges."
    )
    add_bullet(
        doc,
        "End-to-End Fuel Order Lifecycle",
        "Implemented full transactional management—from automated quote generation and atomic stock reservation to tanker assignment, in-transit telemetry tracking, delivery proof submission, and automated digital invoicing."
    )
    add_bullet(
        doc,
        "Intelligent Proximity Dispatching",
        "Integrated the Haversine great-circle formula to calculate Euclidean road proximity between delivery coordinates and active tankers, recommending optimal dispatch assignments."
    )
    add_bullet(
        doc,
        "Real-Time Telemetry & Geospatial Tracking",
        "Established continuous GPS coordinate ingestion via REST and Socket.IO, streaming live vehicle positions to an interactive Leaflet map and preserving historical breadcrumb trails (up to 1,000 points per vehicle)."
    )
    add_bullet(
        doc,
        "Depot Vault Inventory Telemetry",
        "Automated underground tank monitoring with real-time tracking of capacity, volume, reserved allocations, and safety thresholds, preventing stock-outs through atomic reservations."
    )
    add_bullet(
        doc,
        "User Experience & Localisation",
        "Delivered tailored dashboards for all roles, dark/light visual theme switching, internationalization supporting English, Tamil, and Hindi, and an operational AI logistics query assistant."
    )
    add_bullet(
        doc,
        "Production CI/CD & Automated Verification",
        "Established automated build pipelines via Jenkins (`Jenkinsfile`), serverless multi-service deployment via Vercel (`vercel.json`), and nine specialized Node.js test scripts validating system correctness."
    )

    add_subheading(doc, "Current Operational Limitations")
    add_paragraph(
        doc,
        "While the system fulfills all core academic and operational requirements, evaluation identifies specific areas "
        "for ongoing enhancement:"
    )
    add_bullet(
        doc,
        "API Route Security Hardening",
        "Currently, `protect` and `authorize` middleware are strictly applied to user profiles, passwords, user listings, and activity logs. In a commercial production rollout, all order, fleet, and inventory routes should require strict per-route token validation."
    )
    add_bullet(
        doc,
        "Administrative Role Segregation",
        "Administrator and Depot Manager capabilities share operational overlap. Future iterations should enforce strict segregation between platform governance (user accounts, pricing, KYC approvals) and depot operations (orders, dispatch, tanks)."
    )
    add_bullet(
        doc,
        "SMS Gateway Integration",
        "OTP verification currently logs verification codes to the secure server console and database for testing; a production release requires integration with a licensed telecom SMS gateway (e.g., Twilio or MSG91)."
    )
    add_bullet(
        doc,
        "Road-Network Routing & Traffic",
        "Dispatch proximity calculations currently use straight-line Haversine Euclidean distance. Incorporating OpenStreetMap OSRM or Google Distance Matrix APIs would enable live traffic-aware routing and precise road distance calculations."
    )

    add_subheading(doc, "Future Scope and Scalability Enhancements")
    add_bullet(
        doc,
        "Cloud Object Storage Migration",
        "Transitioning uploaded KYC documents from local disk storage to Amazon S3 or Google Cloud Storage with presigned URLs to facilitate fully stateless serverless hosting."
    )
    add_bullet(
        doc,
        "Time-Series Database Sharding",
        "Migrating high-frequency GPS breadcrumb trails from standard collections to MongoDB Time-Series collections or InfluxDB with automated 30-day retention policies."
    )
    add_bullet(
        doc,
        "Integrated Payment Gateway",
        "Embedding digital B2B commercial payment gateways (Razorpay, Stripe) for automated corporate escrow and net-banking settlement upon delivery confirmation."
    )
    add_bullet(
        doc,
        "Large Language Model Integration",
        "Upgrading the rule-based Fuel Logistics Assistant with an LLM conversational agent connected via Retrieval-Augmented Generation (RAG) to live inventory and telemetry state."
    )

    add_paragraph(
        doc,
        "In summary, the Smart Fuel Dispatch & Fleet Telemetry System successfully demonstrates the application of modern "
        "web engineering standards to bulk petroleum logistics. The resulting platform delivers an accessible, resilient, "
        "and verifiable solution that meets all requirements for the 23CS54C – Modern Web Technologies course."
    )

    # ==================== REFERENCES ====================
    doc.add_page_break()
    p_ref_t = doc.add_paragraph()
    p_ref_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ref_t.paragraph_format.space_before = Pt(14)
    p_ref_t.paragraph_format.space_after = Pt(18)
    p_ref_t.paragraph_format.keep_with_next = True
    r_ref_t = p_ref_t.add_run("REFERENCES")
    r_ref_t.font.name = 'Times New Roman'
    r_ref_t.font.size = Pt(16)
    r_ref_t.font.bold = True
    r_ref_t.font.color.rgb = RGBColor(0, 0, 0)

    references = [
        "Banks, A., & Porcello, E. (2020). Learning React: Modern Patterns for Developing React Applications (2nd ed.). O'Reilly Media.",
        "Brown, E. (2019). Web Development with Node and Express: Leveraging the JavaScript Stack (2nd ed.). O'Reilly Media.",
        "Chodorow, K. (2019). MongoDB: The Definitive Guide - Powerful and Scalable Data Storage (3rd ed.). O'Reilly Media.",
        "Fielding, R. T. (2000). Architectural Styles and the Design of Network-based Software Architectures. Doctoral dissertation, University of California, Irvine.",
        "Resig, J., Bibeault, B., & Maras, J. (2016). Secrets of the JavaScript Ninja (2nd ed.). Manning Publications.",
        "Rai, R. (2013). Socket.IO Real-Time Web Application Development. Packt Publishing.",
        "Sinnatr, R. (2019). Leaflet.js Essentials: Create Interactive Web Maps with the Leaflet JavaScript Library. Packt Publishing.",
        "Jones, M., Bradley, J., & Sakimura, N. (2015). JSON Web Token (JWT). RFC 7519, Internet Engineering Task Force (IETF).",
        "Sinnott, R. W. (1984). Virtues of the Haversine. Sky and Telescope, 68(2), 159.",
        "Smart, J. F. (2011). Jenkins: The Definitive Guide - Continuous Integration for the Enterprise. O'Reilly Media.",
        "Mozilla Developer Network (MDN). (2024). Express Web Framework (Node.js/JavaScript). MDN Web Docs.",
        "React Documentation Team. (2024). React: The Library for Web and Native User Interfaces. Meta Open Source. https://react.dev/"
    ]

    for idx, ref in enumerate(references, 1):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(6)
        r_num = p.add_run(f"[{idx}] ")
        r_num.font.name = 'Times New Roman'
        r_num.font.size = Pt(11)
        r_num.font.bold = True
        r_text = p.add_run(ref)
        r_text.font.name = 'Times New Roman'
        r_text.font.size = Pt(11)

    print("Chapter 9 and References generated successfully.")

if __name__ == "__main__":
    print("content_chapter_9_ref module ready.")
