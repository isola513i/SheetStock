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
| `GOOGLE_SHEETS_RANGE` | Sheet range (default: `inventory!A:U`) |

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

```bash
# First-time deploy
gcloud run deploy sheetstock \
  --source=. \
  --region=asia-southeast1 \
  --allow-unauthenticated \
  --port=8080 --memory=512Mi

# CI/CD via Cloud Build is configured in cloudbuild.yaml
```

## License

Private -- all rights reserved.
