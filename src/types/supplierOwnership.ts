export type SupplierClaimStatus = 'pending' | 'approved' | 'rejected'
export type SupplierVerificationMethod = 'email_domain' | 'manual' | 'document'
export type SupplierUserRole = 'admin' | 'editor' | 'viewer'
export type SupplierCertificationStatus = 'pending' | 'verified' | 'rejected'

export interface SupplierClaim {
  id: string
  supplier_id: string
  user_id: string
  status: SupplierClaimStatus
  verification_method: SupplierVerificationMethod
  review_note?: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
  created_at: string
}

export interface SupplierProfile {
  supplier_id: string
  description?: string | null
  website?: string | null
  contact_email?: string | null
  phone?: string | null
  profile_completeness: number
  updated_at?: string
  updated_by?: string | null
}

export interface SupplierProduct {
  id: string
  supplier_id: string
  product_name: string
  category?: string | null
  manufacturing_process?: string | null
  material?: string | null
  description?: string | null
  created_at: string
  updated_at: string
}

export interface SupplierCertification {
  id: string
  supplier_id: string
  certification_name: string
  issuing_body?: string | null
  valid_until?: string | null
  status: SupplierCertificationStatus
  created_at: string
  updated_at?: string
}

export interface SupplierChangeLog {
  id: string
  table_name: string
  record_id: string
  supplier_id?: string | null
  field_name: string
  old_value?: string | null
  new_value?: string | null
  changed_by?: string | null
  created_at: string
}
