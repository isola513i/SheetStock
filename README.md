# SheetStock

Mobile-first inventory & pricing management PWA for K-Beauty warehouse operations. Reads product data from Google Sheets and provides real-time inventory tracking, customer pricing tiers, and barcode scanning.

## Features

- **Inventory Dashboard** -- search, filter, sort across products with barcode scanning
- **Pricing Management** -- per-customer tier pricing (Bronze/Silver/Gold) with override approvals
- **Customer Catalog** -- personalized product catalog with resolved pricing
- **Role-Based Access** -- Admin, Sale, Customer roles with separate views
- **Customer Registration** -- self-signup with admin approval flow
- **PWA** -- installable, offline-capable, push-to-refresh
- **Dark Mode** -- system-aware with manual toggle

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + CSS variables |
| UI | shadcn/ui + Radix primitives |
| Data | Google Sheets API |
| Auth | Cookie sessions + RBAC middleware |
| Animations | Motion (Framer Motion) |
| Deployment | Google Cloud Run (Singapore) |

## Getting Started

### Prerequisites

- Node.js 20+
- Google Cloud service account with Sheets API access

### Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Fill in your Google credentials in .env
# then start development server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Service account private key |
| `GOOGLE_SHEET_ID` | Google Sheets spreadsheet ID |
| `GOOGLE_SHEETS_RANGE` | Product sheet range (default: `inventory!A:Q`; company sheet example: `สินค้า!A:Q`) |

## Project Structure

```
app/
  api/            # REST API routes (auth, inventory, pricing, catalog)
  admin/          # Admin approval pages
  catalog/        # Customer catalog
  pricing/        # Pricing management
  login/          # Authentication
  register/       # Customer registration
components/
  ui/             # Base UI components (shadcn/ui)
  sheets/         # Bottom sheet modals (Filter, Sort, ProductDetail)
  BottomNav.tsx   # Role-based navigation
  ProductList.tsx # Inventory list/grid view
lib/
  server/         # Server-only: auth, inventory loader, pricing engine
  types.ts        # Shared TypeScript types
public/
  sw.js           # Service worker (offline caching)
  icons/          # PWA icons (48px - 512px)
```

## Deployment

Deployed on **Google Cloud Run** (asia-southeast1).

Production URL: `https://sheetstock-bj7dtu5hkq-as.a.run.app`

```bash
# Preflight
npm run deploy:check

# First-time deploy using the checked-in Dockerfile
cp deploy/env.production.yaml.example deploy/env.production.yaml
# Fill in production values before deploying.

gcloud run deploy sheetstock \
  --source=. \
  --region=asia-southeast1 \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1024Mi \
  --cpu=1 \
  --max-instances=3 \
  --env-vars-file=deploy/env.production.yaml

# CI/CD via Cloud Build is configured in cloudbuild.yaml
# Required runtime env vars still need to be set on the Cloud Run service.
```

### Required production config

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`, `TOKEN_SECRET`, and `NEXT_PUBLIC_SITE_URL` are required for the app to boot correctly in production.
- `GOOGLE_USERS_RANGE` and `GOOGLE_ANNOUNCEMENTS_RANGE` should be set if you use the registration approval flow and announcements feed.
- `GCS_BUCKET_NAME` is required if admins upload product images through `/api/upload/image`.
- For Cloud Build trigger deploys, configure the same values on the `sheetstock` Cloud Run service or source them from Secret Manager.

## License

Private -- all rights reserved.
