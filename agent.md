# AI Agent Instructions for SheetStock

## 1. Project Overview
SheetStock is a Mobile-first inventory & pricing management PWA for K-Beauty warehouse operations. 
It uses Google Sheets as its primary database for reading product data, tracking real-time inventory, managing customer pricing tiers (Bronze/Silver/Gold), and handling barcode scanning.

## 2. Tech Stack & Key Libraries
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.9
- **UI/Styling:** Tailwind CSS v4, CSS variables, `shadcn/ui`, Radix primitives (`@base-ui/react`), `lucide-react`
- **Animations:** Motion (`motion` package / Framer Motion)
- **Data Fetching/State:** `swr` for client-side fetching
- **Database/Backend:** Google Sheets API (`googleapis`)
- **Authentication:** Custom cookie sessions with `bcryptjs`, RBAC middleware (Admin, Sale, Customer)
- **Hardware/PWA integration:** `html5-qrcode` for barcode scanning, `pulltorefreshjs` for native-like refresh.

## 3. Architecture & Directory Structure
- `app/api/`: Next.js Route Handlers (REST API for auth, inventory, pricing, catalog).
- `app/(roles)/`: App router pages split by roles (`admin`, `catalog`, `pricing`, `login`, `register`).
- `components/ui/`: Base UI components (shadcn/ui style). Always reuse these before creating new elements.
- `components/sheets/`: Bottom sheet modals used for mobile interfaces (Filter, Sort, ProductDetail).
- `components/`: Shared components like `BottomNav.tsx`, `ProductList.tsx`.
- `lib/server/`: **STRICT RULE** - Server-only logic (auth, Google Sheets API loaders, pricing engine). Never import these into client components.
- `lib/types.ts`: Global TypeScript interfaces and types.

## 4. Coding Conventions
### Next.js & React 19
- Default to **React Server Components (RSC)**.
- Only use `"use client"` at the top of the file when using React hooks (useState, useEffect, SWR), event listeners, or browser APIs (like `html5-qrcode`).
- Use Next.js 15 conventions for routing and data mutations.

### Styling & UI
- **Mobile-First:** Since this is a PWA for warehouse operations, ensure UI is optimized for mobile screens first.
- **Tailwind v4:** Use modern Tailwind v4 utility classes.
- **Dark Mode:** Respect system-aware dark mode using CSS variables. 

### TypeScript Strictness
- Provide strict types for all function parameters and returns.
- **NO `any` types.** Always define interfaces in `lib/types.ts` for Google Sheets row data.

### Performance & PWA
- Optimize image/asset loading to maintain PWA offline capabilities and fast load times.
- Avoid bulky client-side packages.

## 5. Serena MCP & Workflow Guidelines
- **Symbol Check:** Always use Serena's memory/symbol tool to check `components/ui/` or `lib/server/` for existing functions before implementing new ones.
- **Understand Dependencies:** Before modifying Route Handlers in `app/api/`, check how `lib/server/` files interact with the Google Sheets API.
- **Atomic Edits:** When refactoring, output only the specific chunks of code that change to preserve token usage.
