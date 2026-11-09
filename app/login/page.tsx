'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, Github, Google } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-coral-50 to-coral-100 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl p-8 shadow-soft">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#10243b]">Welcome back</h1>
            <p className="text-[#5c6a79] mt-2">Sign in to LeadFlow AI</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#5c6a79] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5c6a79]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-coral-200 focus:outline-none focus:ring-2 focus:ring-[#ff6b4a]"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#5c6a79] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5c6a79]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-coral-200 focus:outline-none focus:ring-2 focus:ring-[#ff6b4a]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-[#ff6b4a] to-[#e8563c] text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-coral-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-[#5c6a79]">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-coral-200 hover:bg-coral-50 transition-colors"
              >
                <Github className="w-5 h-5" />
                <span>GitHub</span>
              </button>
              <button
                onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-coral-200 hover:bg-coral-50 transition-colors"
              >
                <Google className="w-5 h-5" />
                <span>Google</span>
              </button>
            </div>
          </div>

          <p className="text-center mt-6 text-sm text-[#5c6a79]">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-[#ff6b4a] font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
