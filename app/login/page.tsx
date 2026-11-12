'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Lock, Mail, UserRound } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'
import { prefetchPriorityQueueDiscovery } from '@/lib/propertyStorage'

const DEMO_ACCOUNT = {
  name: 'Kamal Mohamed',
  email: 'kamal@example.com',
  password: 'demo',
}

function enterDemoWorkspace(userName: string) {
  localStorage.setItem('leadflow-workspace-mode', 'agent')
  localStorage.setItem('leadflow-demo-mode', 'true')
  localStorage.setItem('leadflow-user-name', userName)

  const defaultArrayKeys = [
    'leadflow-crm-leads',
    'leadflow-explored-catalog',
    'leadflow-delivered-opportunity-ids',
  ]
  for (const key of defaultArrayKeys) {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify([]))
    }
  }

  if (localStorage.getItem('leadflow-action-tasks') === null) {
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
  }

  if (localStorage.getItem('leadflow-batch-unlock-time') === null) {
    localStorage.setItem('leadflow-batch-unlock-time', String(Date.now() + 3600 * 1000))
  }

  window.dispatchEvent(new Event('leadflow-demo-mode-change'))
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(event.currentTarget)
    const submittedName = String(formData.get('name') ?? name).trim()
    const submittedEmail = String(formData.get('email') ?? email).trim()
    const submittedPassword = String(formData.get('password') ?? password)

    localStorage.setItem('leadflow-workspace-mode', 'agent')
    if (submittedName) localStorage.setItem('leadflow-user-name', submittedName)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      if (submittedEmail.toLowerCase() === DEMO_ACCOUNT.email && submittedPassword === DEMO_ACCOUNT.password) {
        const displayName = authMode === 'signup' && submittedName ? submittedName : DEMO_ACCOUNT.name
        enterDemoWorkspace(displayName)
        void prefetchPriorityQueueDiscovery()
        router.push('/dashboard')
        return
      }
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    try {
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
      const { data, error: authError } =
        authMode === 'signup'
          ? await supabase.auth.signUp({
              email: submittedEmail,
              password: submittedPassword,
              options: {
                data: {
                  full_name: submittedName,
                  workspace_mode: 'agent',
                },
              },
            })
          : await supabase.auth.signInWithPassword({
              email: submittedEmail,
              password: submittedPassword,
            })

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
            Official NYC public registry mining, forensic equity spreads, and verified owner info so you can reach out directly.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-200">
            {[
              'NYC ACRIS, DOF Tax Liens & HPD Distress Mining',
              'Priority Queue & Transparent 0–100 Scoring',
              'Verified Owner Lookup & Agent Notes',
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
          method="post"
          autoComplete="on"
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

          <div className="mt-6 space-y-4">
            {authMode === 'signup' && (
              <label htmlFor="login-name" className="block text-xs font-bold text-slate-600">
                Your full name
                <span className="mt-1.5 flex items-center rounded-xl border border-slate-200 px-3.5 focus-within:border-[#176b4d]">
                  <UserRound className="size-4 text-slate-400" />
                  <input
                    id="login-name"
                    name="name"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Alex Morgan"
                    className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#172b2a] outline-none placeholder:text-slate-400"
                  />
                </span>
              </label>
            )}

            <label htmlFor="login-email" className="block text-xs font-bold text-slate-600">
              Email address
              <span className="mt-1.5 flex items-center rounded-xl border border-slate-200 px-3.5 focus-within:border-[#176b4d]">
                <Mail className="size-4 text-slate-400" />
                <input
                  id="login-email"
                  name="email"
                  autoComplete={authMode === 'signin' ? 'username' : 'email'}
                  required
                  type="email"
                  value={email}
                  onChange={(event) => {
                    const nextEmail = event.target.value
                    setEmail(nextEmail)
                    if (
                      nextEmail.trim().toLowerCase() === DEMO_ACCOUNT.email &&
                      (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
                    ) {
                      void prefetchPriorityQueueDiscovery()
                    }
                  }}
                  placeholder="agent@example.com"
                  className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#172b2a] outline-none placeholder:text-slate-400"
                />
              </span>
            </label>

            <label htmlFor="login-password" className="block text-xs font-bold text-slate-600">
              Password
              <span className="mt-1.5 flex items-center rounded-xl border border-slate-200 px-3.5 focus-within:border-[#176b4d]">
                <Lock className="size-4 text-slate-400" />
                <input
                  id="login-password"
                  name="password"
                  autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
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
