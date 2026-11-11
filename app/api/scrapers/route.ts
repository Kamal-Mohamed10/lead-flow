import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { ingestAcrisFilings, ingestDobViolations, deduplicateLeads } from '@/lib/scrapers/nyc'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.response) return auth.response

    const body = await request.json()
    const { type, limit } = body

    let result

    switch (type) {
      case 'acris':
        result = await ingestAcrisFilings(undefined, limit || 100)
        break
      case 'dob':
        result = await ingestDobViolations(limit || 50)
        break
      case 'deduplicate':
        result = await deduplicateLeads()
        break
      default:
        return NextResponse.json(
          { error: 'Invalid scrape type' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Scraper error:', error)
    return NextResponse.json(
      { error: 'Scraper execution failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ status: 'scraper endpoint active' })
}