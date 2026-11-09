# Real Estate Lead Marketplace

A B2B SaaS platform that connects homeowners looking to sell and buy simultaneously with qualified real estate agents. The platform streamlines the lead generation process and provides a marketplace for agents to manage and unlock high-intent leads.

## Product Overview

**Problem:** Homeowners trying to sell and buy simultaneously struggle to find agents who understand their dual-transaction needs. Real estate agents waste time on low-quality leads without clear intent.

**Solution:** A curated marketplace where homeowners submit their property details and transaction needs, and agents can review, unlock, and manage qualified leads with full transparency.

## Features

### Phase 1 - Database Foundation
- **User Profiles** linked to Supabase Auth with role-based access (`admin`, `agent`, `lead`)
- **Lead Intake** system for dual-transaction homeowners
- **Subscription Management** with plan tracking and credit balances
- **Unlocked Leads** relationship between agents and leads
- **Row-Level Security (RLS)** for privacy-safe marketplace access

### Phase 2 - Public Funnel
- **Responsive Marketing Landing Page** - showcases the platform value proposition
- **Multi-Step Private Intake Form** - collects comprehensive property and transaction details
- **Mapbox Address Autocomplete** with manual-entry fallback for precise location tracking
- **Preliminary Home-Value Estimate** - automated property valuation based on provided details
- **Server-Side Lead Insertion** with development demo mode when Supabase credentials are absent

### Planned Features
- **Stripe Subscriptions** - tiered pricing plans for agents
- **Agent Marketplace** - agents can browse and select leads
- **Admin Dashboard** - platform administration and analytics
- **Lead Verification** - validate homeowner submissions
- **Integration with CRM systems**

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** Supabase (PostgreSQL) with Prisma ORM
- **Authentication:** Supabase Auth / Next-Auth
- **Styling:** Tailwind CSS, Radix UI components, Framer Motion
- **Valuation:** Custom home-value estimation algorithm
- **Address:** Mapbox API integration
- **Payments:** Stripe integration (planned)

## Project Structure

```
app/                    # Next.js App Router pages
  - layout.tsx          # Root layout with global styles
  - page.tsx            # Homepage landing page
  - auth/               # Authentication routes
  - dashboard/          # Agent dashboard
  - sell-and-buy/       # Multi-step lead intake form

components/             # React components
  - ui/                 # Reusable UI components (Radix UI)
  - lead-capture-form.tsx # Lead capture form
  - market-explorer.tsx # Market exploration interface
  - hero-search.tsx     # Hero section search component
  - address-lookup.tsx  # Mapbox address autocomplete
  - form-field.tsx      # Reusable form field component
  - calendar/           # Calendar-related components
  - crm/                # CRM integration components

lib/                    # Business logic and utilities
  - home-value.ts       # Property valuation logic
  - lead-schema.ts      # Lead data validation schema
  - supabase.ts         # Supabase client configuration
  - auth.ts / auth.config.ts # Authentication utilities
  - utils.ts            # General utility functions
  - address.ts          # Address processing utilities
  - stripe/             # Stripe payment integration (planned)

prisma/                 # Database schema
  - schema.prisma       # Prisma ORM schema definition

supabase/               # Supabase configurations
  - migrations/         # Database migrations

public/                 # Static assets
```

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your Supabase URL and anon key, and optional Stripe keys

# Run development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

## Database Schema

The Prisma schema includes tables for:
- `profiles` - user profiles with roles
- `leads` - property and transaction leads
- `subscriptions` - agent subscription plans
- `unlocked_leads` - agent-lead relationship tracking

## Development Phases

**Phase 1** (Complete): Database foundation with RLS policies and basic CRUD operations
**Phase 2** (Complete): Public funnel with lead capture, address autocomplete, and home-value estimates
**Phase 3** (Planned): Stripe subscriptions, agent marketplace, admin dashboard

## API Routes

Key API endpoints include:
- Lead creation and management
- Agent profile management
- Lead unlock/unlock processes
- Subscription management

## License

This project is private and confidential. All rights reserved.
