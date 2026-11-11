/** Official NYC Open Data ingestion helpers. No records are fabricated here. */

export interface AcrisFiling {
  document_id: string
  borough: string
  block?: string
  lot?: string
  address: string
  document_type: string
  filing_date: Date
  amount?: number
  status: 'pending' | 'processed'
}

export interface DobViolation {
  violation_id: string
  address: string
  borough: string
  violation_code: string
  violation_description: string
  status: 'open' | 'closed' | 'pending'
  issuance_date: Date | null
  violation_class: string
}

export interface ScrapeResult {
  addresses: string[]
  newFilings: AcrisFiling[]
  newViolations: DobViolation[]
  duplicatesRemoved: number
  processingTimeMs: number
  source: string
  fetchedAt: string
}

export const SCRAPER_CONFIG = {
  acris: { datasetId: '8h5j-fqxa', baseUrl: 'https://data.cityofnewyork.us/resource', rateLimit: 100, maxRetries: 3 },
  dob: { datasetId: '3h2n-5cm9', baseUrl: 'https://data.cityofnewyork.us/resource', rateLimit: 50, maxRetries: 2 },
  pluto: { datasetId: '64uk-42ks', baseUrl: 'https://data.cityofnewyork.us/resource' },
}

const BOROUGHS: Record<string, string> = { '1': 'Manhattan', '2': 'Bronx', '3': 'Brooklyn', '4': 'Queens', '5': 'Staten Island' }

async function socrata<T>(datasetId: string, query: string): Promise<T[]> {
  const url = `https://data.cityofnewyork.us/resource/${datasetId}.json?${query}`
  const response = await fetch(url, { headers: { Accept: 'application/json' }, next: { revalidate: 900 } })
  if (!response.ok) throw new Error(`NYC Open Data ${datasetId} returned ${response.status}`)
  return response.json() as Promise<T[]>
}

export async function ingestAcrisFilings(
  boroughs: string[] = ['Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island'],
  limit = 100
): Promise<ScrapeResult> {
  const start = Date.now()
  const safeLimit = Math.min(Math.max(limit, 1), 500)
  const rows = await socrata<Record<string, string>>(SCRAPER_CONFIG.acris.datasetId,
    `$limit=${safeLimit}&$order=recorded_datetime DESC`)
  const filings: AcrisFiling[] = rows.map((row) => ({
    document_id: String(row.document_id || row.crfn || ''),
    borough: BOROUGHS[row.recorded_borough] || row.recorded_borough || 'Unknown',
    block: row.block,
    lot: row.lot,
    address: [row.street_number, row.street_name].filter(Boolean).join(' ') || `Block ${row.block || '—'}, Lot ${row.lot || '—'}`,
    document_type: row.doc_type || 'Unknown',
    filing_date: new Date(row.recorded_datetime || row.document_date || Date.now()),
    amount: row.document_amt ? Number(row.document_amt) : undefined,
    status: 'pending' as const,
  })).filter((row) => boroughs.includes(row.borough) || boroughs.length === 0)
  const addresses = [...new Set(filings.map((row) => row.address))]
  return { addresses, newFilings: filings, newViolations: [], duplicatesRemoved: 0, processingTimeMs: Date.now() - start, source: 'NYC Open Data — ACRIS Real Property Legals', fetchedAt: new Date().toISOString() }
}

export async function ingestDobViolations(limit = 50): Promise<ScrapeResult> {
  const start = Date.now()
  const safeLimit = Math.min(Math.max(limit, 1), 500)
  const rows = await socrata<Record<string, string>>(SCRAPER_CONFIG.dob.datasetId,
    `$limit=${safeLimit}&$order=issue_date DESC`)
  const violations: DobViolation[] = rows.map((row) => ({
    violation_id: String(row.isn_dob_bis_viol || row.violation_number || ''),
    address: [row.house_number, row.street].filter(Boolean).join(' ').trim(),
    borough: BOROUGHS[row.boro] || row.boro || 'Unknown',
    violation_code: row.violation_type_code || row.violation_category || 'Unknown',
    violation_description: row.description || row.violation_category || 'No description supplied',
    status: (row.violation_category?.toLowerCase().includes('closed') ? 'closed' : 'open') as 'closed' | 'open',
    issuance_date: row.issue_date ? new Date(`${row.issue_date.slice(0, 4)}-${row.issue_date.slice(4, 6)}-${row.issue_date.slice(6, 8)}`) : null,
    violation_class: row.violation_type || 'Unclassified',
  })).filter((row) => row.address)
  const addresses = [...new Set(violations.map((row) => row.address))]
  return { addresses, newFilings: [], newViolations: violations, duplicatesRemoved: 0, processingTimeMs: Date.now() - start, source: 'NYC Open Data — DOB Violations', fetchedAt: new Date().toISOString() }
}

export async function deduplicateLeads() {
  return {
    duplicatesRemoved: 0,
    processed: false,
    note: 'Deduplication requires persistent workspace lead records, which are not configured yet.',
  }
}
