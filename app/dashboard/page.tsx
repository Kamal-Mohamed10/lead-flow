import Link from 'next/link'

export default function DashboardPage() {
  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: 'layout' },
    { name: 'Leads', href: '/dashboard/leads', icon: 'users' },
    { name: 'Calendar', href: '/dashboard/calendar', icon: 'calendar' },
    { name: 'Pricing', href: '/dashboard/pricing', icon: 'credit-card' },
  ]

  return (
    <div className="min-h-screen bg-[#f6f2ea]/10">
      <header className="bg-[#10243b] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold">LeadFlow AI</h1>
          <nav className="flex gap-4 mt-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={link.href === '/dashboard' ? 'px-3 py-2 rounded-lg bg-[#ff6b4a] text-white text-sm font-medium' : 'px-3 py-2 rounded-lg text-sm font-medium text-[#f6f2ea]/70 hover:bg-[#10243b]/30 hover:text-white transition-colors'}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#10243b] mb-2">Dashboard Overview</h2>
          <p className="text-[#5c6a79]">Welcome back to LeadFlow AI - your real estate lead management platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow border border-coral-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600">👥</span>
              </div>
              <span className="text-2xl font-bold text-[#10243b]">127</span>
            </div>
            <p className="text-[#5c6a79] text-sm">Total Leads</p>
            <p className="text-xs text-[#5c6a79] mt-1">+12 this week</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow border border-coral-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <span className="text-green-600">📅</span>
              </div>
              <span className="text-2xl font-bold text-[#10243b]">23</span>
            </div>
            <p className="text-[#5c6a79] text-sm">Appointments</p>
            <p className="text-xs text-[#5c6a79] mt-1">5 pending confirmation</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow border border-coral-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-coral-100 flex items-center justify-center">
                <span className="text-[#ff6b4a]">📈</span>
              </div>
              <span className="text-2xl font-bold text-[#10243b]">7</span>
            </div>
            <p className="text-[#5c6a79] text-sm">Qualified Deals</p>
            <p className="text-xs text-[#5c6a79] mt-1">3 under contract</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow border border-coral-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <span className="text-purple-600">🤖</span>
              </div>
              <span className="text-2xl font-bold text-[#10243b]">84%</span>
            </div>
            <p className="text-[#5c6a79] text-sm">AI Call Success Rate</p>
            <p className="text-xs text-[#5c6a79] mt-1">Avg 3.2 touches per lead</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Link href="/dashboard/leads" className="block bg-white rounded-xl p-6 shadow border border-coral-100 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-coral-100 flex items-center justify-center">
                <span className="text-[#ff6b4a]">👥</span>
              </div>
              <span className="text-sm font-medium text-[#ff6b4a]">CRM</span>
            </div>
            <h3 className="text-xl font-bold text-[#10243b] mb-2">Manage All Leads</h3>
            <p className="text-sm text-[#5c6a79]">Kanban board view of all your leads with property data, call recordings, and AI transcripts.</p>
          </Link>

          <Link href="/dashboard/calendar" className="block bg-white rounded-xl p-6 shadow border border-coral-100 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center">
                <span className="text-cyan-600">📅</span>
              </div>
              <span className="text-sm font-medium text-cyan-600">Calendar</span>
            </div>
            <h3 className="text-xl font-bold text-[#10243b] mb-2">Schedule Availability</h3>
            <p className="text-sm text-[#5c6a79]">Set your weekly availability slots (EST) for the AI voice agent to schedule appointments.</p>
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Link href="/dashboard/scrapers" className="block bg-white rounded-xl p-6 shadow border border-coral-100 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
              <span className="text-indigo-600">🤖</span>
            </div>
            <h3 className="text-lg font-bold text-[#10243b] mb-2">Scraper Engine</h3>
            <p className="text-sm text-[#5c6a79]">NYC ACRIS + DOB data ingestion pipelines.</p>
          </Link>

          <Link href="/dashboard/billing" className="block bg-white rounded-xl p-6 shadow border border-coral-100 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
              <span className="text-amber-600">💵</span>
            </div>
            <h3 className="text-lg font-bold text-[#10243b] mb-2">Billing</h3>
            <p className="text-sm text-[#5c6a79]">Manage your subscription plan and payment methods.</p>
          </Link>

          <Link href="/dashboard/voice" className="block bg-white rounded-xl p-6 shadow border border-coral-100 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mb-4">
              <span className="text-red-600">👥</span>
            </div>
            <h3 className="text-lg font-bold text-[#10243b] mb-2">Voice Pipeline</h3>
            <p className="text-sm text-[#5c6a79]">Send AI voice calls to leads and review recordings.</p>
          </Link>
        </div>
      </main>
    </div>
  )
}