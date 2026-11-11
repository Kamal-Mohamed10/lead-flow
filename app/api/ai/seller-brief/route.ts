import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const apiKey = process.env.OPENAI_API_KEY
    const fallback = {
      summary: `${body.address} is a public-record opportunity with a score of ${body.score || 0}/100. ${body.signals?.length ? `Available signals include ${body.signals.join(', ').toLowerCase()}.` : 'No detailed opportunity signals were available.'} This summary is a research aid, not evidence of seller intent.`,
      nextAction: 'Verify the current owner and mailing address using the matched public records before choosing a compliant outreach sequence.',
      verificationGaps: ['Confirm whether the property owner shown in PLUTO remains current.', 'Separate historical ACRIS parties from the current owner.', 'Verify a compliant direct-contact method before outreach.'],
      researchNotes: body.ownerNames?.length ? `Research candidates include ${body.ownerNames.join(', ')}.` : 'No owner candidate was returned.',
      model: 'rules-based fallback',
    }

    if (!apiKey) return NextResponse.json(fallback)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You prepare factual real-estate research briefs for licensed agents. Never claim public records prove seller intent, ownership certainty, consent, or contactability. Separate facts from hypotheses. Return JSON with: summary, nextAction, verificationGaps (string array), researchNotes.' },
          { role: 'user', content: JSON.stringify({
            property: { address: body.address, borough: body.borough, zip: body.zip, units: body.units, yearBuilt: body.yearBuilt, score: body.score, signals: body.signals },
            ownership: body.ownerNames,
            contacts: body.contacts,
            taxRecords: body.taxRecords,
            entityCandidates: body.entityNames,
            assignedAgent: body.assignedTo,
          }) },
        ],
      }),
    })

    if (!response.ok) throw new Error(`OpenAI returned ${response.status}`)
    const result = await response.json()
    const content = result.choices?.[0]?.message?.content
    const parsed = JSON.parse(content)
    return NextResponse.json({ ...fallback, ...parsed, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'AI research summary could not be generated' }, { status: 502 })
  }
}
