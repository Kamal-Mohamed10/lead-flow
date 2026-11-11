-- Migration: 0004_property_intelligence.sql
-- Description: Canonical property identification (BBL), source record audit trails, research signals, and opportunity assignments

DO $$ BEGIN
    CREATE TYPE public.opportunity_status AS ENUM ('discovered', 'under_review', 'assigned', 'dismissed', 'actioned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bbl VARCHAR(10) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    borough TEXT NOT NULL,
    block TEXT NOT NULL,
    lot TEXT NOT NULL,
    zip_code TEXT,
    property_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_source_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    source_record_id TEXT NOT NULL,
    raw_payload JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source, source_record_id)
);

CREATE TABLE IF NOT EXISTS public.property_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
    summary TEXT NOT NULL,
    status public.opportunity_status NOT NULL DEFAULT 'discovered',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.opportunity_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(opportunity_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_properties_bbl ON public.properties(bbl);
CREATE INDEX IF NOT EXISTS idx_signals_property ON public.property_signals(property_id);
CREATE INDEX IF NOT EXISTS idx_opp_assignments_org ON public.opportunity_assignments(organization_id);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read canonical properties"
    ON public.properties FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read property signals"
    ON public.property_signals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Organization members can read assigned source records"
    ON public.property_source_records FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.opportunities AS opportunity
        JOIN public.opportunity_assignments AS assignment
          ON assignment.opportunity_id = opportunity.id
        WHERE opportunity.property_id = property_source_records.property_id
          AND public.is_org_member(assignment.organization_id)
      )
    );

CREATE POLICY "Users view assigned opportunities"
    ON public.opportunities FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT opportunity_id FROM public.opportunity_assignments
            WHERE public.is_org_member(organization_id)
        )
    );

CREATE POLICY "Members can view their organization assignments"
    ON public.opportunity_assignments FOR SELECT TO authenticated
    USING (public.is_org_member(organization_id));

CREATE POLICY "Org admins can manage opportunity assignments"
    ON public.opportunity_assignments FOR ALL TO authenticated
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

GRANT SELECT ON public.properties, public.property_source_records, public.property_signals,
  public.opportunities, public.opportunity_assignments TO authenticated;
GRANT ALL ON public.properties, public.property_source_records, public.property_signals,
  public.opportunities, public.opportunity_assignments TO service_role;
