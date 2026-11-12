import { NextResponse } from 'next/server'
import { fetchLiveNYCSignals } from '@/lib/scrapers/nycRouter'
import { classifyOpportunity } from '@/lib/motivationClassifier'

export const dynamic = 'force-dynamic'

interface DiscoveryRequest {
  excludedBbls?: unknown
  limit?: unknown
  boroughs?: unknown
  prioritize?: unknown
}

export async function POST(request: Request) {
  try {
    const body: DiscoveryRequest = await request.json()
    const boroughs = Array.isArray(body.boroughs)
      ? body.boroughs.filter(
          (borough): borough is string =>
            typeof borough === 'string' &&
            ['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island'].includes(borough)
        )
      : []
    const excludedBbls = Array.isArray(body.excludedBbls)
      ? body.excludedBbls.filter(
          (bbl): bbl is string => typeof bbl === 'string' && /^[1-5]\d{9}$/.test(bbl)
        )
      : []
    const requestedLimit =
      typeof body.limit === 'number' && Number.isFinite(body.limit) ? body.limit : 10
    const safeLimit = Math.min(Math.max(Math.floor(requestedLimit), 1), 50)
    const prioritize = body.prioritize === true
    // Pool up to 1.4x candidates (capped at 30) when prioritizing so the queue receives top scores quickly
    const candidateLimit = prioritize ? Math.min(30, Math.max(safeLimit, Math.round(safeLimit * 1.4))) : safeLimit
    const signals = await fetchLiveNYCSignals(excludedBbls, candidateLimit, boroughs)
    const currentYear = new Date().getFullYear()
    const opportunities = signals.map((signal) => {
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

      return {
        id: signal.bbl,
        bbl: signal.bbl,
        address: signal.address,
        borough: signal.borough,
        zip: signal.zipCode || '',
        block: signal.block,
        lot: signal.lot,
        units,
        yearBuilt,
        buildingClass: signal.propertyType,
        score: classification.score,
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
        source: signal.cascadedSources.join(', '),
        ownerName: signal.ownerName,
        buildingDetails: signal.buildingDetails,
        occurredAt: signal.occurredAt,
      }
    })

    opportunities.sort((a, b) => b.score - a.score)
    const finalOpportunities = prioritize ? opportunities.slice(0, safeLimit) : opportunities

    return NextResponse.json({
      success: true,
      source: 'NYC Open Data',
      fetchedAt: new Date().toISOString(),
      count: finalOpportunities.length,
      message: finalOpportunities.length
        ? null
        : 'No unseen properties were found in this live sample. Refresh to search another batch.',
      opportunities: finalOpportunities,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown discovery error'
    console.error('NYC opportunity discovery failed:', message)
    return NextResponse.json(
      { success: false, error: 'Could not discover live NYC opportunities.' },
      { status: 502 }
    )
  }
}
