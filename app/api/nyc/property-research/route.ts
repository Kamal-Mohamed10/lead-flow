import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SocrataRow {
  [key: string]: string | number | null | undefined
}

type FindingStatus = 'identified' | 'not-found' | 'estimate' | 'unavailable'

interface ResearchFinding {
  status: FindingStatus
  headline: string
  detail: string
  evidence: string[]
}

interface ResearchReport {
  bbl: string
  researchedAt: string
  financials?: {
    marketValue: number | null
    marketValueTaxYear: string | null
    recordedMortgage: number | null
    recordedMortgageDate: string | null
    taxLiensCount: number
    taxLiensEstimated: number
    estimatedEquity: number | null
    estimatedEquityPercent: number | null
  }
  findings: {
    equity: ResearchFinding
    financial: ResearchFinding
    condition: ResearchFinding
    occupancy: ResearchFinding
    marketVelocity: ResearchFinding
  }
  sources: string[]
  limitations: string[]
}

const resourceUrl = 'https://data.cityofnewyork.us/resource'
const socrataHeaders = {
  Accept: 'application/json',
  ...(process.env.NYC_OPEN_DATA_APP_TOKEN
    ? { 'X-App-Token': process.env.NYC_OPEN_DATA_APP_TOKEN }
    : {}),
}

const boroughNames: Record<string, string> = {
  '1': 'Manhattan',
  '2': 'Bronx',
  '3': 'Brooklyn',
  '4': 'Queens',
  '5': 'Staten Island',
}

function queryString(values: Record<string, string>) {
  return new URLSearchParams(values).toString()
}

async function fetchRows(datasetId: string, query: Record<string, string>) {
  const response = await fetch(`${resourceUrl}/${datasetId}.json?${queryString(query)}`, {
    headers: socrataHeaders,
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new Error(`${datasetId} returned HTTP ${response.status}`)
  const data: unknown = await response.json()
  if (!Array.isArray(data)) throw new Error(`${datasetId} returned invalid data`)
  return data.filter(
    (row): row is SocrataRow =>
      typeof row === 'object' && row !== null && !Array.isArray(row)
  )
}

function nonEmpty(row: SocrataRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim()
      if (text) return text
    }
  }
  return null
}

function dateLabel(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US')
}

function finding(
  status: FindingStatus,
  headline: string,
  detail: string,
  evidence: string[] = []
): ResearchFinding {
  return { status, headline, detail, evidence }
}

export async function POST(request: Request) {
  let bbl = ''
  try {
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null || !('bbl' in body)) {
      return NextResponse.json({ error: 'A valid 10-digit BBL is required.' }, { status: 400 })
    }
    bbl = String(body.bbl).replace(/\D/g, '')
    if (!/^[1-5]\d{9}$/.test(bbl)) {
      return NextResponse.json({ error: 'A valid 10-digit BBL is required.' }, { status: 400 })
    }

    const boroughCode = bbl[0]
    const block = String(Number(bbl.slice(1, 6)))
    const lot = String(Number(bbl.slice(6, 10)))
    const now = new Date()
    const recentCutoff = new Date(now)
    recentCutoff.setFullYear(now.getFullYear() - 3)
    const sources = new Set<string>()
    const limitations: string[] = []

    const [valuationResult, hpdResult, dobResult, lienResult, legalResult] = await Promise.all([
      fetchRows('8y4t-faws', {
        '$limit': '5',
        '$where': `boro='${boroughCode}' AND block='${block}' AND lot='${lot}'`,
        '$order': 'year DESC',
      }).then((rows) => ({ rows, error: null as string | null }))
        .catch((error: unknown) => ({ rows: [] as SocrataRow[], error: error instanceof Error ? error.message : 'DOF valuation request failed' })),
      fetchRows('wvxf-dwi5', {
        '$limit': '100',
        '$where': `bbl='${bbl}'`,
        '$order': 'inspectiondate DESC',
      }).then((rows) => ({ rows, error: null as string | null }))
        .catch((error: unknown) => ({ rows: [] as SocrataRow[], error: error instanceof Error ? error.message : 'HPD violations request failed' })),
      fetchRows('3h2n-5cm9', {
        '$limit': '100',
        '$where': `boro='${boroughCode}' AND block='${block.padStart(5, '0')}' AND lot='${lot.padStart(5, '0')}'`,
        '$order': 'issue_date DESC',
      }).then((rows) => ({ rows, error: null as string | null }))
        .catch((error: unknown) => ({ rows: [] as SocrataRow[], error: error instanceof Error ? error.message : 'DOB violations request failed' })),
      fetchRows('9rz4-mjek', {
        '$limit': '50',
        '$where': `borough='${boroughCode}' AND block='${block}' AND lot='${lot}'`,
        '$order': 'month DESC',
      }).then((rows) => ({ rows, error: null as string | null }))
        .catch((error: unknown) => ({ rows: [] as SocrataRow[], error: error instanceof Error ? error.message : 'Tax lien request failed' })),
      fetchRows('8h5j-fqxa', {
        '$limit': '1000',
        '$where': `borough='${boroughCode}' AND block='${block}' AND lot='${lot}'`,
        '$order': 'good_through_date DESC',
      }).then((rows) => ({ rows, error: null as string | null }))
        .catch((error: unknown) => ({ rows: [] as SocrataRow[], error: error instanceof Error ? error.message : 'ACRIS request failed' })),
    ])

    if (valuationResult.error) limitations.push(`DOF valuation data unavailable: ${valuationResult.error}`)
    else sources.add('NYC DOF Annual Property Valuations')
    if (hpdResult.error) limitations.push(`HPD violation data unavailable: ${hpdResult.error}`)
    else sources.add('NYC HPD Housing Violations')
    if (dobResult.error) limitations.push(`DOB violation data unavailable: ${dobResult.error}`)
    else sources.add('NYC DOB Violations')
    if (lienResult.error) limitations.push(`Tax-lien data unavailable: ${lienResult.error}`)
    else sources.add('NYC DOF Tax Lien Sale Lists')
    if (legalResult.error) limitations.push(`ACRIS transfer data unavailable: ${legalResult.error}`)
    else sources.add('NYC ACRIS Real Property Legals and Master')

    const documentIds = [
      ...new Set(
        legalResult.rows
          .map((row) => nonEmpty(row, 'document_id'))
          .filter((id): id is string => Boolean(id))
      ),
    ].slice(0, 100)

    let acrisDocuments: SocrataRow[] = []
    let parties: SocrataRow[] = []
    let acrisError: string | null = null
    if (documentIds.length) {
      try {
        const documentFilter = documentIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')
        acrisDocuments = await fetchRows('bnx9-e6tj', {
          '$limit': '100',
          '$where': `document_id in(${documentFilter})`,
          '$order': 'document_date DESC',
        })
        const partyRows = await fetchRows('636b-3b5g', {
          '$limit': '200',
          '$where': `document_id in(${documentFilter})`,
          '$order': 'good_through_date DESC',
        })
        parties = partyRows
        sources.add('NYC ACRIS Real Property Parties')
      } catch (error) {
        acrisError = error instanceof Error ? error.message : 'ACRIS records could not be joined'
        limitations.push(`ACRIS document/party details incomplete: ${acrisError}`)
      }
    }

    const datedTransfers = acrisDocuments
      .map((document) => ({
        type: nonEmpty(document, 'doc_type') || 'Unspecified ACRIS document',
        date: nonEmpty(document, 'document_date', 'recorded_datetime'),
        amount: Number(nonEmpty(document, 'document_amt') || 0),
        id: nonEmpty(document, 'document_id') || '',
      }))
      .filter((document) => document.date)
      .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
    const ownerTransfer = datedTransfers.find((document) =>
      /DEED|DEED|RPTT|CONV/i.test(document.type)
    )
    const ownerDate = ownerTransfer?.date ? new Date(ownerTransfer.date) : null
    const ownershipYears = ownerDate
      ? Math.max(0, (now.getTime() - ownerDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    const valuation = valuationResult.rows[0]
    const fullValue = Number(nonEmpty(valuation || {}, 'pymkttot', 'tenmkttot', 'curmkttot'))
    const mortgageDocuments = datedTransfers.filter((document) =>
      /MTGE|MORTGAGE/i.test(document.type) && !/SAT|MOD|CEMA/i.test(document.type)
    )
    const recordedMortgageAmount = mortgageDocuments[0]?.amount || null
    const equityEvidence: string[] = []
    if (ownerTransfer?.date) {
      equityEvidence.push(
        `Most recent deed-like ACRIS filing found: ${dateLabel(ownerTransfer.date)} (${ownerTransfer.type}).`
      )
    }
    if (Number.isFinite(fullValue) && fullValue > 0) {
      equityEvidence.push(
        `NYC DOF tentative market-value estimate: $${Math.round(fullValue).toLocaleString()}${nonEmpty(valuation || {}, 'year') ? ` (tax roll ${nonEmpty(valuation || {}, 'year')})` : ''}; not a current appraisal.`
      )
    }
    if (recordedMortgageAmount) {
      equityEvidence.push(
        `Most recent matched mortgage-like document amount: $${Math.round(recordedMortgageAmount).toLocaleString()}; this is original recorded principal, not the current loan balance.`
      )
    }
    const equity = ownershipYears === null
      ? finding('unavailable', 'Ownership tenure not established', 'No deed-like ACRIS record with a usable document date was found in the records reviewed.', equityEvidence)
      : finding(
          'estimate',
          ownershipYears >= 7 ? `${ownershipYears.toFixed(1)} years since latest deed-like filing` : `${ownershipYears.toFixed(1)} years since latest deed-like filing`,
          ownershipYears >= 7
            ? 'The ACRIS record suggests the property may meet the 7+ year ownership signal. This is not a title opinion.'
            : 'The latest deed-like filing found is less than seven years old.',
          equityEvidence
        )
    if (equity.status === 'estimate' && (!Number.isFinite(fullValue) || fullValue <= 0 || !recordedMortgageAmount)) {
      equity.detail += ' The available records do not support a reliable equity-percentage estimate.'
    } else if (equity.status === 'estimate') {
          equity.detail += ' The 40% equity threshold is not confirmed: a DOF tax-roll estimate is not an appraisal, and recorded mortgage amounts do not establish current payoff or all liens.'
    }

    const lienRows = lienResult.rows.filter((row) => {
      const month = nonEmpty(row, 'month')
      return month && new Date(month) >= recentCutoff
    })
    const financialEvidence: string[] = []
    if (lienRows.length) {
      financialEvidence.push(
        `${lienRows.length} matching tax-lien sale-list record(s) in the past three years; latest ${dateLabel(nonEmpty(lienRows[0], 'month'))}.`
      )
      lienRows.slice(0, 5).forEach((row) => {
        financialEvidence.push(
          `DOF sale-list entry: ${dateLabel(nonEmpty(row, 'month')) || 'date not listed'}, ${nonEmpty(row, 'cycle') || 'cycle not listed'}${nonEmpty(row, 'water_debt_only') === 'Y' ? ', water-debt-only flag' : ''}.`
        )
      })
    } else if (!lienResult.error) {
      financialEvidence.push('No matching entry found in the sampled NYC tax-lien sale-list records from the past three years.')
    }
    const documentSignals = datedTransfers.filter((document) =>
      /MOD|LIS.?PENDENS|PENDENS|FORECLOSURE/i.test(document.type)
    )
    for (const signal of documentSignals.slice(0, 5)) {
      financialEvidence.push(`${signal.type} recorded ${dateLabel(signal.date)} (ACRIS document ${signal.id}).`)
    }
    if (mortgageDocuments.length) {
      financialEvidence.push(`${mortgageDocuments.length} mortgage origination record(s) were found; an ordinary mortgage filing alone is not treated as a distress signal.`)
    }
    const financial = lienResult.error && (legalResult.error || Boolean(acrisError))
      ? finding('unavailable', 'Financial distress records unavailable', 'Tax-lien and ACRIS records could not be retrieved.')
      : lienRows.length > 0 || documentSignals.length > 0
        ? finding('identified', 'Potential financial public-record signal', 'These records indicate a filing or list entry, not current debt, delinquency status, or owner intent.', financialEvidence)
        : acrisError
          ? finding('unavailable', 'ACRIS financial-record classification incomplete', 'Tax-lien records were checked, but ACRIS document and party details could not be fully joined.')
          : finding('not-found', 'No matching signal identified in records reviewed', 'No recent tax-lien-list entry or confidently classified mortgage modification/lis pendens was identified. ACRIS abbreviated document codes may limit classification.', financialEvidence)

    const openHpd = hpdResult.rows.filter((row) =>
      /open|not corrected|pending/i.test(nonEmpty(row, 'violationstatus', 'currentstatus') || '')
    )
    const activeDob = dobResult.rows.filter((row) => {
      const issueDate = nonEmpty(row, 'issue_date')
      const disposition = nonEmpty(row, 'disposition_date')
      const comments = nonEmpty(row, 'disposition_comments') || ''
      const date = issueDate && /^\d{8}$/.test(issueDate)
        ? new Date(`${issueDate.slice(0, 4)}-${issueDate.slice(4, 6)}-${issueDate.slice(6, 8)}`)
        : issueDate
          ? new Date(issueDate)
          : null
      return Boolean(
        date &&
        !Number.isNaN(date.getTime()) &&
        date >= recentCutoff &&
        !disposition &&
        !/dismissed|closed|paid/i.test(comments)
      )
    })
    const conditionEvidence = [
      `${openHpd.length} HPD record(s) with an open-like status.`,
      `${activeDob.length} DOB record(s) filed in the past three years without a recorded disposition in the response.`,
    ]
    openHpd.slice(0, 5).forEach((row) => {
      conditionEvidence.push(
        `HPD ${nonEmpty(row, 'violationid') || 'violation'}: ${nonEmpty(row, 'currentstatus', 'violationstatus') || 'open-like status'}; ${nonEmpty(row, 'novdescription') || 'description not listed'}${dateLabel(nonEmpty(row, 'inspectiondate')) ? `; inspected ${dateLabel(nonEmpty(row, 'inspectiondate'))}` : ''}.`
      )
    })
    activeDob.slice(0, 5).forEach((row) => {
      conditionEvidence.push(
        `DOB ${nonEmpty(row, 'violation_number', 'isn_dob_bis_viol') || 'violation'}: ${nonEmpty(row, 'violation_type') || nonEmpty(row, 'violation_category') || 'type not listed'}; disposition not recorded in response.`
      )
    })
    const condition = hpdResult.error && dobResult.error
      ? finding('unavailable', 'Violation data unavailable', 'HPD and DOB violation sources could not be queried.')
      : openHpd.length + activeDob.length >= 2
        ? finding('identified', 'Multiple unresolved-appearing violation records', 'HPD status and DOB disposition records should be verified with the city before treating them as current violations or fines.', conditionEvidence)
        : finding('not-found', 'Multiple unresolved violations not established', 'The records reviewed did not establish multiple open or unresolved violations. DOB disposition fields may be incomplete.', conditionEvidence)

    const ownerAddressCandidates = parties
      .filter((party) => ['2', 'grantee', 'owner'].includes((nonEmpty(party, 'party_type') || '').toLowerCase()))
      .map((party) => ({
        name: nonEmpty(party, 'name'),
        address: [nonEmpty(party, 'address_1'), nonEmpty(party, 'address_2'), nonEmpty(party, 'city'), nonEmpty(party, 'state'), nonEmpty(party, 'zip')]
          .filter(Boolean)
          .join(', '),
      }))
      .filter((party) => party.address)
    const propertyAddress = [
      [nonEmpty(valuation || {}, 'housenum_lo', 'housenum_hi'), nonEmpty(valuation || {}, 'street_name')].filter(Boolean).join(' '),
      nonEmpty(valuation || {}, 'zip_code'),
      boroughNames[boroughCode],
      'NY',
    ].filter(Boolean).join(', ')
    const comparableMailingAddress = ownerAddressCandidates.find((candidate) => {
      const normalize = (address: string) => address.toUpperCase().replace(/[^A-Z0-9]/g, '')
      return normalize(candidate.address) !== normalize(propertyAddress)
    })
    const occupancy = comparableMailingAddress
      ? finding('estimate', 'Possible absentee-owner indicator', `A recorded grantee mailing address differs from the property situs address. Candidate: ${comparableMailingAddress.address}. Mailing addresses can be stale or represent an agent/entity.`, [])
      : finding('unavailable', 'Occupancy not determined', 'The records reviewed do not reliably establish who occupies the property or a current owner mailing address.')
    const estateDocuments = datedTransfers.filter((document) =>
      /ESTATE|EXECUTOR|ADMINISTRATOR|PROBATE|DEATH/i.test(document.type)
    )
    if (estateDocuments.length) {
      occupancy.evidence.push(
        ...estateDocuments.slice(0, 3).map((document) => `Potential estate-related ACRIS filing: ${document.type} on ${dateLabel(document.date)}.`)
      )
      occupancy.detail += ' An estate-related document code was found; verify the instrument and transfer parties.'
    } else if (!legalResult.error) {
      occupancy.evidence.push('No clearly labeled estate/probate document was identified in the ACRIS records reviewed; this does not rule out probate.')
    }

    const marketVelocity = finding(
      'unavailable',
      'Days on market unavailable from these public records',
      'The NYC public sources reviewed do not provide reliable listing start dates or days-on-market for a 0.5-mile radius. A licensed MLS/listings data feed is required to verify the sub-30-day DOM signal.',
      ['Recent deed filings are not listing histories and cannot establish days on market.']
    )
    limitations.push('Current mortgage balances, actual occupancy, estate status, and MLS days-on-market cannot be confirmed from the queried public datasets.')
    limitations.push('The NYC DOB and HPD sources do not reliably expose a current municipal fine balance for every violation.')

    const estimatedEquity = Number.isFinite(fullValue) && fullValue > 0
      ? Math.max(0, fullValue - (recordedMortgageAmount || 0) - (lienRows.length * 15000))
      : null

    const estimatedEquityPercent = Number.isFinite(fullValue) && fullValue > 0 && estimatedEquity !== null
      ? Math.round((estimatedEquity / fullValue) * 100)
      : null

    const financials = {
      marketValue: Number.isFinite(fullValue) && fullValue > 0 ? fullValue : null,
      marketValueTaxYear: nonEmpty(valuation || {}, 'year') || null,
      recordedMortgage: recordedMortgageAmount,
      recordedMortgageDate: mortgageDocuments[0]?.date ? dateLabel(mortgageDocuments[0].date) : null,
      taxLiensCount: lienRows.length,
      taxLiensEstimated: lienRows.length * 15000,
      estimatedEquity,
      estimatedEquityPercent,
    }

    const report: ResearchReport = {
      bbl,
      researchedAt: now.toISOString(),
      financials,
      findings: { equity, financial, condition, occupancy, marketVelocity },
      sources: [...sources],
      limitations,
    }
    return NextResponse.json(report)
  } catch (error) {
    console.error(`Property research failed for ${bbl || 'unresolved BBL'}:`, error)
    return NextResponse.json(
      { error: 'Could not complete property research. Please retry shortly.' },
      { status: 502 }
    )
  }
}
