import { getSupabaseAdminClient } from '@/lib/auth'

const SOCRATA_RESOURCE_URL = 'https://data.cityofnewyork.us/resource'
const SOURCE_TIMEOUT_MS = 12_000
const MAX_SOURCE_LIMIT = 100
const ASSIGNMENT_PAGE_SIZE = 500

interface SocrataRow {
  [key: string]: unknown
}

interface DatasetSource {
  name: string
  datasetId: string
  discoveryDatasetId?: string
  discoverySourceName?: string
  discoverable: boolean
  orderField: string
  filter?: string
}

export interface NYCPropertySignal {
  bbl: string
  address: string
  borough: string
  block: string
  lot: string
  zipCode: string | null
  propertyType: string | null
  ownerName: string | null
  buildingDetails: Record<string, unknown>
  documentType: string
  sourceRecordId: string | null
  occurredAt: string
  cascadedSources: string[]
  rawDetails: Record<string, unknown>
}

export const NYC_DATA_SOURCES: DatasetSource[] = [
  {
    name: 'ACRIS Real Property Master',
    datasetId: 'bnx9-e6tj',
    discoveryDatasetId: '8h5j-fqxa',
    discoverySourceName: 'ACRIS Real Property Legals',
    discoverable: true,
    orderField: ':id',
  },
  {
    name: 'ACRIS Parties',
    datasetId: '636b-3b5g',
    discoverable: false,
    orderField: ':id',
  },
  {
    name: 'HPD Registration Contacts',
    datasetId: 'feu5-w2e2',
    discoverable: false,
    orderField: ':id',
  },
  {
    name: 'HPD Housing Violations',
    datasetId: 'wvxf-dwi5',
    discoverable: true,
    orderField: ':id',
  },
  {
    name: 'DOB Violations',
    datasetId: '3h2n-5cm9',
    discoverable: true,
    orderField: ':id',
  },
  {
    name: 'DOF Tax Lien Sale Lists',
    datasetId: '9rz4-mjek',
    discoverable: true,
    orderField: ':id',
  },
  {
    name: 'DOB Job Application Filings',
    datasetId: 'ic3t-wcy2',
    discoverable: true,
    orderField: ':id',
  },
  {
    name: 'MapPLUTO Land Use',
    datasetId: '64uk-42ks',
    discoverable: true,
    orderField: ':id',
  },
  {
    name: 'DOF Annual Property Valuations',
    datasetId: '8y4t-faws',
    discoverable: true,
    orderField: ':id',
  },
  {
    name: 'Loft Board Building Index',
    datasetId: 'ic3t-wcy2',
    discoverable: true,
    orderField: ':id',
    filter: 'loft_board IS NOT NULL',
  },
]

const ACRIS_MASTER_ID = 'bnx9-e6tj'
const ACRIS_LEGALS_ID = '8h5j-fqxa'
const ACRIS_PARTIES_ID = '636b-3b5g'
const HPD_CONTACTS_ID = 'feu5-w2e2'
const HPD_VIOLATIONS_ID = 'wvxf-dwi5'
const MAPPLUTO_ID = '64uk-42ks'

const BOROUGH_CODES: Record<string, string> = {
  '1': 'Manhattan',
  '2': 'Bronx',
  '3': 'Brooklyn',
  '4': 'Queens',
  '5': 'Staten Island',
  MN: 'Manhattan',
  MANHATTAN: 'Manhattan',
  NEWYORK: 'Manhattan',
  BX: 'Bronx',
  BRONX: 'Bronx',
  BK: 'Brooklyn',
  KINGS: 'Brooklyn',
  BROOKLYN: 'Brooklyn',
  QN: 'Queens',
  QUEENS: 'Queens',
  SI: 'Staten Island',
  RICHMOND: 'Staten Island',
  STATENISLAND: 'Staten Island',
}

function value(row: SocrataRow, ...keys: string[]): string | null {
  for (const key of keys) {
    const raw = row[key]
    if (typeof raw === 'string' || typeof raw === 'number') {
      const text = String(raw).trim()
      if (text) return text
    }
  }
  return null
}

function boroughIdentifier(raw: string | null): string | null {
  if (!raw) return null
  const key = raw.toUpperCase().replace(/[\s_-]/g, '')
  if (/^[1-5]$/.test(key)) return key
  const borough = BOROUGH_CODES[key]
  return borough
    ? Object.entries(BOROUGH_CODES).find(
        ([alias, name]) => name === borough && /^[1-5]$/.test(alias)
      )?.[0] || null
    : null
}

function boroughFromCode(code: string): string {
  return BOROUGH_CODES[code] || 'Unknown'
}

function normalizeBbl(row: SocrataRow): string | null {
  const direct = value(row, 'bbl', 'BBL')
  if (direct) {
    const digits = direct.replace(/\D/g, '')
    const normalized =
      digits.length === 9 ? `${digits.slice(0, 6)}${digits.slice(6).padStart(4, '0')}` : digits
    if (/^[1-5]\d{9}$/.test(normalized)) return normalized
  }

  const code = boroughIdentifier(value(row, 'borocode', 'boro', 'borough', 'recorded_borough', 'boro_id', 'boroid'))
  const blockRaw = value(row, 'block', 'BLOCK')
  const lotRaw = value(row, 'lot', 'LOT')
  if (!code || !blockRaw || !lotRaw) return null

  const block = blockRaw.replace(/\D/g, '')
  const lot = lotRaw.replace(/\D/g, '')
  if (!block || !lot || block.length > 5 || lot.length > 4) return null
  return `${code}${block.padStart(5, '0')}${lot.padStart(4, '0')}`
}

function soqlLiteral(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function randomOffset(): number {
  return Math.floor(Math.random() * 10_000)
}

async function fetchSocrataRows(
  datasetId: string,
  options: { limit: number; offset?: number; where?: string; orderField?: string }
): Promise<SocrataRow[]> {
  const query = new URLSearchParams({
    '$limit': String(Math.min(Math.max(Math.floor(options.limit), 1), MAX_SOURCE_LIMIT)),
    '$offset': String(options.offset || 0),
    '$order': `${options.orderField || ':id'} DESC`,
  })
  if (options.where) query.set('$where', options.where)

  const headers: HeadersInit = { Accept: 'application/json' }
  if (process.env.NYC_OPEN_DATA_APP_TOKEN) {
    headers['X-App-Token'] = process.env.NYC_OPEN_DATA_APP_TOKEN
  }

  const response = await fetch(`${SOCRATA_RESOURCE_URL}/${datasetId}.json?${query}`, {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`NYC Open Data ${datasetId} returned HTTP ${response.status}.`)
  }

  const data: unknown = await response.json()
  if (!Array.isArray(data)) {
    throw new Error(`NYC Open Data ${datasetId} returned a non-array response.`)
  }
  return data.filter(
    (row): row is SocrataRow => typeof row === 'object' && row !== null && !Array.isArray(row)
  )
}

async function fetchOptionalRows(
  sourceName: string,
  datasetId: string,
  where: string,
  limit = 10
): Promise<SocrataRow[]> {
  try {
    return await fetchSocrataRows(datasetId, { limit, where, orderField: ':id' })
  } catch (error) {
    console.warn(
      `NYC data cascade skipped ${sourceName}:`,
      error instanceof Error ? error.message : 'Unknown source error'
    )
    return []
  }
}

async function getAssignedBbls(organizationId: string): Promise<Set<string>> {
  const admin = getSupabaseAdminClient()
  const assignedBbls = new Set<string>()
  let offset = 0

  while (true) {
    const { data: assignments, error: assignmentError } = await admin
      .from('opportunity_assignments')
      .select('opportunity_id')
      .eq('organization_id', organizationId)
      .range(offset, offset + ASSIGNMENT_PAGE_SIZE - 1)

    if (assignmentError) {
      throw new Error(`Could not load assigned opportunities: ${assignmentError.message}`)
    }

    const opportunityIds = (assignments || [])
      .map((assignment) => assignment.opportunity_id)
      .filter((id): id is string => typeof id === 'string')

    if (opportunityIds.length) {
      const { data: opportunities, error: opportunityError } = await admin
        .from('opportunities')
        .select('property_id')
        .in('id', opportunityIds)

      if (opportunityError) {
        throw new Error(`Could not load assigned property IDs: ${opportunityError.message}`)
      }

      const propertyIds = (opportunities || [])
        .map((opportunity) => opportunity.property_id)
        .filter((id): id is string => typeof id === 'string')

      if (propertyIds.length) {
        const { data: properties, error: propertyError } = await admin
          .from('properties')
          .select('bbl')
          .in('id', propertyIds)

        if (propertyError) {
          throw new Error(`Could not load assigned BBLs: ${propertyError.message}`)
        }

        for (const property of properties || []) {
          if (typeof property.bbl === 'string') assignedBbls.add(property.bbl)
        }
      }
    }

    if (!assignments || assignments.length < ASSIGNMENT_PAGE_SIZE) break
    offset += ASSIGNMENT_PAGE_SIZE
  }

  return assignedBbls
}

function ownerFromRow(row: SocrataRow): string | null {
  const direct = value(
    row,
    'ownername',
    'owner_name',
    'owner',
    'owner_s_business_name',
    'corporationname',
    'name'
  )
  if (direct) return direct
  const first = value(row, 'owner_s_first_name', 'firstname', 'first_name')
  const last = value(row, 'owner_s_last_name', 'lastname', 'last_name')
  return [first, last].filter(Boolean).join(' ') || null
}

function addressFromRow(row: SocrataRow): string | null {
  const address = value(row, 'address', 'property_address')
  if (address) return address
  const number = value(
    row,
    'street_number',
    'house_number',
    'house__',
    'housenumber',
    'house_no',
    'housenum_lo',
    'owner_s_house__'
  )
  const street = value(
    row,
    'street_name',
    'street',
    'streetname',
    'owner_s_house_street_name',
    'street_name'
  )
  return [number, street].filter(Boolean).join(' ') || null
}

function buildingDetailsFromRow(row: SocrataRow): Record<string, unknown> {
  const keys = [
    'bldgclass',
    'building_class',
    'property_type',
    'landuse',
    'lotarea',
    'bldgarea',
    'numfloors',
    'unitsres',
    'unitstotal',
    'yearbuilt',
    'yearalter1',
    'builtfar',
    'residfar',
    'commfar',
    'zonedist1',
    'zoning',
    'tax_class',
    'pytaxclass',
    'curtaxclass',
    'ownername',
    'owner_name',
  ]
  return Object.fromEntries(
    keys
      .filter((key) => row[key] !== undefined && row[key] !== null && row[key] !== '')
      .map((key) => [key, row[key]])
  )
}

function dateFromRow(row: SocrataRow): string {
  const raw = value(
    row,
    'recorded_datetime',
    'filing_date',
    'issue_date',
    'issued_date',
    'inspectiondate',
    'created_at',
    ':updated_at'
  )
  if (raw) {
    const date = new Date(raw)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  return new Date().toISOString()
}

function sourceRecordId(row: SocrataRow): string | null {
  return value(
    row,
    'document_id',
    'crfn',
    'violationid',
    'isn_dob_bis_viol',
    'registrationcontactid',
    'job_s1_no',
    'job_filing_number',
    'parid',
    ':id'
  )
}

function appendSource(sources: string[], source: string) {
  if (!sources.includes(source)) sources.push(source)
}

function hasBuildingDetails(details: Record<string, unknown>): boolean {
  return Object.keys(details).some((key) => key !== 'ownername' && key !== 'owner_name')
}

async function cascadeDetails(
  initialSource: DatasetSource,
  initialRow: SocrataRow,
  bbl: string
): Promise<NYCPropertySignal> {
  const sources: string[] = [initialSource.discoverySourceName || initialSource.name]
  const supplements: Record<string, SocrataRow[]> = {}
  let ownerName = ownerFromRow(initialRow)
  let address = addressFromRow(initialRow)
  let borough = boroughIdentifier(value(initialRow, 'borocode', 'boro', 'borough', 'recorded_borough', 'boro_id', 'boroid'))
  let zipCode = value(initialRow, 'zipcode', 'zip', 'zip_code', 'owner_s_zip_code')
  let propertyType = value(initialRow, 'property_type', 'bldgclass', 'building_class', 'building_type')
  let buildingDetails = buildingDetailsFromRow(initialRow)
  let documentId = value(initialRow, 'document_id', 'crfn')

  if (initialSource.name === 'ACRIS Real Property Master') {
    const legalRows = [initialRow]
    if (documentId) {
      const masterRows = await fetchOptionalRows(
        'ACRIS Real Property Master',
        ACRIS_MASTER_ID,
        `document_id='${soqlLiteral(documentId)}'`,
        3
      )
      if (masterRows.length) {
        supplements['ACRIS Real Property Master'] = masterRows
        appendSource(sources, 'ACRIS Real Property Master')
        documentId = documentId || value(masterRows[0], 'document_id')
      }
    }
    const legalRow = legalRows.find((row) => normalizeBbl(row) === bbl) || initialRow
    borough = borough || boroughIdentifier(value(legalRow, 'borough', 'recorded_borough'))
    address = address || addressFromRow(legalRow)
  }

  const hpdRows = await fetchOptionalRows(
    'HPD Housing Violations',
    HPD_VIOLATIONS_ID,
    `bbl='${bbl}'`,
    10
  )
  if (hpdRows.length) {
    supplements['HPD Housing Violations'] = hpdRows
    appendSource(sources, 'HPD Housing Violations')
    if (!ownerName) {
      const registrationIds = [
        ...new Set(
          hpdRows
            .map((row) => value(row, 'registrationid'))
            .filter((id): id is string => Boolean(id))
        ),
      ].slice(0, 3)
      for (const registrationId of registrationIds) {
        const contacts = await fetchOptionalRows(
          'HPD Registration Contacts',
          HPD_CONTACTS_ID,
          `registrationid='${soqlLiteral(registrationId)}'`,
          10
        )
        if (contacts.length) {
          supplements['HPD Registration Contacts'] = contacts
          appendSource(sources, 'HPD Registration Contacts')
          ownerName = contacts.map(ownerFromRow).find(Boolean) || null
          if (ownerName) break
        }
      }
    }
    if (!address) address = addressFromRow(hpdRows[0])
    if (!zipCode) zipCode = value(hpdRows[0], 'zip')
  }

  if (!ownerName) {
    const acrisDocuments = documentId
      ? [{ document_id: documentId }]
      : await fetchOptionalRows(
          'ACRIS Real Property Legals',
          ACRIS_LEGALS_ID,
          `borough='${boroughFromCode(bbl[0]).toUpperCase()}' AND block='${String(Number(bbl.slice(1, 6)))}' AND lot='${String(Number(bbl.slice(6, 10)))}'`,
          5
        )

    if (acrisDocuments.length) {
      supplements['ACRIS Real Property Legals'] = acrisDocuments
      appendSource(sources, 'ACRIS Real Property Legals')
      const documentIds = [
        ...new Set(
          acrisDocuments
            .map((row) => value(row, 'document_id'))
            .filter((id): id is string => Boolean(id))
        ),
      ].slice(0, 3)

      for (const id of documentIds) {
        const parties = await fetchOptionalRows(
          'ACRIS Parties',
          ACRIS_PARTIES_ID,
          `document_id='${soqlLiteral(id)}'`,
          20
        )
        if (!parties.length) continue
        supplements['ACRIS Parties'] = [
          ...(supplements['ACRIS Parties'] || []),
          ...parties,
        ]
        appendSource(sources, 'ACRIS Parties')
        const preferred = parties.find((party) =>
          (value(party, 'party_type') || '').toLowerCase().includes('grantee')
        )
        ownerName =
          ownerFromRow(preferred || parties[0]) ||
          parties.map(ownerFromRow).find(Boolean) ||
          null
        if (ownerName) break
      }
      documentId = documentId || value(acrisDocuments[0], 'document_id')
    }
  }

  if (!address || !hasBuildingDetails(buildingDetails)) {
    const plutoRows = await fetchOptionalRows(
      'MapPLUTO Land Use',
      MAPPLUTO_ID,
      `bbl='${bbl}'`,
      2
    )
    const pluto = plutoRows[0]
    if (pluto) {
      supplements['MapPLUTO Land Use'] = plutoRows
      appendSource(sources, 'MapPLUTO Land Use')
      address = address || addressFromRow(pluto)
      borough = borough || boroughIdentifier(value(pluto, 'borocode', 'borough'))
      zipCode = zipCode || value(pluto, 'zipcode')
      propertyType = propertyType || value(pluto, 'bldgclass', 'landuse')
      ownerName = ownerName || ownerFromRow(pluto)
      buildingDetails = { ...buildingDetailsFromRow(pluto), ...buildingDetails }
    }
  }

  if (!documentId && hpdRows.length) {
    documentId = value(hpdRows[0], 'violationid', 'ordernumber')
  }

  const boroughName = boroughFromCode(bbl[0])
  const normalizedAddress =
    address || `Block ${String(Number(bbl.slice(1, 6)))} Lot ${String(Number(bbl.slice(6, 10)))}`
  const documentType =
    value(initialRow, 'doc_type', 'violation_type_code', 'violation_category', 'class', 'work_type', 'loft_board') ||
    initialSource.name.toUpperCase().replace(/\s+/g, '_')
  const recordId = sourceRecordId(initialRow)

  const rawDetails: Record<string, unknown> = {
    initialSource: initialSource.name,
    initialRecord: initialRow,
    cascadedRecords: supplements,
    sourceRecordId: recordId,
    documentId,
  }

  return {
    bbl,
    address: normalizedAddress,
    borough: borough ? boroughFromCode(borough) : boroughName,
    block: bbl.slice(1, 6),
    lot: bbl.slice(6, 10),
    zipCode,
    propertyType,
    ownerName,
    buildingDetails,
    documentType,
    sourceRecordId: recordId || documentId,
    occurredAt: dateFromRow(initialRow),
    cascadedSources: sources,
    rawDetails,
  }
}

function shuffledSources(sources: DatasetSource[]): DatasetSource[] {
  const result = [...sources]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}

async function discoverSignals(
  excludedBbls: Iterable<string>,
  limit: number,
  focusBoroughs: string[] = []
): Promise<NYCPropertySignal[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50)
  const seenBbls = new Set(excludedBbls)
  const candidatesBySource: Array<{
    source: DatasetSource
    candidates: Array<{ row: SocrataRow; bbl: string }>
  }> = []
  let successfulSources = 0
  const sources = shuffledSources(NYC_DATA_SOURCES.filter((source) => source.discoverable))

  const rowsBySource = await Promise.all(
    sources.map(async (source) => {
      try {
        const rows = await fetchSocrataRows(source.discoveryDatasetId || source.datasetId, {
          // ACRIS property-master rows are joined to the parcel-legals index for discovery.
          // The master itself has no BBL columns.
          limit: Math.min(Math.max(safeLimit, focusBoroughs.length ? 50 : 10), MAX_SOURCE_LIMIT),
          offset: randomOffset(),
          where: source.filter,
          orderField: source.orderField,
        })
        successfulSources += 1
        return { source, rows }
      } catch (error) {
        console.warn(
          `NYC discovery skipped ${source.name} (${source.datasetId}):`,
          error instanceof Error ? error.message : 'Unknown source error'
        )
        return { source, rows: [] }
      }
    })
  )

  for (const { source, rows } of rowsBySource) {
    const sourceCandidates: Array<{ row: SocrataRow; bbl: string }> = []
    for (const row of rows) {
      const bbl = normalizeBbl(row)
      if (!bbl || seenBbls.has(bbl)) continue
      if (focusBoroughs.length && !focusBoroughs.includes(boroughFromCode(bbl[0]))) continue
      seenBbls.add(bbl)
      sourceCandidates.push({ row, bbl })
    }
    if (sourceCandidates.length) candidatesBySource.push({ source, candidates: sourceCandidates })
  }

  if (successfulSources === 0) {
    throw new Error('All NYC Open Data sources failed; no opportunities could be discovered.')
  }

  const selected: Array<{ source: DatasetSource; row: SocrataRow; bbl: string }> = []
  const remaining = [...candidatesBySource]
  while (selected.length < safeLimit && remaining.length) {
    const index = Math.floor(Math.random() * remaining.length)
    const [group] = remaining.splice(index, 1)
    const candidate = group.candidates.shift()
    if (candidate) selected.push({ source: group.source, ...candidate })
    if (group.candidates.length) remaining.push(group)
  }

  return Promise.all(
    selected.map(({ source, row, bbl }) => cascadeDetails(source, row, bbl))
  )
}

export async function fetchLiveNYCSignals(
  excludedBbls: Iterable<string> = [],
  limit = 10,
  focusBoroughs: string[] = []
): Promise<NYCPropertySignal[]> {
  return discoverSignals(excludedBbls, limit, focusBoroughs)
}

export async function fetchUnseenNYCSignals(
  orgId: string,
  limit = 10,
  focusBoroughs: string[] = []
): Promise<NYCPropertySignal[]> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orgId)) {
    throw new Error('A valid organization ID is required for NYC opportunity discovery.')
  }

  const assignedBbls = await getAssignedBbls(orgId)
  return discoverSignals(assignedBbls, limit, focusBoroughs)
}
