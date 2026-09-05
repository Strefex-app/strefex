import { isSupabaseConfigured } from '../config/supabase'
import { storageService } from '../services/supabaseService'
import { getTenantId } from './tenantStorage'

export const PLANT_DOCUMENTS_BUCKET = 'documents'

/** UX status for the plant documents storage bucket. */
export function plantStorageStatus() {
  const companyId = getTenantId()
  const hasCompany = Boolean(companyId && companyId !== 'guest')
  const ready = Boolean(isSupabaseConfigured && hasCompany)
  let label = 'Local metadata only — connect Supabase to store binaries in the documents bucket'
  if (isSupabaseConfigured && !hasCompany) {
    label = 'Sign in to a company account to store files in the documents bucket'
  } else if (ready) {
    label = 'Cloud documents bucket connected'
  }
  return {
    bucket: PLANT_DOCUMENTS_BUCKET,
    configured: Boolean(isSupabaseConfigured),
    hasCompany,
    ready,
    label,
  }
}

/**
 * Attach a controlled copy (WI, certificate PDF) to the plant documents bucket.
 * Path: {companyId}/{space}/{folderPath}/{entityType}/{entityId}/{timestamp}_{filename}
 * Legacy path when no folder: {companyId}/{entityType}/{entityId}/{timestamp}_{filename}
 */
export async function attachPlantFile({
  entityType,
  entityId,
  file,
  space = 'plant-qms',
  folderStoragePath = '',
}) {
  if (!file) throw new Error('Choose a file')
  const companyId = getTenantId()
  const meta = {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    uploadedAt: new Date().toISOString(),
    storagePath: '',
    cloud: false,
    bucket: PLANT_DOCUMENTS_BUCKET,
    space,
    folderStoragePath,
  }
  if (!isSupabaseConfigured || !companyId || companyId === 'guest') {
    return meta
  }
  const entityPath = folderStoragePath
    ? `${space}/${folderStoragePath}/${entityType}/${entityId || 'general'}`
    : `${entityType}/${entityId || 'general'}`
  const data = await storageService.upload({
    companyId,
    entityType: entityPath,
    entityId: entityId || 'general',
    file,
    bucket: PLANT_DOCUMENTS_BUCKET,
  })
  return {
    ...meta,
    storagePath: data?.path || '',
    cloud: Boolean(data?.path),
  }
}

export async function openPlantFile(storagePath) {
  if (!storagePath) return null
  return storageService.getSignedUrl(storagePath, 3600, PLANT_DOCUMENTS_BUCKET)
}
