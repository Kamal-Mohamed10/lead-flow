import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import type { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // TODO: Implement real auth logic
        // For now, return demo user
        return { id: '1', email: credentials?.email, name: 'Demo User' }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
      }
      if (token.role) {
        session.user.role = token.role as 'agent' | 'lead' | 'admin' | 'wholesaler'
      }
      if (token.stripeCustomerId) {
        session.user.stripeCustomerId = token.stripeCustomerId as string
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.role = user.role
        token.stripeCustomerId = user.stripeCustomerId
      }
      return token
    },
  },
}

export handler = NextAuth(authOptions)
export { authOptions }