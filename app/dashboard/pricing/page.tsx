import { Users, CreditCard, Shield, ChevronUp } from 'lucide-react'

export default function PricingPage() {
  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#10243b] mb-4">Subscription Plans</h1>
        <p className="text-[#5c6a79] mb-8">Choose the plan that best fits your real estate business</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Starter Plan */}
        <div className="bg-white rounded-xl shadow border border-coral-100 p-8 max-w-sm mx-auto">
          <div className="mb-4">
            <span className="text-3xl font-bold text-[#ff6b4a]">$99</span>
            <span className="text-xl text-[#5c6a79]">/ month</span>
          </div>
          <h3 className="text-lg font-bold text-[#10243b] mb-4">Starter</h3>
          <ul className="space-y-3 text-[#5c6a79] text-sm">
            <li>
              <span className="text-[#ff6b4a]" aria-hidden="true">✓</span> Up to 100 leads/month
            </li>
            <li>
              <span className="text-[#ff6b4a]" aria-hidden="true">✓</span> AI voice dialing
            </li>
            <li>
              <span className="text-[#ff6b4a]" aria-hidden="true">✓</span> Email automation
            </li>
            <li>
              <span className="line-through text-[#6b7280]" aria-hidden="true">✗</span> Custom branding
            </li>
          </ul>
          <button className="mt-4 w-full py-3 bg-[#ff6b4a] text-white rounded-lg font-medium hover:bg-[#e8563c] transition-colors">
            Get Started
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-white rounded-xl shadow border border-coral-100 p-8 max-w-sm mx-auto">
          <div className="mb-4">
            <span className="text-3xl font-bold text-[#ff6b4a]">$249</span>
            <span className="text-xl text-[#5c6a79]">/ month</span>
          </div>
          <h3 className="text-lg font-bold text-[#10243b] mb-4">Pro</h3>
          <ul className="space-y-3 text-[#5c6a79] text-sm">
            <li>
              <span className="text-[#ff6b4a]" aria-hidden="true">✓</span> Up to 500 leads/month
            </li>
            <li>
              <span className="text-[#ff6b4a]" aria-hidden="true">✓</span> AI voice dialing
            </li>
            <li>
              <span className="text-[#ff6b4a]" aria-hidden="true">✓</span> Email automation
            </li>
            <li>
              <span className="text-[#ff6b4a]" aria-hidden="true">✓</span> Custom branding
            </li>
          </ul>
          <button className="mt-4 w-full py-3 bg-[#10243b] text-white rounded-lg font-medium hover:bg-[#10243b]/90 transition-colors">
            Get Started
          </button>
        </div>

        {/* Agency Plan */}
        <div className="bg-white rounded-xl shadow border border-coral-100 p-8 max-w-sm mx-auto">
          <div className="mb-4">
            <span className="text-3xl font-bold text-[#ff6b4a]">$499</span>
            <span className="text-xl text-[#5c6a79]">/ month</span>
          </div>
          <h3 className="text-lg font-bold text-[#10243b] mb-4">Agency</h3>
          <ul className="space-y-3 text-[#5c6a79] text-sm">
            <li>
              <span className="text-[#ff6b4a]" aria-hidden="true">✓</span> Unlimited leads/month
            </li>
            <li>
              <span className="text-[#ff6b4a]" aria-hidden="true">✓</span> AI voice dialing
            </li>
            <li>
              <span className="text-[#ff6b4a]" aria-hidden="true">✓</span> Email automation
            </li>
            <li>
              <span className="text-[#ff6b4a]" aria-hidden="true">✓</span> Custom branding
            </li>
            <li>
              <span className="text-[#ff6b4a]" aria-hidden="true">✓</span> Multiple agent seats
            </li>
          </ul>
          <button className="mt-4 w-full py-3 bg-[#10243b] text-white rounded-lg font-medium hover:bg-[#10243b]/90 transition-colors">
            Get Started
          </button>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ff6b4a] to-[#e8563c] text-white rounded-lg font-medium hover:shadow-lg hover:shadow-[#ff6b4a]/25 transition-all">
          <Users className="w-4 h-4" />
          Start Free Trial
        </button>
      </div>
    </div>
  )
}