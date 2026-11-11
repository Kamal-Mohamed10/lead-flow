'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bookmark, LayoutDashboard, LogOut, Map, Menu, NotebookPen, X } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { GlobalAiAssistant } from '@/components/global-ai-assistant'

const demoModeEvent = 'leadflow-demo-mode-change'

function getWorkspaceSnapshot() {
  const name = localStorage.getItem('leadflow-user-name')
  return name || 'Agent workspace'
}

function getServerWorkspaceSnapshot() {
  return 'Agent workspace'
}

function subscribeToWorkspace(onChange: () => void) {
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener('storage', onChange)
  }
}

function getDemoModeSnapshot() {
  return localStorage.getItem('leadflow-demo-mode') === 'true'
}

function getServerDemoModeSnapshot() {
  return false
}

function subscribeToDemoMode(onChange: () => void) {
  window.addEventListener(demoModeEvent, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(demoModeEvent, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const workspaceName = useSyncExternalStore(
    subscribeToWorkspace,
    getWorkspaceSnapshot,
    getServerWorkspaceSnapshot
  )
  const isDemo = useSyncExternalStore(
    subscribeToDemoMode,
    getDemoModeSnapshot,
    getServerDemoModeSnapshot
  )

  function exitDemo() {
    localStorage.removeItem('leadflow-demo-mode')
    window.dispatchEvent(new Event(demoModeEvent))
    router.push('/login')
  }

  const navItems = [
    { name: 'Daily Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Explore Properties', href: '/dashboard/leads', icon: Map },
    { name: 'Watchlist', href: '/dashboard/watchlist', icon: Bookmark },
    { name: 'Agent Notes', href: '/dashboard/notes', icon: NotebookPen },
  ]

  return (
    <div className="h-screen overflow-hidden bg-[#f7f8f6] lg:flex">
      <aside
        className={`fixed inset-y-0 left-0 z-[60] flex w-64 flex-col bg-[#172b2a] transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center px-6">
          <Link href="/login" className="flex items-center gap-3 text-lg font-black text-white">
            <span className="grid size-9 place-items-center rounded-xl bg-[#176b4d]">LF</span>
            LeadFlow <span className="text-[#8edbb8]">NYC</span>
          </Link>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-4">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.22em] text-white/35">
            Acquisition Workspace
          </p>
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                  active
                    ? 'bg-[#176b4d] text-white shadow-lg'
                    : 'text-white/65 hover:bg-white/7 hover:text-white'
                }`}
              >
                <item.icon className="size-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-[#176b4d] font-black text-white">
              {workspaceName.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <p className="max-w-36 truncate text-sm font-bold text-white">{workspaceName}</p>
              <p className="text-xs text-white/45">Acquisition Workspace</p>
            </div>
          </div>
          {isDemo ? (
            <button
              type="button"
              onClick={exitDemo}
              className="mt-4 flex items-center gap-2 text-xs font-bold text-white/55 hover:text-white"
            >
              <LogOut className="size-3.5" />
              Exit demo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="mt-4 flex items-center gap-2 text-xs font-bold text-white/55 hover:text-white"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 lg:h-20">
          <button
            className="lg:hidden text-[#172b2a]"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-6" />
          </button>
          <div className="hidden items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 lg:flex">
            <span>New York City</span>
            <span>•</span>
            <span className="text-[#176b4d]">Acquisition Workspace</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Municipal Feed Active
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>

      {/* Global AI Assistant accessible across every dashboard page */}
      <GlobalAiAssistant />
    </div>
  )
}
