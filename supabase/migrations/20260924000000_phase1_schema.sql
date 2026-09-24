-- Phase 1: core schema for the Real Estate Agents marketplace.
-- This migration is intentionally separate from browser-facing RLS policies.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin', 'agent', 'lead');
create type public.lead_status as enum ('available', 'locked', 'sold');
create type public.lead_timeline as enum (
  'asap',
  '30_days',
  '60_days',
  '90_days',
  '6_months_plus',
  'exploring'
);
create type public.subscription_plan as enum ('pay_per_lead', 'starter', 'pro');
create type public.subscription_status as enum (
  'active',
  'trialing',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'paused'
);

-- A profile is created for every Supabase Auth user.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role public.app_role not null default 'lead'::public.app_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile linked one-to-one with auth.users. Browser users cannot change their role.';

-- Contact fields are intentionally stored here, but direct browser SELECT is
-- revoked in the RLS migration. The marketplace view excludes these fields.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  street_address text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  estimated_value numeric(14, 2),
  timeline public.lead_timeline not null,
  is_selling boolean not null default true,
  is_buying boolean not null default false,
  is_dual_transaction boolean generated always as (is_selling and is_buying) stored,
  property_specs jsonb not null default '{}'::jsonb,
  motivation text,
  urgency_score smallint not null,
  source text not null default 'public_intake',
  status public.lead_status not null default 'available'::public.lead_status,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_estimated_value_nonnegative check (
    estimated_value is null or estimated_value >= 0
  ),
  constraint leads_property_specs_object check (jsonb_typeof(property_specs) = 'object'),
  constraint leads_urgency_score_range check (urgency_score between 1 and 100),
  constraint leads_source_values check (
    source in ('public_intake', 'admin_import', 'external_campaign')
  )
);

comment on table public.leads is
  'Captured seller/buyer leads. Contact and exact-address fields are private until an agent unlocks the lead.';

create index leads_marketplace_idx
  on public.leads (status, city, state, postal_code);
create index leads_dual_transaction_idx
  on public.leads (is_dual_transaction, status, urgency_score desc);
create index leads_created_at_idx
  on public.leads (created_at desc);

-- One current subscription/credit account per agent. Stripe webhook processing
-- will reconcile plan periods and top-ups in Phase 3. The initial catalog uses
-- Starter = 5 and Pro = 20 monthly leads; the allowance is stored per account
-- so pricing can change without a schema migration.
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null unique references public.profiles (id) on delete cascade,
  plan public.subscription_plan not null default 'pay_per_lead'::public.subscription_plan,
  status public.subscription_status not null default 'active'::public.subscription_status,
  credits_remaining integer not null default 0,
  monthly_lead_allowance integer not null default 0,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_credits_nonnegative check (credits_remaining >= 0),
  constraint subscriptions_allowance_nonnegative check (monthly_lead_allowance >= 0),
  constraint subscriptions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

comment on table public.subscriptions is
  'Current agent plan and credit balance. Credits may represent top-ups or the current monthly allowance.';

create index subscriptions_status_idx
  on public.subscriptions (status, plan);

-- A unique agent/lead pair makes unlock operations idempotent.
create table public.unlocked_leads (
  agent_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unlock_source text not null default 'credit',
  stripe_payment_intent_id text unique,
  credits_charged smallint not null default 1,
  primary key (agent_id, lead_id),
  constraint unlocked_leads_source_values check (
    unlock_source in ('credit', 'subscription', 'stripe', 'admin')
  ),
  constraint unlocked_leads_credits_nonnegative check (credits_charged >= 0)
);

create index unlocked_leads_lead_idx
  on public.unlocked_leads (lead_id, unlocked_at desc);
-- Keep mutable record timestamps consistent.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- Authenticated lead submissions are associated with the current user without
-- granting the browser permission to choose created_by directly.
create or replace function public.set_lead_creator()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger leads_set_creator
before insert on public.leads
for each row execute function public.set_lead_creator();

-- Only trusted app metadata can provision an agent. User metadata cannot grant
-- either the agent or admin role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    case
      when new.raw_app_metadata ->> 'app_role' = 'agent'
        then 'agent'::public.app_role
      else 'lead'::public.app_role
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for auth users that existed before this migration.
insert into public.profiles (id, full_name, role)
select
  users.id,
  nullif(trim(coalesce(users.raw_user_meta_data ->> 'full_name', '')), ''),
  case
    when users.raw_app_metadata ->> 'app_role' = 'agent'
      then 'agent'::public.app_role
    else 'lead'::public.app_role
  end
from auth.users as users
on conflict (id) do nothing;

create or replace function public.validate_subscription_agent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  agent_role public.app_role;
begin
  select role into agent_role
  from public.profiles
  where id = new.agent_id;

  if agent_role is distinct from 'agent'::public.app_role then
    raise exception 'Subscriptions may only belong to agent profiles';
  end if;

  return new;
end;
$$;

create trigger subscriptions_validate_agent
before insert or update of agent_id on public.subscriptions
for each row execute function public.validate_subscription_agent();

create or replace function public.validate_unlock_agent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  agent_role public.app_role;
begin
  select role into agent_role
  from public.profiles
  where id = new.agent_id;

  if agent_role is distinct from 'agent'::public.app_role then
    raise exception 'Only agent profiles may unlock leads';
  end if;

  return new;
end;
$$;

create trigger unlocked_leads_validate_agent
before insert or update of agent_id on public.unlocked_leads
for each row execute function public.validate_unlock_agent();
