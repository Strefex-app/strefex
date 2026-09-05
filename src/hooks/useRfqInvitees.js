import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatMaskedManufacturerLabel } from '../utils/buyerWorkspaceSuppliers'

function supplierLabel(supplier, index, canSeeDetails) {
  if (canSeeDetails) {
    return supplier.display_name || supplier.displayName || supplier.name || supplier.legal_name || 'Supplier'
  }
  return formatMaskedManufacturerLabel(index)
}

/**
 * Invitee selection for Network RFQ create — shortlist / locked / directory / email.
 */
export function useRfqInvitees({
  shortlisted = [],
  initialSupplierIds = [],
  lockedSupplierIds = null,
  hideSupplierPicker = false,
  canSeeDetails = true,
  industryId = '',
  categoryId = '',
  showMarketplaceCatalog = false,
  isSuperAdmin = false,
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(initialSupplierIds || []))
  const [matchedSuppliers, setMatchedSuppliers] = useState([])
  const [manualInvitees, setManualInvitees] = useState([])
  const seededRef = useRef(false)
  const touchedRef = useRef(false)

  useEffect(() => {
    if (lockedSupplierIds?.length) {
      seededRef.current = true
      setSelectedIds((prev) => {
        const next = new Set(lockedSupplierIds)
        // Keep email invites added on top of a locked shortlist
        prev.forEach((id) => {
          if (String(id).startsWith('invite:')) next.add(id)
        })
        return next
      })
      return
    }
    if (initialSupplierIds?.length) {
      seededRef.current = true
      setSelectedIds(new Set(initialSupplierIds))
      return
    }
    // Shortlist rows are available to pick; do not auto-select the whole industry pool.
  }, [shortlisted, initialSupplierIds, lockedSupplierIds])

  // Directory match only when the buyer still needs to pick plants — not on every field edit.
  useEffect(() => {
    if (hideSupplierPicker || lockedSupplierIds?.length || shortlisted?.length) {
      setMatchedSuppliers([])
      return undefined
    }
    if (!industryId) {
      setMatchedSuppliers([])
      return undefined
    }
    let cancelled = false
    ;(async () => {
      const db = await import('../data/supplierDatabase')
      const run = (cat, excludeCatalog) => db.matchSuppliersToRfq({
        industryId,
        categoryId: cat || undefined,
        excludeMarketplaceCatalog: excludeCatalog,
        superadminPlatformView: isSuperAdmin,
      })
      let rows = run(categoryId, !showMarketplaceCatalog)
      if (!rows.length && categoryId) rows = run('', !showMarketplaceCatalog)
      if (!rows.length && !showMarketplaceCatalog) {
        rows = run(categoryId, false)
        if (!rows.length && categoryId) rows = run('', false)
      }
      if (!cancelled) setMatchedSuppliers(rows)
    })()
    return () => { cancelled = true }
  }, [
    industryId,
    categoryId,
    hideSupplierPicker,
    lockedSupplierIds,
    shortlisted,
    showMarketplaceCatalog,
    isSuperAdmin,
  ])

  useEffect(() => {
    if (hideSupplierPicker || lockedSupplierIds?.length || shortlisted?.length) return
    if (touchedRef.current || seededRef.current) return
    if (!matchedSuppliers.length) return
    seededRef.current = true
    setSelectedIds(new Set(matchedSuppliers.slice(0, 5).map((r) => r.id).filter(Boolean)))
  }, [matchedSuppliers, hideSupplierPicker, lockedSupplierIds, shortlisted])

  const supplierRows = useMemo(() => {
    const map = new Map()
    shortlisted.forEach((row, index) => {
      const id = row.supplier_id || row.id
      if (!id) return
      map.set(id, {
        id,
        name: supplierLabel(row, index, canSeeDetails),
        city: row.city || '',
        country: row.country || row.cc || '',
        source: 'shortlist',
      })
    })
    matchedSuppliers.forEach((row, index) => {
      if (map.has(row.id)) return
      map.set(row.id, {
        id: row.id,
        name: canSeeDetails ? row.name : formatMaskedManufacturerLabel(shortlisted.length + index),
        city: row.city || '',
        country: row.country || '',
        source: 'directory',
      })
    })
    manualInvitees.forEach((row) => {
      if (!row?.id || map.has(row.id)) return
      map.set(row.id, {
        id: row.id,
        name: row.name || row.email || row.id,
        email: row.email,
        source: 'invite',
      })
    })
    return [...map.values()]
  }, [shortlisted, matchedSuppliers, manualInvitees, canSeeDetails])

  const toggle = useCallback((id) => {
    touchedRef.current = true
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const remove = useCallback((id) => {
    touchedRef.current = true
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const addEmailInvite = useCallback((name, email) => {
    const cleanEmail = String(email || '').trim().toLowerCase()
    const cleanName = String(name || '').trim() || cleanEmail
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Enter a valid plant email to invite.' }
    }
    const id = `invite:${cleanEmail}`
    if (manualInvitees.some((row) => row.id === id) || selectedIds.has(id)) {
      return { ok: false, error: 'That email is already on the invite list.' }
    }
    touchedRef.current = true
    seededRef.current = true
    const entry = { id, name: cleanName, email: cleanEmail }
    setManualInvitees((prev) => [...prev, entry])
    setSelectedIds((prev) => new Set([...prev, id]))
    return { ok: true }
  }, [manualInvitees, selectedIds])

  const lockedIds = lockedSupplierIds?.length ? lockedSupplierIds : null
  const inviteeIds = (() => {
    if (!lockedIds?.length) return [...selectedIds]
    // Locked shortlist stays; buyer may still add registered plants or email invites.
    return [...new Set([...lockedIds, ...selectedIds])]
  })()
  const hasInvitees = inviteeIds.length > 0

  const selectedRecipients = useMemo(() => {
    const byId = new Map(supplierRows.map((row) => [row.id, row]))
    return inviteeIds.map((id) => byId.get(id)).filter(Boolean)
  }, [supplierRows, inviteeIds])

  return {
    selectedIds,
    selectedRecipients,
    supplierRows,
    manualInvitees,
    lockedIds,
    inviteeIds,
    hasInvitees,
    toggle,
    remove,
    addEmailInvite,
  }
}
