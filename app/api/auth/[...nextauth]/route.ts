import { authOptions } from '@/lib/auth.config'
import { NextAuthOptions } from 'next-auth'
import NextAuth from 'next-auth'

const handler = NextAuth(authOptions as NextAuthOptions)

export { handler as GET, handler as POST }