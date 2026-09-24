-- Phase 1: least-privilege access policies and privacy boundary.
-- Browser roles never receive direct SELECT on public.leads.

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select profile.role
  from public.profiles as profile
  where profile.id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'admin'::public.app_role, false);
$$;

create or replace function public.is_agent()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'agent'::public.app_role, false);
$$;

revoke all on function public.current_app_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_agent() from public;
grant execute on function public.current_app_role() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_agent() to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.subscriptions enable row level security;
alter table public.unlocked_leads enable row level security;

-- Profiles: users can read/update their own profile; admins can read all.
create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or public.is_admin()
);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone, avatar_url) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- Agents can read their own subscription/account. Only admins may mutate it
-- through an authenticated admin session; Stripe webhooks use service_role.
create policy subscriptions_select_self_or_admin
on public.subscriptions
for select
to authenticated
using (
  agent_id = (select auth.uid())
  or public.is_admin()
);

create policy subscriptions_admin_insert
on public.subscriptions
for insert
to authenticated
with check (public.is_admin());

create policy subscriptions_admin_update
on public.subscriptions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy subscriptions_admin_delete
on public.subscriptions
for delete
to authenticated
using (public.is_admin());

revoke all on table public.subscriptions from public, anon, authenticated;
grant select, insert, update, delete on table public.subscriptions to authenticated;
grant all on table public.subscriptions to service_role;
-- Unlock history is private to the owning agent (and admins). Ordinary agents
-- cannot create or delete unlock rows from the browser.
create policy unlocked_leads_select_self_or_admin
on public.unlocked_leads
for select
to authenticated
using (
  agent_id = (select auth.uid())
  or public.is_admin()
);

create policy unlocked_leads_admin_insert
on public.unlocked_leads
for insert
to authenticated
with check (public.is_admin());

create policy unlocked_leads_admin_update
on public.unlocked_leads
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy unlocked_leads_admin_delete
on public.unlocked_leads
for delete
to authenticated
using (public.is_admin());

revoke all on table public.unlocked_leads from public, anon, authenticated;
grant select, insert, update, delete on table public.unlocked_leads to authenticated;
grant all on table public.unlocked_leads to service_role;

-- Public intake can create only an available, consented lead. No browser role
-- receives a direct SELECT policy or privilege on the private base table.
create policy leads_public_intake_insert
on public.leads
for insert
to anon, authenticated
with check (
  status = 'available'::public.lead_status
  and source = 'public_intake'
  and consent_at is not null
  and (
    created_by is null
    or created_by = (select auth.uid())
  )
);

revoke all on table public.leads from public, anon, authenticated;
grant insert (
  full_name,
  email,
  phone,
  street_address,
  city,
  state,
  postal_code,
  estimated_value,
  timeline,
  is_selling,
  is_buying,
  property_specs,
  motivation,
  urgency_score
) on table public.leads to anon, authenticated;
grant all on table public.leads to service_role;

grant usage on type public.app_role to anon, authenticated;
grant usage on type public.lead_status to anon, authenticated;
grant usage on type public.lead_timeline to anon, authenticated;
grant usage on type public.subscription_plan to authenticated;
grant usage on type public.subscription_status to authenticated;

-- This view is the only normal browser read path for marketplace cards. It
-- intentionally omits full_name, email, phone, and exact street_address.
create or replace view public.marketplace_leads
with (security_barrier = true)
as
select
  id,
  city,
  state,
  postal_code,
  estimated_value,
  timeline,
  is_selling,
  is_buying,
  is_dual_transaction,
  property_specs,
  urgency_score,
  status,
  created_at
from public.leads
where status = 'available'::public.lead_status
  and public.is_agent();

comment on view public.marketplace_leads is
  'Privacy-safe available leads for authenticated agents. Exact address, contact fields, and free-text motivation are intentionally excluded.';

revoke all on public.marketplace_leads from public;
revoke all on public.marketplace_leads from anon;
grant select on public.marketplace_leads to authenticated;
grant select on public.marketplace_leads to service_role;

-- Full contact/address access is deliberately behind a function-level check.
-- An authenticated agent receives zero rows unless an unlock row already exists.
create or replace function public.get_lead_contact(p_lead_id uuid)
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  street_address text,
  city text,
  state text,
  postal_code text,
  estimated_value numeric,
  timeline public.lead_timeline,
  is_selling boolean,
  is_buying boolean,
  is_dual_transaction boolean,
  property_specs jsonb,
  motivation text,
  urgency_score smallint,
  status public.lead_status,
  unlocked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_agent uuid := auth.uid();
begin
  if not public.is_agent() then
    raise exception 'Only agents can access unlocked lead details'
      using errcode = '42501';
  end if;

  return query
  select
    lead.id,
    lead.full_name,
    lead.email,
    lead.phone,
    lead.street_address,
    lead.city,
    lead.state,
    lead.postal_code,
    lead.estimated_value,
    lead.timeline,
    lead.is_selling,
    lead.is_buying,
    lead.is_dual_transaction,
    lead.property_specs,
    lead.motivation,
    lead.urgency_score,
    lead.status,
    unlocked.unlocked_at
  from public.leads as lead
  inner join public.unlocked_leads as unlocked
    on unlocked.lead_id = lead.id
   and unlocked.agent_id = requesting_agent
  where lead.id = p_lead_id;
end;
$$;

comment on function public.get_lead_contact(uuid) is
  'Returns full lead details only to the authenticated agent that has already unlocked the lead.';

-- Admins get a separate protected read path rather than a broad browser grant
-- on the private leads table.
create or replace function public.get_admin_leads()
returns table (
  id uuid,
  created_by uuid,
  full_name text,
  email text,
  phone text,
  street_address text,
  city text,
  state text,
  postal_code text,
  estimated_value numeric,
  timeline public.lead_timeline,
  is_selling boolean,
  is_buying boolean,
  is_dual_transaction boolean,
  property_specs jsonb,
  motivation text,
  urgency_score smallint,
  source text,
  status public.lead_status,
  consent_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can access all leads'
      using errcode = '42501';
  end if;

  return query
  select
    lead.id,
    lead.created_by,
    lead.full_name,
    lead.email,
    lead.phone,
    lead.street_address,
    lead.city,
    lead.state,
    lead.postal_code,
    lead.estimated_value,
    lead.timeline,
    lead.is_selling,
    lead.is_buying,
    lead.is_dual_transaction,
    lead.property_specs,
    lead.motivation,
    lead.urgency_score,
    lead.source,
    lead.status,
    lead.consent_at,
    lead.created_at,
    lead.updated_at
  from public.leads as lead;
end;
$$;

comment on function public.get_admin_leads() is
  'Returns all captured leads to an authenticated administrator, including protected contact fields.';

revoke all on function public.get_lead_contact(uuid) from public, anon;
revoke all on function public.get_admin_leads() from public, anon;
grant execute on function public.get_lead_contact(uuid) to authenticated, service_role;
grant execute on function public.get_admin_leads() to authenticated, service_role;
