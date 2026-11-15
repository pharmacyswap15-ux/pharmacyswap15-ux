# ARCHITECTURE.md - Database Schema & System Design

## 1. Database Schema (Supabase PostgreSQL)

### Table: `governorates` & `cities`
- `governorates`: `id (int PK)`, `name_ar (text)`, `name_en (text)` (All 27 Egyptian Governorates).
- `cities`: `id (int PK)`, `governorate_id (FK)`, `name_ar (text)`, `name_en (text)` (Major districts/cities per governorate, e.g., Cairo -> Nasr City, Maadi, Heliopolis; Qalyubia -> Obour City, Banha, Shubra).

### Table: `pharmacies` (Extends `auth.users`)
- `id (uuid PK, references auth.users)`
- `pharmacy_name (text, not null)` — e.g., "صيدلية الأمل"
- `owner_name (text, not null)`
- `phone (text, not null)` — WhatsApp-enabled phone number
- `governorate_id (int FK)`
- `city_id (int FK)`
- `address_details (text, not null)` — Street, landmark
- `latitude (double precision)` & `longitude (double precision)`
- `delivery_preferences (text[])` — e.g., `['استلام من الصيدلية', 'مندوب شحن داخلي', 'توصيل متبادل']`
- `is_verified (boolean, default false)`
- `license_doc_url (text)` — Private R2 URL for verification
- `rating_avg (numeric, default 5.0)`
- `swaps_count (int, default 0)`
- `created_at (timestamptz)`

### Table: `listings` (Near-Expiry, Dead Stock, & Shortage Requests)
- `id (uuid PK)`
- `pharmacy_id (uuid FK -> pharmacies.id)`
- `listing_type (enum: 'NEAR_EXPIRY', 'DEAD_STOCK', 'SHORTAGE_REQUEST')`
- `drug_name (text, not null)` — Commercial name (e.g., "بانادول أدفانس أزرق 24 قرص")
- `active_ingredient (text)` — Optional generic name
- `dosage_form (enum: 'TABLETS', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'OTHER')`
- `quantity (int, not null)` — Number of boxes/units
- `public_price_egp (numeric, not null)` — Official MOH public price per unit (سعر الجمهور)
- `expiry_date (date)` — Required for NEAR_EXPIRY & DEAD_STOCK; null for SHORTAGE_REQUEST
- `batch_number (text)` — Optional for verification
- `swap_preference (text)` — What the pharmacy wants in return (e.g., "بدل بـ كاتافلاي شراب أو أوجمنتين 1جم - جمهور في جمهور")
- `delivery_method (text, not null)` — Specific handover note for this item
- `images (text[])` — Array of Cloudflare R2 public URLs (max 3 compressed photos)
- `status (enum: 'ACTIVE', 'RESERVED', 'COMPLETED', 'CANCELLED')`
- `created_at (timestamptz)`

### Table: `swap_proposals` (Offers & Negotiations)
- `id (uuid PK)`
- `listing_id (uuid FK -> listings.id)`
- `proposer_pharmacy_id (uuid FK -> pharmacies.id)`
- `offered_items_description (text, not null)` — Details of items offered in exchange (or confirmation of providing a requested shortage)
- `offered_total_value_egp (numeric)` — Auto-calculated public price comparison
- `handover_method (text, not null)`
- `notes (text)`
- `status (enum: 'PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED')`
- `created_at (timestamptz)`

## 2. Image Upload Pipeline (Zero-Bloat Architecture)
1. User selects/captures photo on mobile or desktop.
2. Client runs `browser-image-compression` (`maxSizeMB: 0.2`, `maxWidthOrHeight: 1200`, `fileType: 'image/webp'`).
3. Client requests a **Presigned PUT URL** via Next.js Server Action (`/actions/upload.ts`) authenticated by Supabase session.
4. Client uploads directly to **Cloudflare R2** bucket (`pharmaswap-media`).
5. R2 public CDN URL is saved in `listings.images`.