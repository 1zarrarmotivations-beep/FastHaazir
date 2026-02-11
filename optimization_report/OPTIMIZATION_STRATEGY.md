# Performance Optimization Plan: Fast Haazir
**Issue: Web App Loading Slow**

## 1. Current Bottlenecks (Identified)

### A. Large Bundle Size
- **Shadcn/UI & Lucide Icons**: Importing the entire library instead of tree-shaking specific components.
- **Admin Dashboard**: The Admin logic is monolithic and heavily loaded on the client-side.
- **Map Libraries**: Leaflet/Mapbox can be heavy if not lazy-loaded properly.

### B. Asset Loading
- **Images**: Logos and banners might not be optimized (WebP/AVIF format).
- **Fonts**: Jameel Noori Nastaleeq is a large font file which blocks rendering.

### C. Network Requests
- **Supabase**: Multiple sequential requests on startup (User, Profile, Config).
- **Realtime**: Too many active subscriptions on global load.

---

## 2. Optimization Strategy

### Phase 1: Code Splitting & Lazy Loading (Immediate)
- [x] **Route-based Splitting**: Already implemented `React.lazy()` for pages.
- [ ] **Component Splitting**: Lazy load heavy components like `LiveRidersMap` and `RichTextEditor`.
- [ ] **Vendor Splitting**: Separate React, Supabase, and heavy libs into their own chunks.

### Phase 2: Asset Optimization
- [ ] **Font Subsetting**: Serve a stripped-down version of Urdu font or use `font-display: swap`.
- [ ] **Image Compression**: Auto-convert all assets to WebP in build pipeline.
- [ ] **Preloading**: Preload critical assets (Logo, LCP image).

### Phase 3: Data Fetching Optimization
- [ ] **Parallel Fetching**: Use `Promise.all` for initial data load.
- [ ] **React Query Caching**: Increase `staleTime` for static data (Categories, Pricing Plans) to 5-10 minutes.
- [ ] **Service Worker**: Cache App Shell for instant second load (PWA).

### Phase 4: Vite Build Tuning
- [ ] **Manual Chunks**: Explicitly tell Rollup how to split `node_modules`.
- [ ] **Minification**: Ensure `terser` is used for aggressive minimization.
- [ ] **Compression**: Enable Gzip/Brotli on Firebase Hosting.

---

## 3. Implementation Plan

I will now executing the following changes to boost performance:

1.  **Configure Vite Rollup Options** to split vendor chunks (React, UI Libs, Maps).
2.  **Optimize Font Loading** in `index.css`.
3.  **Implement Service Worker** for precaching.
4.  **Audit & Fix Large Imports**.

---
*Optimized by Antigravity*
