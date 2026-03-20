/**
 * Account directory — tenant-scoped contacts; superadmin cross-tenant + extract RPC.
 */
import { supabase, isSupabaseConfigured } from '../config/supabase'
import { accountDirectoryEntriesService } from './supabaseService'

export async function extractDirectoryFromPlatform() {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.rpc('extract_account_directory_from_platform')
  if (error) throw error
  return data
}

export async function listAccountDirectoryEntries(companyId, options = {}) {
  return accountDirectoryEntriesService.list(companyId, options)
}

export async function createAccountDirectoryEntry(payload) {
  return accountDirectoryEntriesService.create(payload)
}

export async function updateAccountDirectoryEntry(id, updates) {
  return accountDirectoryEntriesService.update(id, updates)
}

export async function removeAccountDirectoryEntry(id) {
  return accountDirectoryEntriesService.remove(id)
}
