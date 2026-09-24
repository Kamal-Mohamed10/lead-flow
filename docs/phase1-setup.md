# Phase 1 setup

Phase 1 is a migration-first Supabase foundation. No credentials are stored in this
repository, and no hosted project is modified by these files.

## Files

- `supabase/migrations/20260924000000_phase1_schema.sql` creates the data model,
  enums, indexes, timestamps, and auth profile trigger.
- `supabase/migrations/20260924000100_phase1_rls.sql` enables RLS, grants least-
  privilege table access, creates the safe marketplace view, and adds protected
  detail/admin RPCs.
- `.env.example` lists the environment variables needed by the later Next.js
  application and integrations.

## Local database workflow

Install the Supabase CLI and Docker, then from the project root run:

```bash
cp .env.example .env.local
supabase start
supabase db reset
```

Apply the same migrations to a hosted project with:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

The service-role key is server-only. It must never be prefixed with
`NEXT_PUBLIC_` or sent to a browser bundle.

## Bootstrap the first administrator

New auth users receive the `lead` role by default. An `agent` role can be assigned
by a trusted server/admin provisioning path using the app metadata key
`app_role=agent`. The `admin` role must never be accepted from user metadata.

For a trusted SQL session, promote a specific existing user by replacing the email
placeholder and running the statement as the project owner:

```sql
update public.profiles
set role = 'admin'::public.app_role
where id = (
  select id from auth.users where email = 'admin@example.com'
);
```

## Privacy boundary

Browser roles do not receive direct `SELECT` on `public.leads`. Agents can read
`public.marketplace_leads`, which omits the full name, email, phone, exact street
address, and free-text motivation. Full details are returned only by
`public.get_lead_contact(lead_id)`, which requires the authenticated caller to be
an agent with a matching `public.unlocked_leads` record.

Subscription and unlock writes are not available to ordinary agents. The
`monthly_lead_allowance` column stores the active plan allowance (Starter = 5,
Pro = 20 in the initial catalog). Stripe webhooks and server-side purchase
actions should use the Supabase service role or a narrowly scoped trusted
database function when those flows are implemented in later phases.
