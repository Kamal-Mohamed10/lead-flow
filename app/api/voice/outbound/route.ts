import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { initiateOutboundCall } from '@/lib/voice'

interface UnlockedLead {
  id: string
  phone: string | null
  street_address: string
  city: string
  state: string
  postal_code: string
  estimated_value: number | string | null
  status: string
  property_specs: Record<string, unknown> | null
}

function parseUnlockedLead(value: unknown): UnlockedLead | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const record = value as Record<string, unknown>
  if (
    typeof record.id !== 'string' ||
    typeof record.street_address !== 'string' ||
    typeof record.city !== 'string' ||
    typeof record.state !== 'string' ||
    typeof record.postal_code !== 'string' ||
    typeof record.status !== 'string'
  ) {
    return null
  }

  const propertySpecs =
    record.property_specs &&
    typeof record.property_specs === 'object' &&
    !Array.isArray(record.property_specs)
      ? (record.property_specs as Record<string, unknown>)
      : null

  return {
    id: record.id,
    phone: typeof record.phone === 'string' ? record.phone : null,
    street_address: record.street_address,
    city: record.city,
    state: record.state,
    postal_code: record.postal_code,
    estimated_value:
      typeof record.estimated_value === 'number' || typeof record.estimated_value === 'string'
        ? record.estimated_value
        : null,
    status: record.status,
    property_specs: propertySpecs,
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.response) return auth.response

    const body = await request.json()
    const { leadId } = body

    if (typeof leadId !== 'string' || !leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      )
    }

    const { data: leadData, error } = await auth.supabase
      .rpc('get_lead_contact', { p_lead_id: leadId })
      .maybeSingle()

    if (error) {
      console.error('Lead contact lookup failed:', { code: error.code, message: error.message })
      return NextResponse.json({ error: 'Failed to load lead contact.' }, { status: 500 })
    }

    const lead = parseUnlockedLead(leadData)
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found or not unlocked for this agent.' },
        { status: 404 }
      )
    }

    const propertyType = lead.property_specs?.property_type
    const callData = {
      leadId: lead.id,
      phoneNumber: lead.phone || '',
      address: lead.street_address,
      city: lead.city,
      state: lead.state,
      zip: lead.postal_code,
      propertyType: typeof propertyType === 'string' ? propertyType : 'residential',
      price: Number(lead.estimated_value || 0),
      stage: lead.status,
    }

    const result = await initiateOutboundCall(callData, auth.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Outbound call error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate call' },
      { status: 500 }
    )
  }
}