/**
 * Voice AI Integration - Vapi/Retell AI Handler
 * Handles outbound calls, webhooks, and transcript processing
 */

export interface VoiceCallRequest {
  phoneNumber: string
  leadId: string
  script?: string
  voiceId?: string
  model?: 'gpt-4' | 'gpt-3.5-turbo'
  temperature?: number
  maxDuration?: number
}

export interface VoiceCallResponse {
  callId: string
  status: 'initiated' | 'queued' | 'failed'
  error?: string
}

export interface VoiceWebhookPayload {
  callId: string
  status: 'completed' | 'failed' | 'no-answer' | 'busy'
  duration: number
  recordingUrl?: string
  transcript?: string
  summary?: string
  extractedData?: {
    appointmentTime?: string
    appointmentDate?: string
    sellerInterest?: 'high' | 'medium' | 'low' | 'none'
    notes?: string
  }
}

export interface LeadCallData {
  leadId: string
  phoneNumber: string
  address: string
  city: string
  state: string
  zip: string
  propertyType: string
  price: number
  stage: string
}

/**
 * Initialize Vapi AI outbound call
 */
export async function initiateOutboundCall(
  callData: LeadCallData,
  userId: string
): Promise<VoiceCallResponse> {
  const apiKey = process.env.VAPI_API_KEY || process.env.RETELL_API_KEY
  
  if (!apiKey) {
    // Demo mode - simulate call initiation
    return {
      callId: `demo-${Date.now()}`,
      status: 'initiated',
    }
  }

  const script = generateCallScript(callData)

  try {
    // In production, use Vapi or Retell AI SDK
    // const response = await fetch('https://api.vapi.ai/call', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     phoneNumber: callData.phoneNumber,
    //     assistant: {
    //       model: {
    //         provider: 'openai',
    //         model: 'gpt-4',
    //         messages: [{ role: 'system', content: script }],
    //       },
    //       voice: { provider: '11labs', voiceId: 'default' },
    //     },
    //     metadata: { leadId: callData.leadId, userId },
    //   }),
    // })

    // const data = await response.json()
    // return { callId: data.id, status: 'initiated' }

    // Simulated response for demo
    return {
      callId: `call-${Date.now()}`,
      status: 'initiated',
    }
  } catch (error) {
    return {
      callId: '',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate personalized call script based on lead data
 */
function generateCallScript(lead: LeadCallData): string {
  return `You are a professional real estate agent calling a potential seller.
  
Property: ${lead.address}, ${lead.city}, ${lead.state} ${lead.zip}
Property Type: ${lead.propertyType}
Estimated Value: $${lead.price.toLocaleString()}

Your goal: Schedule an appointment for a property valuation.
Be conversational, not pushy. Ask about their timeline and motivation.
If interested, offer specific time slots from the user's calendar availability.
Always confirm the appointment date/time before ending the call.`
}

/**
 * Process voice webhook and extract appointment data
 */
export async function processVoiceWebhook(
  payload: VoiceWebhookPayload,
  userId: string
) {
  // Update lead with call data
  await prisma.lead.update({
    where: { id: payload.callId }, // Assuming callId maps to leadId in metadata
    data: {
      aiTranscript: payload.transcript,
      callRecordingUrl: payload.recordingUrl,
      stage: payload.extractedData?.appointmentTime
        ? 'appointment_scheduled'
        : 'qualified',
    },
  })

  // If appointment was scheduled, create appointment record
  if (payload.extractedData?.appointmentTime && payload.extractedData?.appointmentDate) {
    const appointmentDateTime = new Date(
      `${payload.extractedData.appointmentDate}T${payload.extractedData.appointmentTime}`
    )

    await prisma.appointment.create({
      data: {
        leadId: payload.callId,
        userId,
        dateTime: appointmentDateTime,
        status: 'confirmed',
        meetingType: 'valuation',
      },
    })
  }

  return { success: true }
}

/**
 * Get available calendar slots for AI agent
 */
export async function getAvailableSlots(
  userId: string,
  date: Date
): Promise<{ start: Date; end: Date }[]> {
  // In production, query the user's calendar availability
  // For now, return mock slots
  const slots = []
  const day = date.getDay()
  const hour = date.getHours()

  // Mock: Available 9am-5pm on weekdays
  if (day >= 1 && day <= 5) {
    for (let h = 9; h < 17; h++) {
      slots.push({
        start: new Date(date.setHours(h, 0, 0, 0)),
        end: new Date(date.setHours(h + 1, 0, 0, 0)),
      })
    }
  }

  return slots
}