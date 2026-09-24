# Real Estate Agents

B2B SaaS Real Estate Lead Marketplace MVP for high-intent homeowners who may be
selling and buying at the same time.

## Current status

Phase 1 is scaffolded as a Supabase database foundation. It includes:

- `profiles` linked to Supabase Auth users with `admin`, `agent`, and `lead` roles.
- `leads` for dual-transaction lead intake and marketplace status tracking.
- `subscriptions` for plans, Stripe identifiers, and credit balances.
- `unlocked_leads` for the agent/lead unlock relationship.
- RLS and privacy-safe marketplace/detail access functions.

Phase 2 now includes a Next.js App Router public funnel:

- Responsive marketing landing page at `/`
- Multi-step private intake at `/sell-and-buy`
- Mapbox-compatible address autocomplete with manual-entry fallback
- Preliminary home-value estimate based on property details
- Server-side Supabase lead insertion with development demo mode when credentials are absent

Stripe subscriptions, the agent marketplace, and the admin dashboard are still planned for later phases.

## Project setup

See [`docs/phase1-setup.md`](docs/phase1-setup.md) for database setup and administrator bootstrap instructions. See [`docs/phase2-setup.md`](docs/phase2-setup.md) for the public funnel and address-search setup.

The project is located at:

`/Users/kamal/.cline/data/workspaces/chat/real_estate`
