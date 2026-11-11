-- Atomically exclude organization duplicates while creating discoveries.
CREATE OR REPLACE FUNCTION public.claim_discovered_opportunity(
  p_organization_id UUID,
  p_assigned_user_id UUID,
  p_bbl TEXT,
  p_address TEXT,
  p_borough TEXT,
  p_block TEXT,
  p_lot TEXT,
  p_zip_code TEXT,
  p_property_type TEXT,
  p_score INTEGER,
  p_summary TEXT,
  p_signal_type TEXT,
  p_evidence JSONB,
  p_occurred_at TIMESTAMPTZ
)
RETURNS TABLE (
  inserted BOOLEAN,
  property_id UUID,
  opportunity_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_property_id UUID;
  v_opportunity_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_organization_id::TEXT || ':' || p_bbl, 0)
  );

  SELECT property.id, opportunity.id
    INTO v_property_id, v_opportunity_id
  FROM public.opportunity_assignments AS assignment
  JOIN public.opportunities AS opportunity
    ON opportunity.id = assignment.opportunity_id
  JOIN public.properties AS property
    ON property.id = opportunity.property_id
  WHERE assignment.organization_id = p_organization_id
    AND property.bbl = p_bbl
  ORDER BY assignment.assigned_at DESC
  LIMIT 1;

  IF v_opportunity_id IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, v_property_id, v_opportunity_id;
    RETURN;
  END IF;

  INSERT INTO public.properties AS existing (
    bbl,
    address,
    borough,
    block,
    lot,
    zip_code,
    property_type
  )
  VALUES (
    p_bbl,
    p_address,
    p_borough,
    p_block,
    p_lot,
    p_zip_code,
    p_property_type
  )
  ON CONFLICT (bbl) DO UPDATE
    SET address = CASE
          WHEN existing.address LIKE 'Block % Lot %' THEN EXCLUDED.address
          ELSE existing.address
        END,
        zip_code = COALESCE(existing.zip_code, EXCLUDED.zip_code),
        property_type = COALESCE(existing.property_type, EXCLUDED.property_type),
        updated_at = now()
  RETURNING id INTO v_property_id;

  INSERT INTO public.property_signals (
    property_id,
    signal_type,
    evidence,
    occurred_at
  )
  VALUES (
    v_property_id,
    p_signal_type,
    COALESCE(p_evidence, '{}'::JSONB),
    COALESCE(p_occurred_at, now())
  );

  INSERT INTO public.opportunities (
    property_id,
    score,
    summary,
    status
  )
  VALUES (
    v_property_id,
    p_score,
    p_summary,
    'discovered'::public.opportunity_status
  )
  RETURNING id INTO v_opportunity_id;

  INSERT INTO public.opportunity_assignments (
    opportunity_id,
    organization_id,
    assigned_user_id
  )
  VALUES (
    v_opportunity_id,
    p_organization_id,
    p_assigned_user_id
  );

  RETURN QUERY SELECT TRUE, v_property_id, v_opportunity_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_discovered_opportunity(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, JSONB, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_discovered_opportunity(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, JSONB, TIMESTAMPTZ
) TO service_role;
