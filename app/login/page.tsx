'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Lock, Mail, Sparkles, UserRound } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function startDemo() {
    localStorage.setItem('leadflow-workspace-mode', 'agent')
    localStorage.setItem('leadflow-demo-mode', 'true')
    localStorage.setItem('leadflow-user-name', 'Demo Agent')
    localStorage.setItem('leadflow-crm-leads', JSON.stringify([]))
    localStorage.setItem('leadflow-delivered-opportunity-ids', JSON.stringify([]))
    localStorage.setItem(
      'leadflow-action-tasks',
      JSON.stringify([
        {
          id: 'demo-task-research',
          property: 'Live NYC opportunity feed',
          action: 'Review a live property signal and verify public records',
          channel: 'Research',
          due: 'Today',
          done: false,
        },
      ])
    )
    router.push('/dashboard')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    localStorage.setItem('leadflow-workspace-mode', 'agent')
    if (name.trim()) localStorage.setItem('leadflow-user-name', name.trim())
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Supabase authentication is not configured.')
      setLoading(false)
      return
    }

    try {
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
      const { data, error: authError } =
        authMode === 'signup'
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  full_name: name.trim(),
                  workspace_mode: 'agent',
                },
              },
            })
          : await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError(authError.message)
      } else if (data.session) {
        router.push('/dashboard')
      } else if (authMode === 'signup') {
        setError('Check your email to confirm your account, then sign in.')
      } else {
        setError('Sign-in did not create an authenticated session.')
      }
    } catch (signUpError) {
      setError(signUpError instanceof Error ? signUpError.message : 'Account creation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#172b2a] text-white">
      <header className="mx-auto flex h-20 max-w-7xl items-center px-5 sm:px-8">
        <Link href="/login" className="flex items-center gap-3 text-xl font-black">
          <span className="grid size-10 place-items-center rounded-xl bg-[#176b4d] text-sm">LF</span>
          LeadFlow <span className="text-[#8edbb8]">NYC</span>
        </Link>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-10 px-5 pb-16 lg:grid-cols-2 lg:px-8">
        <section>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.25em] text-[#8edbb8]">
            <UserRound className="size-4" />
            LeadFlow NYC · Agent & Wholesaler Platform
          </p>
          <h1 className="mt-5 max-w-xl font-serif text-5xl font-bold leading-[1.05] tracking-tight lg:text-6xl text-white">
            Find Off-Market Deals <br />
            <span className="italic font-normal text-[#8edbb8]">Before Anyone Else.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-300">
            Official NYC public registry mining, forensic equity spreads, Do-Not-Call compliance, and 1-click tailored direct mail letters for New York acquisition specialists.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-200">
            {[
              'NYC ACRIS, DOF Tax Liens & HPD Distress Mining',
              'Eight Tailored Seller Motivation Categories',
              'Automated DNC Scrubbing & 1-Click Direct Mail Letters',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 font-medium">
                <CheckCircle2 className="size-4.5 text-[#8edbb8] shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </section>

        <form
          onSubmit={submit}
          className="mx-auto w-full max-w-md rounded-[28px] bg-white p-8 text-[#172b2a] shadow-2xl border border-slate-100"
        >
          <h2 className="font-serif text-2xl font-bold tracking-tight text-[#172b2a]">
            {authMode === 'signup' ? 'Create Your Agent Workspace' : 'Welcome Back'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {authMode === 'signup'
              ? 'Set up your acquisition workspace.'
              : 'Sign in to access your NYC opportunity pipeline.'}
          </p>

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800 font-medium">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={startDemo}
            className="mt-6 flex w-full items-center justify-between rounded-xl border border-emerald-200/80 bg-[#edf7f2] p-4 text-left transition hover:bg-[#dff2e8]"
          >
            <span className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-[#176b4d] text-white shadow-xs">
                <Sparkles className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-black text-[#172b2a]">Launch Live NYC Demo</span>
                <span className="block text-[11px] text-[#176b4d] font-bold">Explore live feed instantly · No account needed</span>
              </span>
            </span>
            <ArrowRight className="size-4 text-[#176b4d]" />
          </button>

          <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span>Or Continue With Credentials</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-4">
            {authMode === 'signup' && (
              <label className="block text-xs font-bold text-slate-600">
                Your full name
                <span className="mt-1.5 flex items-center rounded-xl border border-slate-200 px-3.5 focus-within:border-[#176b4d]">
                  <UserRound className="size-4 text-slate-400" />
                  <input
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Alex Morgan"
                    className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#172b2a] outline-none placeholder:text-slate-400"
                  />
                </span>
              </label>
            )}

            <label className="block text-xs font-bold text-slate-600">
              Email address
              <span className="mt-1.5 flex items-center rounded-xl border border-slate-200 px-3.5 focus-within:border-[#176b4d]">
                <Mail className="size-4 text-slate-400" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="agent@example.com"
                  className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#172b2a] outline-none placeholder:text-slate-400"
                />
              </span>
            </label>

            <label className="block text-xs font-bold text-slate-600">
              Password
              <span className="mt-1.5 flex items-center rounded-xl border border-slate-200 px-3.5 focus-within:border-[#176b4d]">
                <Lock className="size-4 text-slate-400" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#172b2a] outline-none placeholder:text-slate-400"
                />
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#176b4d] font-bold text-white transition hover:bg-[#12543d] disabled:opacity-50"
            >
              {loading
                ? 'Processing...'
                : authMode === 'signup'
                ? 'Create agent workspace'
                : 'Sign in to workspace'}
              <ArrowRight className="size-4" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-between text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'signup' ? 'signin' : 'signup')
                setError('')
              }}
              className="text-[#176b4d] hover:underline"
            >
              {authMode === 'signup'
                ? 'Already have an account? Sign in'
                : 'Need an account? Sign up'}
            </button>
            <Link href="/" className="text-slate-400 hover:text-slate-600">
              Return to home
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
