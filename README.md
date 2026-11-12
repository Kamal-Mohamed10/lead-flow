# LeadFlow NYC

**Off-market property intelligence for NYC real estate wholesalers and off-market real estate agents.**

LeadFlow NYC turns live New York City public municipal registries into ranked off-market deal reports—pairing ACRIS deed/mortgage recordings, Department of Finance (DOF) market valuations and tax-lien sale lists, and HPD/DOB filings with transparent 0–100 scoring, DNC-scrubbed owner research, and downloadable full Property Report PDFs.

> **Research-only workflow:** LeadFlow does **not** send automated calls, texts, emails, or direct-mail campaigns. It gives wholesalers and acquisition agents verified property, equity, debt, and ownership intelligence so they can run outreach themselves compliantly.

---

## Key Capabilities

- **Daily Overview & Priority Queue (`/dashboard`)**
  - Discovers off-market NYC parcels, ranks candidates **highest-score-first** (`#1–#20`), and caches batches hourly for fast repeat navigation.
- **8 Seller Motivation Categories**
  - Pre-foreclosures (Lis Pendens / referee notices)
  - Estate & Probate Sales (Surrogate Court / executor filings)
  - Vacant Properties (HPD non-occupancy & inactive buildings)
  - Short Sales (recorded debt vs. market valuation thresholds)
  - Expired & Withdrawn Listings
  - Bank-Owned (REO)
  - Tax-Delinquent Properties (NYC DOF tax-lien sale notices)
  - Foreclosure Auctions (scheduled / imminent auction filings)
- **Transparent 0–100 Market Intelligence Scoring**
  - Computed across 4 weighted pillars:
    1. **Distress Catalyst & Filing Urgency** (0–45 pts)
    2. **Equity Spread & Debt Exposure** (0–25 pts)
    3. **Building Age & Capital Stagnation** (0–18 pts)
    4. **Ownership Structure & Deal Agility** (0–12 pts)
- **Explore Properties & NYC Geographic Deal Map (`/dashboard/leads`)**
  - Filterable split, map, and grid workspace across **Manhattan, Brooklyn, Queens, Bronx, and Staten Island** with direct parcel lookup by address/BBL and pipeline statuses (`Watchlist`, `Vault`, `Under Contract`, `Archived`).
- **Full Property Reports & PDF Export (`/dashboard/properties/[id]`)**
  - **Public Equity & Debt Breakdown**: Live NYC DOF Market Value, ACRIS Recorded Mortgage amount & date, DOF Municipal Liens count/estimate, and calculated Estimated Net Equity & Equity Spread %.
  - **Building Specifications & Signals**: Units, Year Built, Building Class, Borough/Block/Lot, and recorded municipal filings in compact scrollable panels.
  - **Instant Forensic Research**: 5-part breakdown covering Equity & Ownership Tenure, Financial Distress & Tax Liens, Building Condition & Violations, Occupancy & Estate Status, and Market Velocity.
  - **Download Full Property Report PDF**: Client-side multi-page PDF generator exporting every section of the property report—accessible from Property Reports, Explore Properties, and Watchlist.
- **Find Owner, Entity Lookups & Automated DNC Scrubbing**
  - Extracts deed grantees/parties from NYC ACRIS, multiple-dwelling contacts from HPD registrations, and applicants from DOB permits, checks numbers against the DNC registry, and provides direct NYS Department of State LLC/entity inquiry links.
- **Watchlist (`/dashboard/watchlist`) & Agent Notes (`/dashboard/notes`)**
  - Save priority parcels to your Watchlist pipeline and log structured property & seller-motivation research notes.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Public NYC Datasets**: NYC Open Data (MapPLUTO, ACRIS Master/Legals/Parties, DOF Property Valuation, DOF Tax-Lien Sale List, HPD Registrations & Violations, DOB Permits & Violations)
- **PDF Export**: Client-side `jsPDF` report builder (`lib/propertyReportPdf.ts`)
- **Optional Persistence & Integrations**: Supabase Auth / PostgreSQL (`supabase/migrations`), Mapbox Address Search, OpenAI note summarization (`/api/ai/agent-notes`)

---

## Run Locally

### Requirements
- Node.js 20+ (Node 22/24 recommended) and npm

### Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Quick Demo Access (`/login`)**: When Supabase credentials are not configured in `.env.local`, sign in with `kamal@example.com` / `demo` to open the `Good Morning Kamal` workspace with live NYC Open Data lookups and browser `localStorage` persistence.

### Verification Commands

```bash
npm run typecheck
npm run lint
npm run build
```

---

## Optional Environment Variables

See [`.env.example`](./.env.example) for the complete list:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: Enable Supabase authentication and PostgreSQL persistence (`supabase/migrations/`).
- `NYC_OPEN_DATA_APP_TOKEN`: Higher Socrata API rate limits for NYC Open Data lookups.
- `OPENAI_API_KEY` & `OPENAI_MODEL`: Enable model-assisted structuring for Agent Notes (deterministic public-record summaries work without it).
- `MAPBOX_ACCESS_TOKEN` / `NEXT_PUBLIC_MAPBOX_TOKEN`: Optional address autocomplete.

---

## Data Sources & Compliance Notice

Property signals, valuations, mortgages, and ownership records are retrieved from public NYC Open Data datasets (PLUTO, ACRIS, DOF, HPD, and DOB). Public records can be delayed, partial, or reflect historical entities; opportunity scores prioritize research and do **not** guarantee seller intent or current title status. Wholesalers and real estate agents remain responsible for independently verifying ownership, payoff balances, and DNC/TCPA/marketing compliance prior to making contact.

## License

No license has been selected yet. All rights are reserved unless a license is added to this repository.
