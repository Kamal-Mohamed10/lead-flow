import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  propertyId: z.string().trim().max(120).optional().default(''),
  address: z.string().trim().min(2).max(200),
  borough: z.string().trim().max(80).optional().default('New York'),
  zip: z.string().trim().max(20).optional().nullable(),
  units: z.number().finite().optional().nullable(),
  yearBuilt: z.number().finite().optional().nullable(),
  buildingClass: z.string().trim().max(120).optional().nullable(),
  score: z.number().finite().optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  reason: z.string().trim().max(600).optional().nullable(),
  opportunityAngle: z.string().trim().max(600).optional().nullable(),
  signals: z.array(z.string().trim().max(240)).max(12).optional().default([]),
  ownerName: z.string().trim().max(180).optional().nullable(),
  phone: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().max(140).optional().nullable(),
  mailingAddress: z.string().trim().max(260).optional().nullable(),
  contactSummary: z.string().trim().max(400).optional().nullable(),
  isDnc: z.boolean().optional().default(false),
  financials: z
    .object({
      marketValue: z.number().finite().optional().nullable(),
      recordedMortgage: z.number().finite().optional().nullable(),
      taxLiensCount: z.number().finite().optional().nullable(),
      taxLiensEstimated: z.number().finite().optional().nullable(),
      estimatedEquity: z.number().finite().optional().nullable(),
      estimatedEquityPercent: z.number().finite().optional().nullable(),
    })
    .optional()
    .nullable(),
})

type AgentNotePayload = z.infer<typeof requestSchema>

function formatFullAddress(input: AgentNotePayload): string {
  const parts = [input.address]
  if (input.borough && !input.address.toLowerCase().includes(input.borough.toLowerCase())) {
    parts.push(input.borough)
  }
  const suffix = input.zip ? `NY ${input.zip}` : 'NYC'
  return `${parts.join(', ')}, ${suffix}`
}

function formatContactInfo(input: AgentNotePayload): string {
  if (input.contactSummary && input.contactSummary.trim()) {
    return input.contactSummary.trim()
  }
  const bits: string[] = []
  if (input.isDnc) {
    bits.push('Phone withheld (DNC flagged)')
  } else if (input.phone) {
    bits.push(`Phone: ${input.phone}`)
  }
  if (input.email) {
    bits.push(`Email: ${input.email}`)
  }
  if (input.mailingAddress) {
    bits.push(`Mailing: ${input.mailingAddress}`)
  }
  if (bits.length === 0) {
    return 'Owner identified in public deed registry; direct phone/email pending secondary lookup.'
  }
  return bits.join(' · ')
}

function buildFallbackBrief(input: AgentNotePayload) {
  const unitLabel =
    typeof input.units === 'number' && input.units > 0
      ? `${input.units}-unit`
      : 'residential (1–3 family)'
  const yearLabel =
    typeof input.yearBuilt === 'number' && input.yearBuilt > 1500
      ? `built in ${input.yearBuilt}`
      : 'established NYC housing stock'
  const classLabel = input.buildingClass ? ` (${input.buildingClass})` : ''

  const mv = input.financials?.marketValue
  const eq = input.financials?.estimatedEquity
  const eqPct = input.financials?.estimatedEquityPercent
  const equityPhrase =
    mv && eq !== null && eq !== undefined
      ? ` NYC DOF valuation sits near $${mv.toLocaleString()} with an estimated ~$${eq.toLocaleString()}${
          eqPct !== null && eqPct !== undefined ? ` (${eqPct}%)` : ''
        } net equity cushion after recorded encumbrances.`
      : ' Assessed valuation vs. recorded encumbrances indicates viable equity spread for an off-market close.'

  const propertyDescription = `${input.address} in ${input.borough} is a ${unitLabel}${classLabel} parcel ${yearLabel}.${equityPhrase}`

  const catLabel = input.category || 'Off-market opportunity'
  const reasonText =
    input.reason ||
    (input.signals.length ? input.signals[0] : 'Multiple NYC municipal distress signals recorded.')
  const lienNote =
    input.financials?.taxLiensCount && input.financials.taxLiensCount > 0
      ? ` Active filing reflects ${input.financials.taxLiensCount} municipal lien notice(s) totaling ~$${(
          input.financials.taxLiensEstimated || 0
        ).toLocaleString()}.`
      : ''

  const motivatingFactor = `${catLabel} (Score ${input.score ?? 85}/100): ${reasonText}${lienNote}${
    input.opportunityAngle ? ` Key angle: ${input.opportunityAngle}` : ''
  }`

  return {
    address: formatFullAddress(input),
    ownerName: input.ownerName?.trim() || 'Recorded Deed Holder (Verify Entity)',
    contactInfo: formatContactInfo(input),
    propertyDescription,
    motivatingFactor,
    model: 'LeadFlow Research Synthesizer',
  }
}

export async function POST(request: Request) {
  let rawBody: unknown
  try {
    const rawText = await request.text()
    if (rawText.length > 24_000) {
      return NextResponse.json({ error: 'Request payload is too large.' }, { status: 413 })
    }
    rawBody = JSON.parse(rawText)
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please supply valid property details to compile an Agent Note.' },
      { status: 400 }
    )
  }

  const input = parsed.data
  const fallback = buildFallbackBrief(input)
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json(fallback)
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.25,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You compile concise, accurate off-market real estate research log entries for licensed agents and wholesalers. Using ONLY the facts provided, return JSON with two concise string fields: propertyDescription (2 clear sentences summarizing property specs, units, year built, valuation, and equity/debt profile) and motivatingFactor (1-2 clear sentences explaining the legal/financial trigger, urgency, and why the owner is likely to consider an off-market sale). Do not invent facts, prices, or contact numbers. Never output outreach scripts.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              address: fallback.address,
              ownerName: fallback.ownerName,
              units: input.units,
              yearBuilt: input.yearBuilt,
              buildingClass: input.buildingClass,
              score: input.score,
              category: input.category,
              reason: input.reason,
              opportunityAngle: input.opportunityAngle,
              signals: input.signals,
              financials: input.financials,
            }),
          },
        ],
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      throw new Error(`OpenAI returned HTTP ${response.status}`)
    }

    const data: unknown = await response.json()
    const aiSchema = z
      .object({
        choices: z
          .array(
            z.object({
              message: z.object({ content: z.string().nullable() }),
            })
          )
          .min(1),
      })
      .parse(data)

    const content = aiSchema.choices[0].message.content
    if (!content) throw new Error('Empty response from OpenAI')

    const noteContent = z
      .object({
        propertyDescription: z.string().min(10).max(800),
        motivatingFactor: z.string().min(10).max(800),
      })
      .parse(JSON.parse(content))

    return NextResponse.json({
      ...fallback,
      propertyDescription: noteContent.propertyDescription,
      motivatingFactor: noteContent.motivatingFactor,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    })
  } catch (error) {
    console.error(
      'AI agent notes synthesis fallback used:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(fallback)
  }
}
