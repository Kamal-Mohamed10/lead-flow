# Phase 2 setup

Phase 2 adds the public Next.js funnel at `/sell-and-buy`.

## Run locally

From the project root:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000` for the landing page or
`http://localhost:3000/sell-and-buy` for the intake form.

## Environment

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` enable the
  public lead insert through the RLS policy created in Phase 1.
- `MAPBOX_ACCESS_TOKEN` enables server-side Mapbox Geocoding autocomplete.
- `NEXT_PUBLIC_MAPBOX_TOKEN` is optional and reserved for a future browser map.
  The current autocomplete route prefers the server-only token.

If Supabase variables are absent in development, the form uses a clearly
labeled preview mode and does not persist a lead. Production submissions fail
closed until Supabase is configured.

## Data and privacy

The browser sends the intake to `/api/leads`; the route validates the payload
with Zod and inserts only the columns allowed by the Phase 1 RLS policy. The
client does not use the service-role key and does not request a returned lead
row, so protected contact fields are not exposed through the API response.

The home-value number is an illustrative estimate based on square footage,
property type, and a small state-level baseline. It is not an appraisal or a
guarantee of sale price.

## Useful checks

```bash
npm run typecheck
npm run lint
npm run build
```
