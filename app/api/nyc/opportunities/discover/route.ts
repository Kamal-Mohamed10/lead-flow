import { NextResponse } from 'next/server'
import { fetchLiveNYCSignals } from '@/lib/scrapers/nycRouter'
import { classifyOpportunity } from '@/lib/motivationClassifier'

export const dynamic = 'force-dynamic'

interface DiscoveryRequest {
  excludedBbls?: unknown
  limit?: unknown
  boroughs?: unknown
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
    const signals = await fetchLiveNYCSignals(excludedBbls, requestedLimit, boroughs)
    const opportunities = signals.map((signal) => {
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
      })

      return {
        id: signal.bbl,
        bbl: signal.bbl,
        address: signal.address,
        borough: signal.borough,
        zip: signal.zipCode || '',
        block: signal.block,
        lot: signal.lot,
        units: Number(signal.buildingDetails.unitsres || signal.buildingDetails.unitstotal || 0),
        yearBuilt: Number(signal.buildingDetails.yearbuilt || 0) || null,
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

    return NextResponse.json({
      success: true,
      source: 'NYC Open Data',
      fetchedAt: new Date().toISOString(),
      count: opportunities.length,
      message: opportunities.length
        ? null
        : 'No unseen properties were found in this live sample. Refresh to search another batch.',
      opportunities,
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
