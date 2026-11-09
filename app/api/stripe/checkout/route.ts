import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createCheckoutSession, PLANS } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

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

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/pricing`

    const checkoutUrl = await createCheckoutSession(
      userId,
      plan.priceId,
      successUrl,
      cancelUrl
    )

    return NextResponse.json({ checkoutUrl })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}