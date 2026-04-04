/**
 * Client-side encryption for messenger payloads stored in tenant localStorage.
 * Inspired by “secret chat” UX: not full network E2E (would need server key exchange),
 * but AES-GCM so raw storage is not plaintext. Key is derived from user id + tenant.
 */
const SALT_PREFIX = 'strefex-msg-crypto-v1'

function encodeUtf8(s) {
  return new TextEncoder().encode(s)
}

function toB64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf
  let s = ''
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function fromB64(b64) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveKeyMaterial(seed) {
  const base = encodeUtf8(`${SALT_PREFIX}|${seed}`)
  const hash = await crypto.subtle.digest('SHA-256', base)
  return crypto.subtle.importKey('raw', hash, { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey'])
}

export async function deriveMessengerCryptoKey(seed) {
  if (!seed || !crypto?.subtle) return null
  const material = await deriveKeyMaterial(seed)
  const salt = encodeUtf8(SALT_PREFIX)
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptText(plain, key) {
  if (!plain || !key) return { cipher: null, iv: null }
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = encodeUtf8(plain)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc)
  return { cipher: toB64(ct), iv: toB64(iv) }
}

export async function decryptText(cipherB64, ivB64, key) {
  if (!cipherB64 || !ivB64 || !key) return ''
  try {
    const iv = fromB64(ivB64)
    const ct = fromB64(cipherB64)
    const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
    return new TextDecoder().decode(buf)
  } catch {
    return '[Unable to decrypt]'
  }
}

export function isWebCryptoAvailable() {
  return typeof crypto !== 'undefined' && !!crypto.subtle
}
