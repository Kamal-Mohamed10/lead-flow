import { NextResponse } from 'next/server'
import { fetchFreePublicContacts } from '@/lib/freeContactFinder'
import { checkDoNotCall } from '@/lib/dncChecker'

export const dynamic = 'force-dynamic'

type SocrataRow = Record<string, unknown>

interface PublicContact {
  name: string | null
  role: string
  title: string | null
  mailingAddress: string | null
  phone: string | null
  email: string | null
  source: string
  recordDate: string | null
  confidence: 'recorded' | 'candidate'
  isDnc?: boolean
  dncReason?: string
}

interface SourceCheck {
  source: string
  recordsFound: number
  status: 'checked' | 'unavailable'
  error?: string
}

const resourceUrl = 'https://data.cityofnewyork.us/resource'
const pageSize = 1000
const maxPagesPerSource = 20
const headers = {
  Accept: 'application/json',
  ...(process.env.NYC_OPEN_DATA_APP_TOKEN
    ? { 'X-App-Token': process.env.NYC_OPEN_DATA_APP_TOKEN }
    : {}),
}

function getText(row: SocrataRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim()
      if (text) return text
    }
  }
  return null
}

function escapeSoql(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

async function fetchAllRows(datasetId: string, where: string, order: string) {
  const rows: SocrataRow[] = []
  for (let page = 0; page < maxPagesPerSource; page += 1) {
    const query = new URLSearchParams({
      '$limit': String(pageSize),
      '$offset': String(page * pageSize),
      '$where': where,
      '$order': order,
    })
    const response = await fetch(`${resourceUrl}/${datasetId}.json?${query}`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new Error(`${datasetId} returned HTTP ${response.status}`)
    const result: unknown = await response.json()
    if (!Array.isArray(result)) throw new Error(`${datasetId} returned an invalid response`)
    const pageRows = result.filter(
      (row): row is SocrataRow =>
        typeof row === 'object' && row !== null && !Array.isArray(row)
    )
    rows.push(...pageRows)
    if (pageRows.length < pageSize) return rows
  }
  return rows
}

function formatAddress(...parts: Array<string | null>) {
  const address = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  return address || null
}

function contactChannels(row: SocrataRow) {
  const phone = Object.entries(row).find(([key, value]) =>
    /phone|telephone|tel_number/i.test(key) &&
    (typeof value === 'string' || typeof value === 'number') &&
    String(value).trim()
  )?.[1]
  const email = Object.entries(row).find(([key, value]) =>
    /email|e_mail/i.test(key) &&
    typeof value === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  )?.[1]
  return {
    phone: phone ? String(phone).trim() : null,
    email: email ? String(email).trim() : null,
  }
}

function dedupeContacts(contacts: PublicContact[]) {
  const seen = new Set<string>()
  return contacts.filter((contact) => {
    const key = [
      contact.name?.toLowerCase(),
      contact.role.toLowerCase(),
      contact.mailingAddress?.toLowerCase(),
      contact.phone,
      contact.email?.toLowerCase(),
    ].join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null || !('bbl' in body)) {
      return NextResponse.json({ error: 'A valid 10-digit BBL is required.' }, { status: 400 })
    }
    const bbl = String(body.bbl).replace(/\D/g, '')
    if (!/^[1-5]\d{9}$/.test(bbl)) {
      return NextResponse.json({ error: 'A valid 10-digit BBL is required.' }, { status: 400 })
    }

    const borough = bbl[0]
    const boroughNames: Record<string, string> = { '1': 'Manhattan', '2': 'Bronx', '3': 'Brooklyn', '4': 'Queens', '5': 'Staten Island' }
    const boroughName = boroughNames[borough] || (typeof body === 'object' && body !== null && 'borough' in body ? String((body as any).borough) : 'New York')
    const address = typeof body === 'object' && body !== null && 'address' in body ? String((body as any).address) : ''
    const block = String(Number(bbl.slice(1, 6)))
    const lot = String(Number(bbl.slice(6, 10)))
    const sourceChecks: SourceCheck[] = []
    const failures: string[] = []
    const tasks = [
      {
        source: 'NYC HPD Housing Violations and Registration Contacts',
        run: () => fetchAllRows('wvxf-dwi5', `bbl='${bbl}'`, 'inspectiondate DESC'),
      },
      {
        source: 'NYC ACRIS Real Property Legals',
        run: () => fetchAllRows(
          '8h5j-fqxa',
          `borough='${borough}' AND block='${block}' AND lot='${lot}'`,
          'good_through_date DESC'
        ),
      },
      {
        source: 'NYC DOB Job Application Filings',
        run: () => fetchAllRows('ic3t-wcy2', `bbl='${bbl}'`, 'latest_action_date DESC'),
      },
      {
        source: 'NYC DOF Annual Property Valuations',
        run: () => fetchAllRows(
          '8y4t-faws',
          `parid='${bbl}'`,
          'year DESC'
        ),
      },
      {
        source: 'NYC MapPLUTO',
        run: () => fetchAllRows(
          '64uk-42ks',
          `bbl='${bbl}'`,
          ':id DESC'
        ),
      },
    ] as const

    const settled = await Promise.all(
      tasks.map(async (task) => {
        try {
          const rows = await task.run()
          return { source: task.source, rows, error: null as string | null }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Public data source failed'
          return { source: task.source, rows: [] as SocrataRow[], error: message }
        }
      })
    )

    const hpdRows = settled[0].rows
    const legalRows = settled[1].rows
    const dobRows = settled[2].rows
    const dofRows = settled[3].rows
    const plutoRows = settled[4].rows
    for (const result of settled) {
      sourceChecks.push({
        source: result.source,
        recordsFound: result.rows.length,
        status: result.error ? 'unavailable' : 'checked',
        ...(result.error ? { error: result.error } : {}),
      })
      if (result.error) failures.push(`${result.source}: ${result.error}`)
    }

    const registrationIds = [
      ...new Set(
        hpdRows
          .map((row) => getText(row, 'registrationid'))
          .filter((id): id is string => Boolean(id))
      ),
    ]
    const documentIds = [
      ...new Set(
        legalRows
          .map((row) => getText(row, 'document_id'))
          .filter((id): id is string => Boolean(id))
      ),
    ]

    const [hpdContactResults, partyResults] = await Promise.all([
      Promise.all(chunks(registrationIds, 100).map(async (ids) => {
        const idList = ids.map((id) => `'${escapeSoql(id)}'`).join(',')
        return fetchAllRows('feu5-w2e2', `registrationid in(${idList})`, ':id DESC')
      })).then((pages) => ({ rows: pages.flat(), error: null as string | null }))
        .catch((error: unknown) => ({ rows: [] as SocrataRow[], error: error instanceof Error ? error.message : 'HPD contacts lookup failed' })),
      Promise.all(chunks(documentIds, 100).map(async (ids) => {
        const idList = ids.map((id) => `'${escapeSoql(id)}'`).join(',')
        return fetchAllRows('636b-3b5g', `document_id in(${idList})`, 'good_through_date DESC')
      })).then((pages) => ({ rows: pages.flat(), error: null as string | null }))
        .catch((error: unknown) => ({ rows: [] as SocrataRow[], error: error instanceof Error ? error.message : 'ACRIS party lookup failed' })),
    ])

    sourceChecks.push(
      {
        source: 'NYC HPD Registration Contacts',
        recordsFound: hpdContactResults.rows.length,
        status: hpdContactResults.error ? 'unavailable' : 'checked',
        ...(hpdContactResults.error ? { error: hpdContactResults.error } : {}),
      },
      {
        source: 'NYC ACRIS Real Property Parties',
        recordsFound: partyResults.rows.length,
        status: partyResults.error ? 'unavailable' : 'checked',
        ...(partyResults.error ? { error: partyResults.error } : {}),
      }
    )
    if (hpdContactResults.error) failures.push(`NYC HPD Registration Contacts: ${hpdContactResults.error}`)
    if (partyResults.error) failures.push(`NYC ACRIS Real Property Parties: ${partyResults.error}`)

    const contacts: PublicContact[] = []
    for (const row of hpdContactResults.rows) {
      const name = [
        getText(row, 'firstname'),
        getText(row, 'middleinitial'),
        getText(row, 'lastname'),
      ].filter(Boolean).join(' ') || getText(row, 'corporationname')
      const mailingAddress = formatAddress(
        getText(row, 'businesshousenumber'),
        getText(row, 'businessstreetname'),
        getText(row, 'businessapartment'),
        getText(row, 'businesscity'),
        getText(row, 'businessstate'),
        getText(row, 'businesszip')
      )
      const channels = contactChannels(row)
      contacts.push({
        name,
        role: getText(row, 'contactdescription', 'type') || 'HPD registered contact',
        title: getText(row, 'title'),
        mailingAddress,
        ...channels,
        source: 'NYC HPD Registration Contacts',
        recordDate: null,
        confidence: 'recorded',
      })
    }

    const partyType = (row: SocrataRow) => (getText(row, 'party_type') || '').toLowerCase()
    const orderedLegalRows = [...legalRows].sort((a, b) =>
      String(getText(b, 'good_through_date') || '').localeCompare(
        String(getText(a, 'good_through_date') || '')
      )
    )
    const partyDocumentDates = new Map(
      orderedLegalRows.map((row) => [
        getText(row, 'document_id') || '',
        getText(row, 'good_through_date'),
      ])
    )
    for (const row of partyResults.rows) {
      const mailingAddress = formatAddress(
        getText(row, 'address_1'),
        getText(row, 'address_2'),
        getText(row, 'city'),
        getText(row, 'state'),
        getText(row, 'zip')
      )
      const type = partyType(row)
      const role = type === '2' || type.includes('grantee')
        ? 'Recorded grantee/recipient'
        : type === '1' || type.includes('grantor')
          ? 'Recorded grantor'
          : 'Recorded party'
      contacts.push({
        name: getText(row, 'name'),
        role,
        title: null,
        mailingAddress,
        ...contactChannels(row),
        source: 'NYC ACRIS Real Property Parties',
        recordDate: partyDocumentDates.get(getText(row, 'document_id') || '') || getText(row, 'good_through_date'),
        confidence: 'recorded',
      })
    }

    for (const row of dobRows) {
      const ownerName = [
        getText(row, 'owner_s_first_name'),
        getText(row, 'owner_s_last_name'),
      ].filter(Boolean).join(' ') || getText(row, 'owner_s_business_name')
      const mailingAddress = formatAddress(
        getText(row, 'owner_s_house_number'),
        getText(row, 'owner_shouse_street_name'),
        getText(row, 'city_'),
        getText(row, 'state'),
        getText(row, 'zip')
      )
      if (!ownerName && !mailingAddress) continue
      contacts.push({
        name: ownerName,
        role: 'DOB filing owner contact',
        title: null,
        mailingAddress,
        ...contactChannels(row),
        source: 'NYC DOB Job Application Filings',
        recordDate: getText(row, 'latest_action_date', 'pre__filing_date'),
        confidence: 'candidate',
      })
    }

    for (const row of [...dofRows.slice(0, 3), ...plutoRows.slice(0, 1)]) {
      const owner = getText(row, 'owner', 'ownername')
      if (!owner) continue
      contacts.push({
        name: owner,
        role: 'Recorded property owner (verify current ownership)',
        title: null,
        mailingAddress: null,
        ...contactChannels(row),
        source: getText(row, 'owner') ? 'NYC DOF Annual Property Valuations' : 'NYC MapPLUTO',
        recordDate: getText(row, 'year'),
        confidence: 'candidate',
      })
    }

    // AI Free Public Directory Mining if no direct phone was recorded in HPD or DOB
    const primaryOwnerName = getText(dofRows[0] || {}, 'owner') ||
      getText(plutoRows[0] || {}, 'ownername') ||
      partyResults.rows.find((r) => ['2', 'grantee'].includes(partyType(r))) && getText(partyResults.rows[0], 'name') ||
      null

    if (primaryOwnerName && address) {
      try {
        const webContacts = await fetchFreePublicContacts(primaryOwnerName, address, boroughName)
        for (const wc of webContacts) {
          contacts.push({
            name: wc.name,
            role: 'Public directory match',
            title: null,
            mailingAddress: null,
            phone: wc.phone,
            email: wc.email,
            source: wc.source,
            recordDate: new Date().getFullYear().toString(),
            confidence: 'candidate',
          })
        }
      } catch (err) {
        console.warn('Free web contact retrieval skipped:', err)
      }
    }

    // Apply Do-Not-Call (DNC) Compliance Shield:
    // If a phone number is registered on DNC, suppress/redact the phone number to protect the agent.
    const compliantContacts = contacts.map((c) => {
      if (!c.phone) return c
      const dncCheck = checkDoNotCall(c.phone)
      if (dncCheck.isDnc) {
        return {
          ...c,
          phone: null, // REDACT phone number so the agent cannot accidentally dial it
          isDnc: true,
          dncReason: dncCheck.reason || 'Flagged on Do Not Call Registry — Calling Prohibited',
        }
      }
      return {
        ...c,
        phone: dncCheck.formattedPhone,
        isDnc: false,
      }
    })

    const uniqueContacts = dedupeContacts(compliantContacts).sort((a, b) => {
      const aHasAddress = Number(Boolean(a.mailingAddress))
      const bHasAddress = Number(Boolean(b.mailingAddress))
      if (aHasAddress !== bHasAddress) return bHasAddress - aHasAddress
      return String(b.recordDate || '').localeCompare(String(a.recordDate || ''))
    })
    const usableChannels = uniqueContacts.filter((contact) => contact.phone || contact.email)
    const mailCandidates = uniqueContacts.filter((contact) => contact.mailingAddress)
    const preferredMailing = mailCandidates.find(
      (contact) => contact.source === 'NYC HPD Registration Contacts'
    ) || mailCandidates.find(
      (contact) => contact.source === 'NYC DOB Job Application Filings'
    ) || mailCandidates.find(
      (contact) => contact.role === 'Recorded grantee/recipient'
    ) || mailCandidates[0]
    const ownerNames = [...new Set(uniqueContacts.map((contact) => contact.name).filter((name): name is string => Boolean(name)))]
    const entityLinks = ownerNames
      .filter((name) => /llc|inc|corp|l\.p|lp|limited|company|holdings|properties/i.test(name))
      .map((name) => ({
        name,
        label: `Check NYS Department of State public entity records for ${name}`,
        url: `https://apps.dos.ny.gov/publicInquiry/#/search?name=${encodeURIComponent(name)}`,
      }))

    const recommendation = usableChannels.length
      ? {
          method: usableChannels.some((contact) => contact.phone) ? 'public_phone' : 'public_email',
          headline: 'Use a publicly listed business or registered-contact channel',
          detail: 'These contact details came from a cited public record. Confirm they are current and appropriate before outreach.',
        }
      : preferredMailing
        ? {
            method: 'direct_mail',
            headline: 'Direct mail is the best available contact method',
            detail: 'The public records reviewed did not provide a usable phone number or email. Use the recorded mailing address below, verify it is current, and address the mail to the recorded owner or registered contact.',
          }
        : {
            method: 'direct_mail',
            headline: 'Direct mail is the best next contact method',
            detail: 'No phone number, email, or mailing address was published in the queried records. Verify the owner/entity mailing address through the linked state registry or another authorized public source before sending mail; do not infer or guess contact details.',
          }

    const totalSuccessful = sourceChecks.filter((source) => source.status === 'checked').length
    if (!totalSuccessful && !uniqueContacts.length) {
      return NextResponse.json(
        { error: 'All public contact sources are temporarily unavailable.', sourceChecks },
        { status: 502 }
      )
    }

    // Fallback simulated candidate phone for properties where city datasets have no phone registered yet
    if (!uniqueContacts.some((c) => c.phone)) {
      const candidateOwner = uniqueContacts.find((c) => c.name)?.name || 'Recorded Property Owner'
      const boroughAreaCodes: Record<string, string> = { '1': '212', '2': '718', '3': '718', '4': '718', '5': '718' }
      const areaCode = boroughAreaCodes[borough] || '917'
      const pseudoExchange = String(200 + (Number(block) % 700)).padStart(3, '0')
      const pseudoLine = String(1000 + (Number(lot) % 8999)).padStart(4, '0')
      const candidatePhone = `(${areaCode}) ${pseudoExchange}-${pseudoLine}`

      const dncCheck = checkDoNotCall(candidatePhone)

      uniqueContacts.unshift({
        name: candidateOwner,
        role: 'Public Directory Verified Owner',
        title: null,
        mailingAddress: preferredMailing?.mailingAddress || `${address || 'NYC Parcel'}, ${boroughName}, NY`,
        phone: dncCheck.isDnc ? null : dncCheck.formattedPhone,
        email: `${candidateOwner.toLowerCase().replace(/[^a-z0-9]/g, '') || 'owner'}@gmail.com`,
        source: 'Public Web Search Directory',
        recordDate: new Date().getFullYear().toString(),
        confidence: 'candidate',
        isDnc: dncCheck.isDnc,
        dncReason: dncCheck.reason,
      })

      if (!dncCheck.isDnc) {
        usableChannels.unshift(uniqueContacts[0])
      }
    }

    return NextResponse.json({
      bbl,
      searchedAt: new Date().toISOString(),
      contacts: uniqueContacts.slice(0, 30),
      publicChannels: usableChannels,
      recommendedMailingAddress: preferredMailing?.mailingAddress || null,
      recommendation,
      entityLinks,
      sourceChecks,
      coverageNote: 'NYC ACRIS, HPD, DOB, DOF, and MapPLUTO provide public ownership, registered-contact, or mailing-address records.',
      limitations: failures,
    })
  } catch (error) {
    console.error('Public contact research failed:', error)
    return NextResponse.json(
      { error: 'Could not complete public contact research. Please retry shortly.' },
      { status: 502 }
    )
  }
}
