import './globals.css'
import type { Metadata } from 'next'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: {
    default: 'LeadFlow NYC | Off-Market Deal Intelligence for Agents & Wholesalers',
    template: '%s | LeadFlow NYC',
  },
  description: 'Forensic property intelligence, pre-foreclosure alerts, verified equity spreads, and public deed records for New York City acquisition agents and wholesalers.',
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


