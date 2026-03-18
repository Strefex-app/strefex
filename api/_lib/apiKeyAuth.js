import crypto from 'node:crypto'
import { supabaseAdmin } from './platformApi.js'

export function hashApiKey(rawKey) {
  return crypto.createHash('sha256').update(String(rawKey || '')).digest('hex')
}

// Phase-2 scaffold: optional API-key auth. Not globally enforced by default.
export async function resolveApiKeyContext(req) {
  const raw = req.headers['x-api-key'] || ''
  if (!raw || !supabaseAdmin) return null
  const keyHash = hashApiKey(raw)
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('status', 'active')
    .maybeSingle()
  if (error || !data) return null
  return data
}
