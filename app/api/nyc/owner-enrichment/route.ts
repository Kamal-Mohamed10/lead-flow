import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const boroughCodes: Record<string, string> = { Manhattan: '1', Bronx: '2', Brooklyn: '3', Queens: '4', 'Staten Island': '5' }
const socrataHeaders = { Accept: 'application/json', ...(process.env.NYC_OPEN_DATA_APP_TOKEN ? { 'X-App-Token': process.env.NYC_OPEN_DATA_APP_TOKEN } : {}) }

async function nycResource<T>(id: string, query: string): Promise<T[]> {
  const response = await fetch(`https://data.cityofnewyork.us/resource/${id}.json?${query}`, { headers: socrataHeaders, cache: 'no-store' })
  if (!response.ok) throw new Error(`${id} returned ${response.status}`)
  return response.json() as Promise<T[]>
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const borough = searchParams.get('borough') || ''
  const block = String(searchParams.get('block') || '').replace(/[^0-9]/g, '')
  const lot = String(searchParams.get('lot') || '').replace(/[^0-9]/g, '')
  const bbl = String(searchParams.get('bbl') || '').replace(/[^0-9]/g, '')
  const boroughCode = boroughCodes[borough]

  if ((!boroughCode || !block || !lot) && !bbl) {
    return NextResponse.json({ error: 'A borough, block and lot, or BBL are required.' }, { status: 400 })
  }

  try {
    let resolved = { boroughCode, block, lot }
    const normalizedBbl = String(searchParams.get('bbl') || '').split('.')[0].replace(/[^0-9]/g, '')
    if (normalizedBbl.length >= 10) {
      resolved = { boroughCode: normalizedBbl[0], block: String(Number(normalizedBbl.slice(1, 6))), lot: String(Number(normalizedBbl.slice(6))) }
    }

    const legals = await nycResource<Record<string, string>>('8h5j-fqxa',
      `$limit=20&$where=borough='${resolved.boroughCode}' AND block='${resolved.block}' AND lot='${resolved.lot}'&$order=good_through_date DESC`)
    const documentIds = [...new Set(legals.map((row) => row.document_id).filter(Boolean))].slice(0, 20)
    let parties: Record<string, string>[] = []
    if (documentIds.length) {
      const inDocuments = documentIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')
      parties = await nycResource<Record<string, string>>('636b-3b5g', `$limit=100&$where=document_id in(${inDocuments})&$order=good_through_date DESC`)
    }

    const contacts = parties.map((party) => {
      const address = [party.address_1, party.address_2].filter(Boolean).join(', ').trim()
      const location = [party.city, party.state, party.zip].filter(Boolean).join(', ').trim()
      const partyType = String(party.party_type || '')
      const role = partyType === '1' ? 'Grantor' : partyType === '2' ? 'Grantee' : 'Recorded party'
      return {
        name: party.name?.trim() || null,
        role,
        mailingAddress: [address, location].filter(Boolean).join(', ') || null,
        address1: party.address_1 || null,
        address2: party.address_2 || null,
        city: party.city || null,
        state: party.state || null,
        zip: party.zip || null,
        documentId: party.document_id,
        source: 'NYC ACRIS — Real Property Parties',
        verified: true,
        phone: null,
        email: null,
      }
    }).filter((contact) => contact.name || contact.mailingAddress)

    const pluto = await nycResource<Record<string, string>>('64uk-42ks',
      `$limit=1&$where=borough='${resolved.boroughCode === '1' ? 'MN' : resolved.boroughCode === '2' ? 'BX' : resolved.boroughCode === '3' ? 'BK' : resolved.boroughCode === '4' ? 'QN' : 'SI'}' AND block='${resolved.block}' AND lot='${resolved.lot}'`)
    const ownerName = pluto[0]?.ownername?.trim() || null
    const assessment = await nycResource<Record<string, string>>('yjxr-fw8i',
      `$limit=3&$where=boro='${resolved.boroughCode}' AND block='${resolved.block}' AND lot='${resolved.lot}'&$order=year DESC`)
    const taxRecords = assessment.map((row) => ({
      owner: row.owner?.trim() || null,
      propertyAddress: row.staddr?.trim() || null,
      taxYear: row.year || null,
      valuationPeriod: row.period || null,
      source: 'NYC DOF — Property Valuation and Assessment Data',
    })).filter((row) => row.owner || row.propertyAddress)

    const candidateNames = [ownerName, ...contacts.map((contact) => contact.name)].filter((name): name is string => Boolean(name))
    const entityRecords = [...new Set(candidateNames)]
      .filter((name) => /llc|inc|corp|l\.p|lp|partners|holdings|properties/i.test(name))
      .map((name) => ({
        name,
        searchUrl: `https://apps.dos.ny.gov/publicInquiry/#/search?name=${encodeURIComponent(name)}`,
        source: 'NYS Department of State — Public Inquiry',
        contactType: 'Registered entity lookup required',
      }))

    return NextResponse.json({
      property: { borough, block: resolved.block, lot: resolved.lot },
      ownerName: ownerName || null,
      contacts: [...new Map(contacts.map((contact) => [`${contact.name || ''}|${contact.mailingAddress || ''}`, contact])).values()].slice(0, 12),
      taxRecords,
      entityRecords,
      sources: {
        ownership: 'NYC ACRIS + PLUTO public records',
        taxAddress: 'ACRIS party addresses plus NYC DOF assessment owner and property-address records',
        entityLookup: 'NYS Department of State public inquiry',
      },
      warning: 'Names, addresses, and entity relationships are public-record leads, not guaranteed direct owner contact details. Verify before outreach.',
      fetchedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Owner enrichment sources are temporarily unavailable' }, { status: 502 })
  }
}
