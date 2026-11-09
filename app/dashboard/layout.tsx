'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  Bot,
  LogOut,
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', href: '/dashboard/leads', icon: Users },
    { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Scrapers', href: '/dashboard/scrapers', icon: Bot },
  ]

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-[#10243b] text-[#f6f2ea] flex flex-col shrink-0">
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#10243b]/20">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-[#ff6b4a]">
              LeadFlow
            </span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#ff6b4a] text-white shadow-md'
                    : 'text-[#f6f2ea]/70 hover:bg-[#10243b]/30 hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-[#10243b]/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#ff6b4a] flex items-center justify-center text-white text-sm font-bold">
              U
            </div>
            <div>
              <p className="text-sm font-medium text-[#f6f2ea]">
                User
              </p>
              <p className="text-xs text-[#f6f2ea]/60">
                user@example.com
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-[#f6f2ea]/70 hover:bg-[#10243b]/30 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#f6f2ea]/20 p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}