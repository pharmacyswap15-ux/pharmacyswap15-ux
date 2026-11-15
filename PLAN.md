# PLAN.md - Autonomous Execution Roadmap

1. **Initialize Project:** Scaffold Next.js 15 (TypeScript, Tailwind CSS, App Router) with RTL Arabic configuration (`lang="ar" dir="rtl"`), load `IBM Plex Sans Arabic` and `JetBrains Mono` via `next/font/google`.
2. **Design System Setup:** Configure Tailwind theme variables matching the Swiss Clinical palette (`#F8FAFC` background, `#0F766E` primary teal, `#D97706` expiry amber, `#DC2626` shortage red, sharp `1px` borders).
3. **Database & Seed Setup:** Create SQL migration files (`supabase/migrations/001_init.sql` and `002_seed_egypt_and_drugs.sql`) including all 27 Egyptian governorates, major cities, RLS policies, and 12 realistic Egyptian pharmacy listings.
4. **Storage Integration:** Implement Cloudflare R2 S3-client presigned URL generator + client-side `browser-image-compression` uploader component (with local fallback mode if R2 keys are not yet populated in `.env`).
5. **Core UI & Pages:**
   - Build Sticky Header & Mobile Bottom Nav.
   - Build `/market` with multi-criteria filtering (Type, Governorate, City, Expiry timeframe, Search).
   - Build `/listings/new` for posting Near-Expiry, Dead Stock, and Shortage Requests.
   - Build Interactive Swap Calculator Drawer & Proposals Management (`/dashboard/swaps`).
   - Build Pharmacy Onboarding & Profile with interactive OpenStreetMap (`react-leaflet`) pin drop.
6. **Verification:** Run `npm run build` and `tsc --noEmit` to guarantee zero TypeScript or build errors.