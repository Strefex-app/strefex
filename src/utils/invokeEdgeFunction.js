import { supabase, isSupabaseConfigured } from '../config/supabase'
import env from '../config/env'

const CORS_HINT =
  'authorization, x-client-info, apikey, content-type, x-supabase-api-version'

export function isEdgeFunctionUnreachable(error) {
  const msg = String(error?.message || error || '').toLowerCase()
  return (
    msg.includes('failed to send a request to the edge function')
    || msg.includes('failed to fetch')
    || msg.includes('networkerror')
    || msg.includes('load failed')
    || msg.includes('cors')
    || msg.includes('functionsrelayerror')
    || msg.includes('not deployed')
    || msg.includes('could not reach the invite mail service')
  )
}

/**
 * Call a Supabase Edge Function with the current session.
 * Uses fetch instead of functions.invoke so extra client headers cannot
 * fail CORS preflight (x-supabase-api-version).
 */
export async function invokeEdgeFunction(name, body = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Cloud is not configured.')
  }

  try {
    await supabase.auth.refreshSession()
  } catch { /* use existing session */ }

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) {
    throw new Error('Sign in again, then retry sending the email.')
  }

  const base = String(env.SUPABASE_URL || '').replace(/\/$/, '')
  const url = `${base}/functions/v1/${encodeURIComponent(name)}`
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new Error(
      `Could not reach the invite mail service (${err?.message || 'network'}). Deploy invite-auth-user and allow headers: ${CORS_HINT}.`,
    )
  }

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (res.status === 404) {
    throw new Error('Invite mail service is not deployed (invite-auth-user).')
  }
  if (!res.ok) {
    throw new Error(String(data?.error || data?.message || text || `HTTP ${res.status}`))
  }
  return data
}
