const REG_PREFIX = 'SX-AUD-'
const MAX_LOCAL_CERT_BYTES = 4 * 1024 * 1024

export function normAuditorEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function nextAuditorRegistrationNumber(auditors, year = new Date().getFullYear()) {
  const prefix = `${REG_PREFIX}${year}-`
  let max = 0
  for (const row of auditors || []) {
    const code = String(row?.auditorCode || row?.registrationNo || '').trim().toUpperCase()
    if (!code.startsWith(prefix)) continue
    const n = Number(code.slice(prefix.length))
    if (Number.isFinite(n) && n > max) max = n
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

export function ensureAuditorRegistrationNumbers(auditors) {
  const out = []
  for (const row of auditors || []) {
    if (!row) continue
    const code = String(row.auditorCode || row.registrationNo || '').trim()
    out.push({
      ...row,
      auditorCode: code || nextAuditorRegistrationNumber(out),
    })
  }
  return out
}

export function mergeAuditorLists(existing, incoming) {
  const list = [...(existing || [])]
  const indexByEmail = new Map()
  list.forEach((row, i) => {
    const email = normAuditorEmail(row?.email)
    if (email) indexByEmail.set(email, i)
  })

  for (const row of incoming || []) {
    if (!row) continue
    const email = normAuditorEmail(row.email)
    if (!email) continue
    const idx = indexByEmail.get(email)
    if (idx == null) {
      list.push({ ...row })
      indexByEmail.set(email, list.length - 1)
      continue
    }
    const prev = list[idx]
    list[idx] = {
      ...row,
      ...prev,
      platformProfileId: prev.platformProfileId || row.platformProfileId,
      platformCompanyId: prev.platformCompanyId || row.platformCompanyId,
      source: prev.source && prev.source !== 'supabase_profiles' ? prev.source : (prev.source || row.source),
      auditorCode: prev.auditorCode || prev.registrationNo || row.auditorCode || row.registrationNo,
      certifications: (prev.certifications || []).length ? prev.certifications : (row.certifications || []),
      certificationFiles: (prev.certificationFiles || []).length ? prev.certificationFiles : (row.certificationFiles || []),
    }
  }

  return ensureAuditorRegistrationNumbers(list)
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read the certificate file.'))
    reader.readAsDataURL(file)
  })
}

export async function attachAuditorCertificationFile({ companyId, auditorId, title, file }) {
  if (!file) throw new Error('Attach a certificate file.')
  const label = String(title || '').trim() || file.name.replace(/\.[^.]+$/, '')
  let path = ''
  let dataUrl = ''

  if (companyId) {
    try {
      const { storageService } = await import('../services/supabaseService')
      const uploaded = await storageService.upload({
        companyId,
        entityType: 'auditor-certs',
        entityId: auditorId,
        file,
      })
      path = uploaded?.path || ''
    } catch {
      path = ''
    }
  }

  if (!path) {
    if (file.size > MAX_LOCAL_CERT_BYTES) {
      throw new Error('Certificate is too large to keep locally. Connect the workspace to upload it.')
    }
    dataUrl = await readFileAsDataUrl(file)
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: label,
    fileName: file.name,
    path,
    dataUrl,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    uploadedAt: new Date().toISOString(),
  }
}

export async function openAuditorCertification(file) {
  if (!file) return
  if (file.dataUrl) {
    window.open(file.dataUrl, '_blank', 'noopener,noreferrer')
    return
  }
  if (!file.path) return
  const { storageService } = await import('../services/supabaseService')
  const url = await storageService.getSignedUrl(file.path)
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}
