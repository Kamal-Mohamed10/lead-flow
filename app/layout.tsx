import './globals.css'
import type { Metadata } from 'next'
import { Inter as FontSans } from 'next/font/google'
import { cn } from '@/lib/utils'

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'LeadFlow AI | Real Estate Lead Marketplace',
    template: '%s | LeadFlow AI',
  },
  description: 'AI-powered lead generation and call automation platform for real estate investors and wholesalers.',
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
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        {children}
      </body>
    </html>
  )
}
