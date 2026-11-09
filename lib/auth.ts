import { getServerSession } from 'next-auth'
import { authOptions } from './auth.config'

export async function authenticate() {
  return await getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await authenticate()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}
