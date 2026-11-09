'use client'

import { Calendar, Clock, User, Phone } from 'lucide-react'

interface AvailabilitySlot {
  day: string
  startTime: string
  endTime: string
  isAvailable: boolean
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function CalendarPage() {
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([
    { day: 'Monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
    { day: 'Tuesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
    { day: 'Wednesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
    { day: 'Thursday', startTime: '09:00', endTime: '17:00', isAvailable: true },
    { day: 'Friday', startTime: '09:00', endTime: '17:00', isAvailable: true },
    { day: 'Saturday', startTime: '09:00', endTime: '14:00', isAvailable: false },
    { day: 'Sunday', startTime: '09:00', endTime: '14:00', isAvailable: false },
  ])

  const [appointments] = useState([
    { id: 1, seller: 'John Smith', property: '123 Main St, Brooklyn', time: 'Mon 10:00 AM', status: 'confirmed' },
    { id: 2, seller: 'Maria Garcia', property: '456 Ocean Ave, Queens', time: 'Tue 2:00 PM', status: 'pending' },
    { id: 3, seller: 'Robert Chen', property: '789 Park Pl, Manhattan', time: 'Wed 11:00 AM', status: 'confirmed' },
  ])

  const toggleAvailability = (day: string) => {
    setAvailability(availability.map((s) =>
      s.day === day ? { ...s, isAvailable: !s.isAvailable } : s
    ))
  }

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#10243b] mb-2">Calendar Scheduler</h1>
        <p className="text-[#5c6a79]">Manage your weekly availability for AI voice appointment scheduling.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Availability */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow border border-coral-100 p-6">
            <h2 className="text-xl font-bold text-[#10243b] mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#ff6b4a]" />
              Weekly Availability (EST)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {daysOfWeek.map((day) => {
                const slot = availability.find((s) => s.day === day)
                return (
                  <div key={day} className="p-4 rounded-lg border border-coral-200 bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-medium text-[#10243b]">{day}</span>
                      <button
                        onClick={() => toggleAvailability(day)}
                        className={`w-6 h-6 rounded-full ${slot?.isAvailable ? 'bg-[#ff6b4a]' : 'bg-gray-200'}`}
                      />
                    </div>
                    <div className="space-y-2 text-sm text-[#5c6a79]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{slot?.startTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{slot?.endTime}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Voice Settings */}
          <div className="bg-white rounded-xl shadow border border-coral-100 p-6">
            <h2 className="text-xl font-bold text-[#10243b] mb-6 flex items-center gap-2">
              <Phone className="w-5 h-5 text-[#ff6b4a]" />
              AI Voice Agent Settings
            </h2>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-coral-50 border border-coral-100">
                <h3 className="font-medium text-[#10243b] mb-2">Appointment Confirmation</h3>
                <p className="text-sm text-[#5c6a79] mb-2">
                  The AI voice agent can fetch available slots during live calls and confirm appointments automatically.
                </p>
                <button className="px-4 py-2 bg-[#10243b] text-white rounded-lg text-sm hover:bg-[#10243b]/90 transition-colors">
                  Enable AI Voice Confirmation
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl shadow border border-coral-100 p-6">
          <h2 className="text-xl font-bold text-[#10243b] mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-[#ff6b4a]" />
            Upcoming Appointments
          </h2>
          <div className="space-y-4">
            {appointments.map((apt) => (
              <div key={apt.id} className="p-4 rounded-lg border border-coral-100 flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#10243b]">{apt.seller}</p>
                  <p className="text-sm text-[#5c6a79]">{apt.property}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-[#10243b]">{apt.time}</p>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    apt.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {apt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'