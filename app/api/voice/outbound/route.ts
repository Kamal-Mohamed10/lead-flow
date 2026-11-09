import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { initiateOutboundCall } from '@/lib/voice'

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const body = await request.json()
    const { leadId } = body

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      )
    }

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    // Update lead stage to AI Dialing
    await prisma.lead.update({
      where: { id: leadId },
      data: { stage: 'ai_dialing' },
    })

    // Initiate AI voice call
    const callData = {
      leadId: lead.id,
      phoneNumber: '', // Would come from lead data in production
      address: lead.address,
      city: lead.city,
      state: lead.state,
      zip: lead.zip,
      propertyType: lead.propertyType,
      price: lead.price,
      stage: lead.stage,
    }

    const result = await initiateOutboundCall(callData, userId)

    // Store call ID on lead for webhook correlation
    if (result.callId) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { callRecordingUrl: result.callId }, // Using this field temporarily for callId
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Outbound call error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate call' },
      { status: 500 }
    )
  }
}