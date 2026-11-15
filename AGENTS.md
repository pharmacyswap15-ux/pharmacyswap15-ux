# AGENTS.md - PHARMASWAP Engineering & Design Constitution

## 1. Project Identity
- **App Name:** PHARMASWAP
- **Domain:** B2B Pharmaceutical Stock Exchange Platform (Egypt Market).
- **Core Purpose:** Enabling licensed pharmacies to swap Near-Expiry and Dead-Stock medications (Public Price-to-Public Price / جمهور في جمهور) and request scarce medications (النواقص) based on Governorate, City, and GPS proximity.
- **Primary Language:** Arabic (RTL - `dir="rtl"`), with English support for pharmaceutical brand names and active ingredients.

## 2. CRITICAL UI/UX & ANTI-AI DESIGN RULES (STRICT ENFORCEMENT)
The user strictly forbids generic "AI-generated" aesthetics. You MUST adhere to the following rules:
1. **NO AI-Cliché Fonts:** NEVER use `Inter`, `Roboto`, `Space Grotesk`, or generic system fonts for Arabic.
   - **Arabic Typography:** Use `'IBM Plex Sans Arabic'` or `'Cairo'` paired with `'Tajawal'` for clean, authoritative clinical readability.
   - **English/Numbers/Prices/Dates:** Use `'Plus Jakarta Sans'` or `'JetBrains Mono'` (for batch numbers, expiry dates, and EGP prices) with `tabular-nums`.
2. **NO AI-Cliché Visuals:**
   - **FORBIDDEN:** Purple/blue neon gradients, glassmorphism cards, floating 3D blobs, generic SaaS hero illustrations, excessive drop-shadows, or overly rounded pill-shaped everything.
   - **REQUIRED AESTHETIC:** **"Modern Clinical & Swiss Utilitarian Ledger"**. Crisp off-white canvas (`#F8FAFC`), pure white surfaces (`#FFFFFF`), sharp 1px structural borders (`#E2E8F0`), deep medical teal/emerald primary (`#0F766E`), warm amber warning for Near-Expiry (`#D97706`), crimson alert for Urgent/Shortages (`#DC2626`), and high-contrast slate ink (`#0F172A`).
   - **Data Density:** Design like a high-efficiency pharmacy POS/inventory tool (inspired by Linear, Stripe Dashboard, and modern ERP systems), not a marketing landing page.
3. **Mobile-First & Desktop-Pro:** Pharmacies use both desktop POS screens and smartphones on the shelf. Bottom navigation bar on mobile; collapsible sidebar + dense data tables/cards on desktop.

## 3. Tech Stack & Architecture
- **Framework:** Next.js 15 (App Router, TypeScript, Server Actions).
- **Styling:** Tailwind CSS v4 + Shadcn/UI (heavily customized to match the Swiss Clinical theme, border-radius max `6px` or `8px`).
- **Database & Auth:** Supabase (PostgreSQL + PostGIS + Row Level Security).
- **Image Storage:** Cloudflare R2 (S3-compatible API) + client-side compression (`browser-image-compression`) before upload.
- **Maps:** `react-leaflet` + OpenStreetMap (Zero-cost mapping).
- **Icons:** `lucide-react` (stroke-width: `1.75px` for sharp clinical precision).

## 4. Execution Rules for AI Agent
- Build the complete, working application end-to-end without asking clarifying questions.
- Seed the database with realistic Egyptian Governorates, Cities, and sample pharmaceutical listings (e.g., Panadol Advance, Catafly Syrup, Augmentin 1g, Concor 5mg) so the app is immediately testable.
- Ensure strict RTL layout mirroring across all margins, paddings, icons, and drawers.