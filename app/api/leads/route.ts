import { NextResponse } from 'next/server'
import {
  getSupabaseServerClient,
  requireAuth,
  SupabaseConfigurationError,
} from '@/lib/auth'
import { leadSubmissionSchema } from '@/lib/lead-schema'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  let auth
  try {
    auth = await requireAuth()
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    throw error
  }
  if (auth.response) return auth.response

  const { data: leads, error } = await auth.supabase
    .from('marketplace_leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Workspace leads query failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'We could not load workspace leads.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, leads })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = leadSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the form and try again.' }, { status: 400 })
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true })
  }

  let supabase
  try {
    supabase = await getSupabaseServerClient()
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    throw error
  }
  const lead = parsed.data
  const { error } = await supabase.from("leads").insert({
    full_name: lead.fullName,
    email: lead.email,
    phone: lead.phone || null,
    street_address: lead.streetAddress,
    city: lead.city,
    state: lead.state,
    postal_code: lead.postalCode,
    estimated_value: lead.estimatedValue,
    timeline: lead.timeline,
    is_selling: true,
    is_buying: lead.isBuyingNextHome,
    property_specs: {
      property_type: lead.propertyType,
      bedrooms: lead.bedrooms,
      bathrooms: lead.bathrooms,
      square_feet: lead.squareFeet,
      year_built: lead.yearBuilt,
    },
    motivation: lead.motivation || null,
    urgency_score: lead.urgencyScore,
  })

  if (error) {
    console.error('Lead insert failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'We could not save your request. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
