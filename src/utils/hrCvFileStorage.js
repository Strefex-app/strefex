/**
 * HR CV binary storage — IndexedDB (local browser).
 * Zustand only keeps `cvStoredFileId` + `cvMimeType`; blobs live here so large PDFs
 * do not blow localStorage quotas.
 *
 * @typedef {Object} HrCvStoredRecord
 * @property {string} id
 * @property {string} mimeType
 * @property {ArrayBuffer} data
 */

const DB_NAME = 'strefex-hr-cv-files'
const DB_VERSION = 1
const STORE = 'files'

/** @type {number} */
export const HR_CV_MAX_FILE_BYTES = 12 * 1024 * 1024

let _dbPromise = null

function openDb() {
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
  })
  return _dbPromise
}

/**
 * @param {string} id
 * @param {Blob} blob
 * @param {string} mimeType
 */
export async function putCvFile(id, blob, mimeType) {
  if (!id || !blob) return
  const db = await openDb()
  const data = await blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).put({ id, mimeType: mimeType || blob.type || 'application/octet-stream', data })
  })
}

/**
 * @param {File} file
 * @returns {Promise<{ id: string, mimeType: string } | null>}
 */
export async function storeCvFileFromUpload(file) {
  if (!file || file.size > HR_CV_MAX_FILE_BYTES) return null
  const id = `cv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  let mimeType = file.type || 'application/octet-stream'
  const lower = (file.name || '').toLowerCase()
  if ((!mimeType || mimeType === 'application/octet-stream') && lower.endsWith('.pdf')) {
    mimeType = 'application/pdf'
  }
  if ((!mimeType || mimeType === 'application/octet-stream') && lower.endsWith('.txt')) {
    mimeType = 'text/plain'
  }
  await putCvFile(id, file, mimeType)
  return { id, mimeType }
}

/** @param {string} id @returns {Promise<Blob | null>} */
export async function getCvBlob(id) {
  if (!id) return null
  try {
    const db = await openDb()
    const row = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      tx.onerror = () => reject(tx.error)
      const r = tx.objectStore(STORE).get(id)
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
    if (!row?.data) return null
    return new Blob([row.data], { type: row.mimeType || 'application/octet-stream' })
  } catch {
    return null
  }
}

/** @param {string} id */
export async function deleteCvFile(id) {
  if (!id) return
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.objectStore(STORE).delete(id)
    })
  } catch {
    /* ignore */
  }
}

/**
 * Copy stored file to a new id (e.g. talent pool keeps a copy if candidate is deleted).
 * @param {string} fromId
 * @param {string} toId
 */
export async function cloneCvFile(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return
  const blob = await getCvBlob(fromId)
  if (!blob) return
  await putCvFile(toId, blob, blob.type)
}

/**
 * Stable MIME for in-app preview (iframe / img). Fixes empty type and octet-stream using file name + %PDF sniff.
 * @param {Blob} blob
 * @param {string} [declaredMime]
 * @param {string} [fileName]
 * @returns {Promise<string>}
 */
export async function resolveCvPreviewMime(blob, declaredMime, fileName) {
  const name = String(fileName || '').toLowerCase()
  let t = String(declaredMime || '').trim() || blob.type || ''

  if (name.endsWith('.pdf')) t = 'application/pdf'
  else if (name.endsWith('.txt')) t = 'text/plain'
  else if (/\.png$/i.test(name)) t = t.startsWith('image/') ? t : 'image/png'
  else if (/\.jpe?g$/i.test(name)) t = t.startsWith('image/') ? t : 'image/jpeg'
  else if (/\.gif$/i.test(name)) t = t.startsWith('image/') ? t : 'image/gif'
  else if (/\.webp$/i.test(name)) t = t.startsWith('image/') ? t : 'image/webp'

  if ((!t || t === 'application/octet-stream') && blob.size >= 5) {
    try {
      const head = new Uint8Array(await blob.slice(0, 5).arrayBuffer())
      const sig = String.fromCharCode(...head)
      if (sig.startsWith('%PDF')) return 'application/pdf'
    } catch {
      /* ignore */
    }
  }

  return t || 'application/octet-stream'
}
