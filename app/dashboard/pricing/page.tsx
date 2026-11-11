'use client'

import { Check, CreditCard, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

const plans = [
  { id: 'starter', name: 'Starter', price: '$99', description: 'For independent agents getting their first pipeline moving.', features: ['2,500 property records', 'Pipeline and task tracking', 'Calendar scheduling', 'Email support'], cta: 'Choose Starter' },
  { id: 'pro', name: 'Pro', price: '$249', description: 'For high-volume agents who need deeper research workflows.', features: ['10,000 property records', 'Advanced opportunity signals', 'Team pipeline views', 'Priority support'], cta: 'Choose Pro', featured: true },
  { id: 'agency', name: 'Agency', price: '$499', description: 'For teams managing several markets and agent seats.', features: ['Unlimited property records', 'Multiple agent seats', 'Portfolio reporting', 'Dedicated onboarding'], cta: 'Choose Agency' },
]

export default function PricingPage() {
  const [current, setCurrent] = useState('pro')
  const [notice, setNotice] = useState('')
  useEffect(() => { setCurrent(localStorage.getItem('leadflow-plan') || 'pro') }, [])
  function choose(id: string, name: string) { setCurrent(id); localStorage.setItem('leadflow-plan', id); setNotice(`${name} selected for this workspace. Stripe activation is available when billing credentials are configured.`) }
  return <div><div className="mb-10 max-w-2xl"><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#176b4d]">Plans</p><h1 className="text-3xl font-black text-[#172b2a]">Choose a workspace plan</h1><p className="mt-3 text-sm leading-6 text-slate-500">Pricing is shown for the prototype. Plan selection is functional locally and billing can be activated with Stripe credentials.</p></div>
    {notice && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div>}
    <div className="grid gap-5 lg:grid-cols-3">{plans.map((plan) => <article key={plan.id} className={`relative rounded-2xl border bg-white p-6 shadow-sm ${plan.featured ? 'border-[#176b4d] ring-2 ring-[#176b4d]/10' : 'border-slate-200'} ${current === plan.id ? 'shadow-lg' : ''}`}>{plan.featured && <span className="absolute right-5 top-5 rounded-full bg-[#edf7f2] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#176b4d]">Most popular</span>}<h2 className="text-xl font-black text-[#172b2a]">{plan.name}</h2><div className="mt-5"><span className="text-4xl font-black tracking-tight text-[#172b2a]">{plan.price}</span><span className="text-sm text-slate-500"> / month</span></div><p className="mt-4 min-h-12 text-sm leading-6 text-slate-500">{plan.description}</p><ul className="mt-6 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-slate-600"><Check className="mt-0.5 size-4 shrink-0 text-[#176b4d]" />{feature}</li>)}</ul><button onClick={() => choose(plan.id, plan.name)} className={`mt-7 w-full rounded-xl py-3 text-sm font-bold ${current === plan.id ? 'bg-[#172b2a] text-white' : plan.featured ? 'bg-[#176b4d] text-white' : 'bg-[#edf7f2] text-[#176b4d] hover:bg-[#176b4d] hover:text-white'}`}>{current === plan.id ? 'Current plan' : plan.cta}</button></article>)}</div>
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#176b4d]"/><div><p className="font-bold text-[#172b2a]">Billing status</p><p className="mt-1 text-sm text-slate-500">No payment is collected in prototype mode. Property and public-data access remain available.</p></div></div>
  </div>
}
