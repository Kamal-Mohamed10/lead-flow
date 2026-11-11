-- Migration: 0003_organizations.sql
-- Description: Multi-tenant organization structure, hybrid visibility, and auto-provisioning workspace triggers

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$ BEGIN
    CREATE TYPE public.organization_type AS ENUM ('individual', 'brokerage');
    CREATE TYPE public.visibility_mode AS ENUM ('assigned_only', 'brokerage_shared', 'team_shared');
    CREATE TYPE public.member_role AS ENUM ('owner', 'admin', 'team_lead', 'agent');
    CREATE TYPE public.member_status AS ENUM ('active', 'invited', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type public.organization_type NOT NULL DEFAULT 'individual',
    visibility_mode public.visibility_mode NOT NULL DEFAULT 'assigned_only',
    billing_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.member_role NOT NULL DEFAULT 'agent',
    status public.member_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role public.member_role NOT NULL DEFAULT 'agent',
    token TEXT UNIQUE NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
  );
$$;

CREATE POLICY "Users can view orgs they belong to"
    ON public.organizations FOR SELECT
    USING (public.is_org_member(id));

CREATE POLICY "Org admins can update org settings"
    ON public.organizations FOR UPDATE
    USING (public.is_org_admin(id))
    WITH CHECK (public.is_org_admin(id));

CREATE POLICY "Members can view co-members in their org"
    ON public.organization_members FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Admins can manage memberships"
    ON public.organization_members FOR ALL
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Org admins can manage invitations"
    ON public.organization_invitations FOR ALL
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    new_org_id UUID;
BEGIN
    INSERT INTO public.organizations (name, type, billing_owner_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Agent') || ' Workspace',
      'individual',
      NEW.id
    )
    RETURNING id INTO new_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (new_org_id, NEW.id, 'owner', 'active');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_workspace ON auth.users;
CREATE TRIGGER on_auth_user_created_workspace
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_workspace();

GRANT SELECT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invitations TO authenticated;
GRANT ALL ON public.organizations, public.organization_members, public.organization_invitations TO service_role;
