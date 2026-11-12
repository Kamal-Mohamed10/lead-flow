import './globals.css'
import type { Metadata } from 'next'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: {
    default: 'LeadFlow NYC | Off-Market Intelligence for Wholesalers & Agents',
    template: '%s | LeadFlow NYC',
  },
  description: 'Off-market NYC property intelligence built for real estate wholesalers and off-market agents: live ACRIS deeds & mortgages, DOF tax liens & valuations, 0-100 scoring, DNC-scrubbed owner lookups, and full property report PDFs.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased text-[#172b2a]'
        )}
      >
        {children}
      </body>
    </html>
  )
}


