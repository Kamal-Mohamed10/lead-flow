import { NextRequest, NextResponse } from 'next/server'
import { processVoiceWebhook } from '@/lib/voice'
import { prisma } from '@/lib/prisma'

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

    await processVoiceWebhook(webhookPayload, body.userId || 'demo-user')

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Voice webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'voice webhook endpoint active' })
}