import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

function unavailableResponse() {
  return NextResponse.json(
    { error: 'Appointment persistence is not configured in Supabase yet.' },
    { status: 501 }
  )
}

export async function GET(request: NextRequest) {
  void request
  const auth = await requireAuth()
  if (auth.response) return auth.response
  return unavailableResponse()
}

export async function POST(request: NextRequest) {
  void request
  const auth = await requireAuth()
  if (auth.response) return auth.response
  return unavailableResponse()
}

export async function PATCH(request: NextRequest) {
  void request
  const auth = await requireAuth()
  if (auth.response) return auth.response
  return unavailableResponse()
}