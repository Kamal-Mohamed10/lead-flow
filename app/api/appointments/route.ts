import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')

    const where: any = { userId }
    if (leadId) where.leadId = leadId

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { dateTime: 'asc' },
      include: { lead: true },
    })

    return NextResponse.json(appointments)
  } catch (error) {
    console.error('Appointments GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const body = await request.json()
    const { leadId, dateTime, meetingType } = body

    if (!leadId || !dateTime) {
      return NextResponse.json(
        { error: 'leadId and dateTime are required' },
        { status: 400 }
      )
    }

    const appointment = await prisma.appointment.create({
      data: {
        leadId,
        userId,
        dateTime: new Date(dateTime),
        meetingType: meetingType || 'property_viewing',
        status: 'confirmed',
      },
    })

    // Update lead stage
    await prisma.lead.update({
      where: { id: leadId, userId },
      data: { stage: 'appointment_scheduled' },
    })

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    console.error('Appointments POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth()
    const userId = session.user.id

    const body = await request.json()
    const { id, status } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      )
    }

    const appointment = await prisma.appointment.updateMany({
      where: { id, userId },
      data: { status },
    })

    if (appointment.count === 0) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Appointments PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    )
  }
}