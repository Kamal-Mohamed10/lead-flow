import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
const boroughNames: Record<string, string> = { MN: 'Manhattan', BX: 'Bronx', BK: 'Brooklyn', QN: 'Queens', SI: 'Staten Island' }
interface PlutoRecord {
  bbl?: unknown
  borough?: unknown
  block?: unknown
  lot?: unknown
  address?: unknown
  zipcode?: unknown
  latitude?: unknown
  longitude?: unknown
  unitsres?: unknown
  unitstotal?: unknown
  yearbuilt?: unknown
  yearalter1?: unknown
  bldgclass?: unknown
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const borough = searchParams.get('borough') || 'all'
    const boroughCodes: Record<string, string> = { Manhattan: 'MN', Bronx: 'BX', Brooklyn: 'BK', Queens: 'QN', 'Staten Island': 'SI' }
    const requestedBorough = boroughCodes[borough]
    const boroughFilter = requestedBorough ? ` AND borough='${requestedBorough}'` : ''
    const addressQuery = searchParams.get('address')?.trim()
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 60)))
    const escapedAddress = addressQuery?.replace(/'/g, "''")
    const addressFilter = escapedAddress ? ` AND upper(address) like '%${escapedAddress.toUpperCase()}%'` : ''
    const response = await fetch(`https://data.cityofnewyork.us/resource/64uk-42ks.json?$limit=${limit}&$where=unitsres>0${boroughFilter}${addressFilter}&$order=yearbuilt ASC`, {
      headers: { Accept: 'application/json', ...(process.env.NYC_OPEN_DATA_APP_TOKEN ? { 'X-App-Token': process.env.NYC_OPEN_DATA_APP_TOKEN } : {}) }, cache: 'no-store'
    })
    if (!response.ok) throw new Error(`NYC Open Data returned ${response.status}`)
    const rows = (await response.json()) as PlutoRecord[]
    const currentYear = new Date().getFullYear()
    const opportunities = rows.filter((row) => row.address && row.latitude && row.longitude).map((row) => {
      const builtYear = Number(row.yearbuilt || 0)
      const age = builtYear > 1500 ? Math.max(0, currentYear - builtYear) : 0
      const units = Number(row.unitsres || row.unitstotal || 0)
      const alteredRecently = Number(row.yearalter1 || 0) >= currentYear - 10
      const score = Math.min(98, 45 + Math.min(25, Math.round(age / 2)) + (units <= 3 ? 12 : 5) + (alteredRecently ? 0 : 8))
      return {
        id: row.bbl || `${row.borough}-${row.block}-${row.lot}`, address: String(row.address).replace(/\s+/g, ' '), borough: boroughNames[String(row.borough)] || String(row.borough || ''),
        zip: row.zipcode, block: row.block, lot: row.lot, latitude: Number(row.latitude), longitude: Number(row.longitude), units, yearBuilt: builtYear > 1500 ? builtYear : null,
        buildingClass: row.bldgclass || null, score,
        signals: [age >= 60 ? `${age}-year-old property` : null, units <= 3 ? 'Low-density ownership' : null, !alteredRecently ? 'No recent major alteration recorded' : null].filter(Boolean),
      }
    }).sort((a, b) => b.score - a.score)
    return NextResponse.json({ source: 'NYC Department of City Planning — Primary Land Use Tax Lot Output (PLUTO)', datasetId: '64uk-42ks', fetchedAt: new Date().toISOString(), label: 'Public opportunity signals, not verified seller intent', count: opportunities.length, opportunities })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'NYC Open Data is temporarily unavailable', source: 'NYC Open Data' }, { status: 502 })
  }
}
