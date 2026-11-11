import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth, SupabaseConfigurationError } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  address: z.string().trim().min(3).max(200),
  borough: z.string().trim().min(1).max(80),
  agentName: z.string().trim().min(1).max(120),
  channel: z.enum(['Direct mail', 'Email', 'Phone']),
  hasPublicMailingAddress: z.boolean(),
  signals: z.array(z.string().trim().min(1).max(240)).max(8).default([]),
})

type OutreachDraft = {
  subject: string
  message: string
  rationale: string
  nextStep: string
}

function createFallbackDraft(input: z.infer<typeof requestSchema>): OutreachDraft {
  const signature = input.agentName
  const property = `${input.address}, ${input.borough}`

  if (input.channel === 'Email') {
    return {
      subject: `A question about ${input.address}`,
      message: `Hello,\n\nI’m ${signature}, a real estate professional working in ${input.borough}. I’m reaching out with a no-pressure offer to share a current market perspective on ${input.address}, if that would be useful to you. There’s no obligation, and I’m happy not to follow up if this isn’t relevant.\n\nBest,\n${signature}`,
      rationale: 'A brief, respectful email draft using only the property location and agent-provided identity.',
      nextStep: 'Verify the email address, applicable consent, and communication rules before sending.',
    }
  }

  if (input.channel === 'Phone') {
    return {
      subject: '',
      message: `Hello, I’m ${signature}, a real estate professional working in ${input.borough}. I’m calling about ${property}. Would you be open to a brief conversation about the property? There’s no obligation. Is this a good time?`,
      rationale: 'A short, low-pressure call opening. This is a script only; no call was placed.',
      nextStep: 'Verify the number, required consent, do-not-call restrictions, and calling rules before dialing.',
    }
  }

  return {
    subject: `A note about ${input.address}`,
    message: `Hello,\n\nI’m ${signature}, a real estate professional working in ${input.borough}. I’m writing with a no-pressure offer to share a current market perspective on ${input.address}, if that would be useful to you. There’s no obligation. If this isn’t relevant, please feel free to disregard this note.\n\nBest,\n${signature}`,
    rationale: input.hasPublicMailingAddress
      ? 'Direct mail is the selected channel based on the public-record contact research available.'
      : 'No usable public phone or email was found; direct mail is a fallback only after a current mailing address is verified.',
    nextStep: input.hasPublicMailingAddress
      ? 'Verify the recorded mailing address is current and review the message before mailing.'
      : 'Find and verify a current mailing address before sending anything.',
  }
}

function parseDraft(content: string): OutreachDraft {
  const parsed: unknown = JSON.parse(content)
  const result = z.object({
    subject: z.string().max(200).default(''),
    message: z.string().min(20).max(3000),
    rationale: z.string().min(1).max(500),
    nextStep: z.string().min(1).max(500),
  }).safeParse(parsed)
  if (!result.success) throw new Error('AI returned an invalid outreach draft.')
  return result.data
}

export async function POST(request: Request) {
  let rawBody: unknown
  try {
    const body = await request.text()
    if (body.length > 12_000) {
      return NextResponse.json({ error: 'Request is too large.' }, { status: 413 })
    }
    rawBody = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const validated = requestSchema.safeParse(rawBody)
  if (!validated.success) {
    return NextResponse.json({ error: 'Provide a valid property, agent name, and outreach channel.' }, { status: 400 })
  }

  const input = validated.data
  let isAuthenticated = false
  try {
    const auth = await requireAuth()
    isAuthenticated = !auth.response
  } catch (error) {
    if (!(error instanceof SupabaseConfigurationError)) throw error
  }

  if (!isAuthenticated) {
    return NextResponse.json({
      ...createFallbackDraft(input),
      provider: 'template-fallback',
      model: 'rules-based fallback',
      requiresAgentReview: true,
      warning: 'Sign in to generate a model-written draft. This template is for preview only.',
    })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      ...createFallbackDraft(input),
      provider: 'template-fallback',
      model: 'rules-based fallback',
      requiresAgentReview: true,
      warning: 'Configure OPENAI_API_KEY to generate a model-written draft. This template is for preview only.',
    })
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
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Write a concise, respectful first-touch real-estate outreach draft for an agent. Never imply seller intent, financial distress, or a verified owner identity. Never mention sensitive or unverified public-record signals in a message to the owner. Do not invent phone numbers, emails, addresses, facts, or consent. No pressure, threats, or deceptive urgency. Return JSON with string fields subject, message, rationale, nextStep. The message is a draft for agent review only and must not imply it has been sent.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              property: { address: input.address, borough: input.borough },
              agentName: input.agentName,
              selectedChannel: input.channel,
              hasVerifiedPublicMailingAddress: input.hasPublicMailingAddress,
              researchSignalsForInternalContextOnly: input.signals,
              constraints: [
                'Do not disclose research signals to the property owner.',
                'Use a no-pressure, transparent introduction.',
                'If no current mailing address is available, say it must be verified before sending direct mail.',
                'The agent must review before any outreach.',
              ],
            }),
          },
        ],
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    })

    if (!response.ok) {
      throw new Error(`OpenAI returned HTTP ${response.status}.`)
    }
    const result: unknown = await response.json()
    const completion = z.object({
      choices: z.array(z.object({
        message: z.object({ content: z.string().nullable() }),
      })).min(1),
    }).parse(result)
    const content = completion.choices[0].message.content
    if (!content) throw new Error('AI returned an empty outreach draft.')

    return NextResponse.json({
      ...parseDraft(content),
      provider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      requiresAgentReview: true,
    })
  } catch (error) {
    console.error('AI outreach draft generation failed:', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({
      ...createFallbackDraft(input),
      provider: 'template-fallback',
      model: 'rules-based fallback',
      requiresAgentReview: true,
      warning: 'AI generation was unavailable; this is a template draft for agent review.',
    })
  }
}
