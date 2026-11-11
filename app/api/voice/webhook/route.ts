import { NextRequest, NextResponse } from 'next/server'
import { processVoiceWebhook } from '@/lib/voice'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { callId, status, recordingUrl, transcript, summary, extractedData } = body

    if (!callId) {
      return NextResponse.json({ error: 'callId required' }, { status: 400 })
    }

    const webhookPayload = {
      callId,
      status,
      duration: body.duration || 0,
      recordingUrl,
      transcript,
      summary,
      extractedData,
    }

    const result = await processVoiceWebhook(webhookPayload, body.userId || 'demo-user')
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 501 })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Voice webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'voice webhook endpoint active' })
}