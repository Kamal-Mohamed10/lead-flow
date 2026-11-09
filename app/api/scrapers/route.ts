import { NextRequest, NextResponse } from 'next/server'
import { ingestAcrisFilings, ingestDobViolations, deduplicateLeads } from '@/lib/scrapers/nyc'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

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
        result = await deduplicateLeads(userId)
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