import { NextRequest, NextResponse } from 'next/server'
import { handleStripeWebhook } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const result = await handleStripeWebhook(request)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ status: 'stripe webhook endpoint active' })
}