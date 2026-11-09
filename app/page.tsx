'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-coral-50 to-coral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-12 shadow-soft max-w-3xl mx-auto"
        >
          <div className="mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff6b4a] to-[#e8563c] flex items-center justify-center mx-auto mb-6">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-white"
              >
                ⭐
              </motion.div>
            </div>
            <h1 className="text-5xl font-bold text-[#10243b] mb-4">LeadFlow AI</h1>
            <p className="text-lg text-[#5c6a79] mb-8 max-w-xl mx-auto">
              AI-powered platform for real estate agents and wholesalers. Automate lead generation,
              AI voice calling, and deal management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-2xl p-6 shadow border border-coral-100">
              <h3 className="text-xl font-semibold text-[#10243b] mb-2">AI Voice Pipeline</h3>
              <p className="text-sm text-slate-500">Automated calls with Retell/Vapi, 24/7 seller outreach.</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-2xl p-6 shadow border border-coral-100">
              <h3 className="text-xl font-semibold text-[#10243b] mb-2">Kanban CRM</h3>
              <p className="text-sm text-slate-500">Drag-and-drop lead board with property data and recordings.</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-2xl p-6 shadow border border-coral-100">
              <h3 className="text-xl font-semibold text-[#10243b] mb-2">Calendar Scheduler</h3>
              <p className="text-sm text-slate-500">Weekly availability slots (EST), confirmed by AI live.</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-white rounded-2xl p-6 shadow border border-coral-100">
              <h3 className="text-xl font-semibold text-[#10243b] mb-2">Stripe Monetization</h3>
              <p className="text-sm text-slate-500">Starter $99, Pro $249, Agency $499 per month.</p>
            </motion.div>
          </div>

          <motion.div whileHover={{ scale: 1.05 }}>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-[#ff6b4a] to-[#e8563c] text-white font-bold text-lg hover:shadow-lg hover:shadow-[#ff6b4a]/25 transition-all shadow-md"
            >
              Get Started Free
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}