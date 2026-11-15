# PRD.md - Product Requirements Document

## 1. Core User Flows & Pages

### A. Marketplace Feed (`/market`) — Default Home View
- **Top Filter Bar (Sticky):**
  - Tabs: `الكل` | `نير إكسباير (قرب الانتهاء)` | `رواكد (صلاحية طويلة)` | `مطلوب نواقص`
  - Location Cascading Dropdowns: `كل المحافظات` -> `المدينة / المنطقة` + `الأقرب لموقعي (GPS)`
  - Expiry Horizon Filter: `أقل من 3 شهور` | `3 - 6 شهور` | `أكثر من 6 شهور`
  - Instant Search: By drug name or active ingredient.
- **Listing Cards (Utilitarian Clinical Layout):**
  - Clear status ribbon: Amber (`نير إكسباير - متبقي X شهر`), Teal (`رواكد - صلاحية جيدة`), Red (`مطلوب / نواقص`).
  - Product thumbnail (real photo) with lightbox zoom to inspect expiry date on the box.
  - Drug Name, Quantity (`10 علب`), Public Price (`سعر الجمهور: 45 ج.م | الإجمالي: 450 ج.م`), Expiry Date (`02/2027`).
  - **Swap Target Box:** Highlighted section showing what the pharmacy wants in exchange (`مطلوب للبدل: كاتافلاي شراب - جمهور في جمهور`).
  - **Pharmacy & Logistics Footer:** Pharmacy Name + Verified Badge, Governorate/City, Handover Method badge, and quick action buttons (`عرض بدل` / `تواصل واتساب`).

### B. Add Listing / Request Modal or Page (`/listings/new`)
- Step 1: Select Type (`عرض نير إكسباير`, `عرض رواكد للبدل`, `طلب نواقص / مطلوب`).
- Step 2: Drug Details (Name, Quantity, Public Price per box, Expiry Date picker [Month/Year], Swap Preference text).
- Step 3: Upload Photos (Camera capture or gallery -> auto-compressed to WebP -> uploaded to R2).
- Step 4: Handover & Location confirmation (Pre-filled from Pharmacy Profile, editable per listing).

### C. Interactive Swap Proposal Drawer
- When a pharmacy clicks `تقديم عرض بدل` on any listing:
  - Displays original item total public value (e.g., `10 × 45 = 450 ج.م`).
  - Allows proposer to add one or more items they offer in return (with quantity & public price) and **auto-calculates the price difference** (`الفرق: 0 ج.م - تبادل متكافئ` or `فرق لصالحك: 30 ج.م`).
  - Select handover method and submit proposal.

### D. Pharmacy Profile & Onboarding (`/profile` & `/onboarding`)
- Registration collects: Pharmacy Name, Owner Name, Phone, Governorate, City, Detailed Address, Interactive Leaflet Map Pin for exact GPS coordinates, and Default Handover Methods.
- Dashboard tabs: `عروضي النشطة`, `طلباتي للنواقص`, `عروض البدل الواردة`, `عروض البدل الصادرة`.