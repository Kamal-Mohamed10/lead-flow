export interface PropertySignalInput {
  bbl: string
  address: string
  borough: string
  ownerName?: string | null
  buildingDetails?: Record<string, unknown>
  cascadedSources?: string[]
  documentType?: string
  rawDetails?: Record<string, unknown>
}

export interface EnrichedOpportunityResult {
  bbl: string
  summary: string
  opportunityScore: number
  recommendedAction: string
  timestamp: string
}

interface SchoolApiResponse {
  summary?: unknown
  score?: unknown
  opportunityScore?: unknown
  action?: unknown
  recommendedAction?: unknown
}

function localEnrichment(signal: PropertySignalInput): EnrichedOpportunityResult {
  const context = [
    signal.ownerName ? `Owner listed as ${signal.ownerName}` : null,
    signal.cascadedSources?.length
      ? `Records checked: ${signal.cascadedSources.join(', ')}`
      : null,
  ]
    .filter(Boolean)
    .join('. ')

  return {
    bbl: signal.bbl,
    summary: `Public-record activity at ${signal.address}${context ? `. ${context}` : ''}. Verify property details before outreach.`,
    opportunityScore: 78,
    recommendedAction: 'Review the cited public records and verify the owner and property details.',
    timestamp: new Date().toISOString(),
  }
}

function parseSchoolApiResponse(
  signal: PropertySignalInput,
  data: SchoolApiResponse
): EnrichedOpportunityResult | null {
  const summary =
    typeof data.summary === 'string' && data.summary.trim()
      ? data.summary
      : null
  const score = data.score ?? data.opportunityScore
  const action = data.action ?? data.recommendedAction
  if (
    !summary ||
    typeof score !== 'number' ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > 100 ||
    (action !== undefined && typeof action !== 'string')
  ) {
    return null
  }

  return {
    bbl: signal.bbl,
    summary,
    opportunityScore: score,
    recommendedAction: action || 'Review the cited public records and verify the property details.',
    timestamp: new Date().toISOString(),
  }
}

export async function enrichPropertyOpportunity(
  signal: PropertySignalInput
): Promise<EnrichedOpportunityResult> {
  const apiKey = process.env.SCHOOL_API_KEY
  const configuredBaseUrl = process.env.SCHOOL_API_BASE_URL
  if (!apiKey || !configuredBaseUrl) {
    console.warn(
      'SCHOOL_API_KEY and SCHOOL_API_BASE_URL must both be configured; using local enrichment.'
    )
    return localEnrichment(signal)
  }

  try {
    const response = await fetch(`${configuredBaseUrl.replace(/\/+$/, '')}/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-School-API-Key': apiKey,
      },
      body: JSON.stringify({
        bbl: signal.bbl,
        address: signal.address,
        ownerName: signal.ownerName || null,
        borough: signal.borough,
        buildingDetails: signal.buildingDetails || {},
        cascadedSources: signal.cascadedSources || [],
        recordType: signal.documentType || 'GENERAL_SIGNAL',
        rawDetails: signal.rawDetails || {},
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      console.warn(`School API returned HTTP ${response.status}; using local enrichment.`)
      return localEnrichment(signal)
    }

    const data: unknown = await response.json()
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      console.warn('School API returned an invalid response; using local enrichment.')
      return localEnrichment(signal)
    }

    const result = parseSchoolApiResponse(signal, data as SchoolApiResponse)
    if (!result) {
      console.warn('School API response fields were invalid; using local enrichment.')
      return localEnrichment(signal)
    }
    return result
  } catch (error) {
    console.warn(
      'School API request failed; using local enrichment:',
      error instanceof Error ? error.message : 'Unknown service error'
    )
    return localEnrichment(signal)
  }
}
