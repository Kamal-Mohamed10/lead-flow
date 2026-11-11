import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, SupabaseConfigurationError } from '@/lib/auth'
import { createCheckoutSession, PLANS } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (auth.response) return auth.response

    const body = await request.json()
    const { planId } = body

    if (!planId) {
      return NextResponse.json(
        { error: 'planId is required' },
        { status: 400 }
      )
    }

    const plan = PLANS.find((p) => p.id === planId)
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const successUrl = `${appUrl}/dashboard/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${appUrl}/dashboard/pricing`

    const checkoutUrl = await createCheckoutSession(
      auth.user.id,
      auth.user.email || '',
      typeof auth.user.user_metadata.full_name === 'string'
        ? auth.user.user_metadata.full_name
        : undefined,
      plan.priceId,
      successUrl,
      cancelUrl
    )

    if (!checkoutUrl) {
      throw new Error('Stripe did not return a checkout URL.')
    }

    return NextResponse.json({ checkoutUrl })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    if (error instanceof SupabaseConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}