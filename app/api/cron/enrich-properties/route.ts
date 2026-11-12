import { NextResponse } from 'next/server'
import {
  getSupabaseAdminClient,
  requireAuth,
  SupabaseConfigurationError,
} from '@/lib/auth'
import { enrichPropertyOpportunity } from '@/lib/services/enrichmentService'
import { fetchUnseenNYCSignals } from '@/lib/scrapers/nycRouter'
import { classifyOpportunity } from '@/lib/motivationClassifier'

export async function POST(request: Request) {
  try {
    const requestBody = await request.text()
    const body = requestBody ? (JSON.parse(requestBody) as { boroughs?: unknown; limit?: unknown }) : {}
    const requestedLimit =
      typeof body.limit === 'number' && Number.isFinite(body.limit)
        ? Math.min(Math.max(Math.floor(body.limit), 1), 20)
        : 10
    const boroughs = Array.isArray(body.boroughs)
      ? body.boroughs.filter(
          (borough): borough is string =>
            typeof borough === 'string' &&
            ['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island'].includes(borough)
        )
      : []
    const auth = await requireAuth()
    if (auth.response) return auth.response

    const { data: memberships, error: membershipError } = await auth.supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', auth.user.id)
      .eq('status', 'active')

    if (membershipError) {
      throw new Error(`Could not load workspace membership: ${membershipError.message}`)
    }
    if (!memberships?.length) {
      return NextResponse.json({ error: 'No active workspace membership found.' }, { status: 403 })
    }

    const requestedOrganizationId = new URL(request.url).searchParams.get('organization_id')
    const membership = requestedOrganizationId
      ? memberships.find((item) => item.organization_id === requestedOrganizationId)
      : memberships.length === 1
        ? memberships[0]
        : null
    if (!membership) {
      return NextResponse.json(
        {
          error:
            requestedOrganizationId
              ? 'The requested organization is not an active workspace for this user.'
              : 'Multiple workspaces found. Provide organization_id to choose one.',
        },
        { status: requestedOrganizationId ? 403 : 400 }
      )
    }

    const signals = await fetchUnseenNYCSignals(membership.organization_id, requestedLimit, boroughs)
    const admin = getSupabaseAdminClient()
    const processedResults: Array<{
      bbl: string
      propertyId: string
      opportunityId: string
      score: number
      enriched: Awaited<ReturnType<typeof enrichPropertyOpportunity>>
      address: string
      borough: string
      zip: string
      block: string
      lot: string
      units: number
      yearBuilt: number | null
      buildingClass: string | null
      source: string
      signals: string[]
      category: string
      categoryNumber: number
      subheadline: string
      reason: string
      opportunityAngle: string
      badgeBg: string
      badgeText: string
      badgeBorder: string
    }> = []

    const currentYear = new Date().getFullYear()
    for (const signal of signals) {
      const enriched = await enrichPropertyOpportunity(signal)
      const units = Number(signal.buildingDetails.unitsres || signal.buildingDetails.unitstotal || 0)
      const yearBuilt = Number(signal.buildingDetails.yearbuilt || 0) || null
      const alteredYear = Number(signal.buildingDetails.yearalter1 || 0)
      const recentAlteration = alteredYear > 0 ? alteredYear >= currentYear - 10 : null
      const classification = classifyOpportunity({
        documentType: signal.documentType,
        signals: [
          signal.documentType.replace(/_/g, ' '),
          ...signal.cascadedSources.map((source) => `Public record: ${source}`),
        ],
        source: signal.cascadedSources.join(', '),
        ownerName: signal.ownerName,
        address: signal.address,
        bbl: signal.bbl,
        yearBuilt,
        units,
        recentAlteration,
      })

      const { data: claim, error: claimError } = await admin
        .rpc('claim_discovered_opportunity', {
          p_organization_id: membership.organization_id,
          p_assigned_user_id: auth.user.id,
          p_bbl: signal.bbl,
          p_address: signal.address,
          p_borough: signal.borough,
          p_block: signal.block,
          p_lot: signal.lot,
          p_zip_code: signal.zipCode,
          p_property_type: signal.propertyType,
          p_score: classification.score || enriched.opportunityScore,
          p_summary: `${classification.category}: ${classification.reason}`,
          p_signal_type: signal.documentType,
          p_evidence: {
            category: classification.category,
            categoryNumber: classification.categoryNumber,
            subheadline: classification.subheadline,
            reason: classification.reason,
            opportunityAngle: classification.opportunityAngle,
            ownerName: signal.ownerName,
            buildingDetails: signal.buildingDetails,
            cascadedSources: signal.cascadedSources,
            rawDetails: signal.rawDetails,
            recommendedAction: enriched.recommendedAction,
          },
          p_occurred_at: signal.occurredAt,
        })

      if (claimError) {
        throw new Error(`Could not claim opportunity for ${signal.bbl}: ${claimError.message}`)
      }

      const saved = Array.isArray(claim) ? claim[0] : null
      if (!saved?.inserted) continue

      processedResults.push({
        bbl: signal.bbl,
        propertyId: saved.property_id,
        opportunityId: saved.opportunity_id,
        score: classification.score || enriched.opportunityScore,
        enriched,
        address: signal.address,
        borough: signal.borough,
        zip: signal.zipCode || '',
        block: signal.block,
        lot: signal.lot,
        units: Number(signal.buildingDetails.unitsres || signal.buildingDetails.unitstotal || 0),
        yearBuilt: Number(signal.buildingDetails.yearbuilt || 0) || null,
        buildingClass: signal.propertyType,
        source: signal.cascadedSources.join(', '),
        category: classification.category,
        categoryNumber: classification.categoryNumber,
        subheadline: classification.subheadline,
        reason: classification.reason,
        opportunityAngle: classification.opportunityAngle,
        badgeBg: classification.badgeBg,
        badgeText: classification.badgeText,
        badgeBorder: classification.badgeBorder,
        signals: [
          `${classification.category}: ${classification.subheadline}`,
          signal.documentType.replace(/_/g, ' '),
          ...signal.cascadedSources.map((source) => `Public record: ${source}`),
          signal.ownerName ? `Recorded owner: ${signal.ownerName}` : null,
        ].filter((item): item is string => Boolean(item)),
      })
    }

    processedResults.sort((a, b) => b.score - a.score)

    return NextResponse.json({
      success: true,
      processedCount: processedResults.length,
      data: processedResults,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = error instanceof SupabaseConfigurationError ? 503 : 500
    console.error('Property enrichment failed:', message)
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
