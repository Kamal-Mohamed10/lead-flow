import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SupabaseConfigurationError'
  }
}

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new SupabaseConfigurationError('NEXT_PUBLIC_SUPABASE_URL is not configured.')
  }
  return url
}

function getSupabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new SupabaseConfigurationError('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.')
  }
  return key
}

export async function getSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Cookie writes are unavailable while rendering a Server Component.
        }
      },
    },
  })
}

export function getSupabaseAdminClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new SupabaseConfigurationError('SUPABASE_SERVICE_ROLE_KEY is not configured.')
  }

  return createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

type AuthenticatedResult = {
  user: User
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>
  response: null
}

type UnauthenticatedResult = {
  user: null
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>
  response: NextResponse
}

export async function requireAuth(): Promise<AuthenticatedResult | UnauthenticatedResult> {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      supabase,
      response: NextResponse.json({ error: 'Unauthorized access' }, { status: 401 }),
    }
  }

  return { user, supabase, response: null }
}
