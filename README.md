# SheetStock

**Mobile-first inventory & catalog PWA for K-Beauty wholesale operations.**  
Powered by Google Sheets — no extra database required.

---

## What it does

SheetStock turns a Google Sheets spreadsheet into a fully functional B2B sales tool for warehouse teams. Admins manage stock and approve customers, sales reps check inventory on the floor, and customers browse a personalized catalog with their own tier pricing and generate purchase orders — all from a mobile browser.

```
Google Sheets  ──►  SheetStock  ──►  Admin / Sales / Customer
(Products, Prices,               (Inventory, Catalog, PO,
 Customers, Tiers)                Barcode Scanner, Approvals)
```

---

## Features

| Area | Capabilities |
|------|-------------|
| **Inventory** | Search, filter, sort products — barcode scanner included |
| **Tier Pricing** | Per-customer Bronze / Silver / Gold pricing with override approvals |
| **Customer Catalog** | Personalized view with resolved prices, stock status, announcements |
| **Purchase Orders** | Cart → auto-generated PO number → export PDF or image |
| **Role-Based Access** | Admin, Sale, Customer — separate views and permissions |
| **Registration Flow** | Customer self-signup with admin approval queue |
| **PWA** | Installable, offline-capable, pull-to-refresh |
| **Dark Mode** | System-aware with manual toggle |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + CSS variables |
| UI Primitives | Base UI + shadcn/ui |
| Data Source | Google Sheets API v4 |
| Auth | Cookie sessions + RBAC middleware |
| Animations | Framer Motion 12 |
| Image Storage | Google Cloud Storage |
| Deployment | Google Cloud Run — asia-southeast1 |
| CI/CD | Google Cloud Build (Kaniko + auto-trigger on push to `main`) |

---

## User Roles

| Role | What they see |
|------|--------------|
| **Admin** | Full inventory, pricing engine, customer approvals, image uploads |
| **Sale** | Inventory view, catalog browsing, per-customer pricing check |
| **Customer** | Personal catalog, tier prices, cart, PO export |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Google Cloud service account with **Sheets API** enabled
- (Optional) Google Cloud Storage bucket for product images

### Local Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp deploy/env.production.yaml.example .env.local

# Fill in your credentials, then start
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes | Service account email |
| `GOOGLE_PRIVATE_KEY` | Yes | Service account private key |
| `GOOGLE_SHEET_ID` | Yes | Google Sheets spreadsheet ID |
| `TOKEN_SECRET` | Yes | Cookie signing secret (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Public URL of the deployment |
| `GOOGLE_SHEETS_RANGE` | No | Product range — default `สินค้า!A:Q` |
| `GOOGLE_USERS_RANGE` | No | Users range — default `รหัสลูกค้า!A:E` |
| `GOOGLE_ANNOUNCEMENTS_RANGE` | No | Announcements range — default `ประกาศ!A:B` |
| `GCS_BUCKET_NAME` | No | Bucket name for product image uploads |

---

## Project Structure

```
app/
  api/            # REST endpoints (auth, inventory, pricing, catalog, upload)
  admin/          # Admin approval pages
  catalog/        # Customer-facing catalog + cart
  pricing/        # Pricing management
  login/          # Authentication
  register/       # Customer self-registration
components/
  catalog/        # CartSheet, ProductDetail, CatalogHeader
  ui/             # Base UI components
  ProductList.tsx # Inventory list/grid view
  BottomNav.tsx   # Role-based navigation bar
lib/
  server/         # Auth, inventory loader, pricing engine (server-only)
  types.ts        # Shared TypeScript types
deploy/
  env.production.yaml.example   # Production env template
cloudbuild.yaml   # Cloud Build CI/CD pipeline
Dockerfile        # Multi-stage Next.js container
```

---

## Deployment

Deployed on **Google Cloud Run** (asia-southeast1). CI/CD is fully automated via Cloud Build — every push to `main` builds, containerizes (Kaniko with 7-day layer cache), and deploys.

```bash
# Run lint + build check before pushing
npm run deploy:check

# Manual first-time deploy
cp deploy/env.production.yaml.example deploy/env.production.yaml
# Fill in production values, then:
gcloud run deploy sheetstock \
  --source=. \
  --region=asia-southeast1 \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1024Mi \
  --cpu=1 \
  --max-instances=3 \
  --env-vars-file=deploy/env.production.yaml
```

> CI/CD via `cloudbuild.yaml` handles all subsequent deploys automatically on push to `main`.

---

## License

Private — all rights reserved.
