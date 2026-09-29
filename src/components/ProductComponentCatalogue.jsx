import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { catalogueGroupsForSubcategory } from '../data/productComponentCatalogue'
import { useProductComponentCatalogueStore } from '../store/productComponentCatalogueStore'
import { useAccountRegistry } from '../store/accountRegistry'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { canRemoveCatalogueItem } from '../utils/productComponentCatalogueItem'
import './ProductComponentCatalogue.css'

export default function ProductComponentCatalogue({
  industryId,
  categoryId,
  subcategoryId,
  subcategoryName,
  color = '#1565c0',
}) {
  const navigate = useNavigate()
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const userId = useAuthStore((s) => s.user?.id)
  const accountType = useSubscriptionStore((s) => s.accountType)
  const canAdd = isSuperAdmin || accountType === 'seller'
  const items = useProductComponentCatalogueStore((s) => s.items)
  const addItem = useProductComponentCatalogueStore((s) => s.addItem)
  const removeItem = useProductComponentCatalogueStore((s) => s.removeItem)
  const hydrateFromCloud = useProductComponentCatalogueStore((s) => s.hydrateFromCloud)
  const getSellersBySubcategory = useAccountRegistry((s) => s.getSellersBySubcategory)

  useEffect(() => {
    void hydrateFromCloud()
  }, [hydrateFromCloud])

  const groups = useMemo(
    () => catalogueGroupsForSubcategory(industryId, categoryId, subcategoryId),
    [industryId, categoryId, subcategoryId],
  )

  const scoped = useMemo(
    () => items.filter((it) => (
      it.industryId === industryId
      && it.categoryId === categoryId
      && it.subcategoryId === subcategoryId
    )),
    [items, industryId, categoryId, subcategoryId],
  )

  const sellers = useMemo(
    () => getSellersBySubcategory(industryId, categoryId, subcategoryId, 'product'),
    [getSellersBySubcategory, industryId, categoryId, subcategoryId],
  )

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '', sku: '', material: '', description: '', unitPrice: '', moq: '', groupId: '',
  })
  const [error, setError] = useState('')

  const onSave = () => {
    setError('')
    const item = addItem({
      ...form,
      industryId,
      categoryId,
      subcategoryId,
      groupId: form.groupId || groups[0]?.id || '',
      unitPrice: form.unitPrice === '' ? null : Number(form.unitPrice),
      moq: form.moq === '' ? null : Number(form.moq),
    })
    if (!item) {
      setError('Name is required.')
      return
    }
    setForm({ name: '', sku: '', material: '', description: '', unitPrice: '', moq: '', groupId: groups[0]?.id || '' })
    setOpen(false)
  }

  return (
    <div className="pcc-wrap">
      <div className="pcc-head">
        <div className="pcc-head-text">
          <h3 className="pcc-title">Catalogue — {subcategoryName}</h3>
          <p className="pcc-sub stx-text-wrap">
            Articles in this part family. Superadmin and sellers add SKUs here; demo listings are not shown.
          </p>
        </div>
        {canAdd && (
          <button type="button" className="pcc-add" style={{ background: color }} onClick={() => setOpen((v) => !v)}>
            {open ? 'Cancel' : 'Add catalogue item'}
          </button>
        )}
      </div>

      {groups.length > 0 && (
        <div className="pcc-groups">
          {groups.map((g) => (
            <span key={g.id} className="pcc-chip">{g.name}</span>
          ))}
        </div>
      )}

      {open && canAdd && (
        <div className="pcc-form">
          {groups.length > 0 && (
            <label className="pcc-label">
              Family
              <select
                value={form.groupId}
                onChange={(e) => setForm((p) => ({ ...p, groupId: e.target.value }))}
              >
                <option value="">This subcategory</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="pcc-label">
            Article name
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Front bumper fascia" />
          </label>
          <div className="pcc-row">
            <label className="pcc-label">
              SKU
              <input value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} />
            </label>
            <label className="pcc-label">
              Material
              <input value={form.material} onChange={(e) => setForm((p) => ({ ...p, material: e.target.value }))} />
            </label>
          </div>
          <div className="pcc-row">
            <label className="pcc-label">
              Unit price
              <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))} />
            </label>
            <label className="pcc-label">
              MOQ
              <input type="number" min="0" value={form.moq} onChange={(e) => setForm((p) => ({ ...p, moq: e.target.value }))} />
            </label>
          </div>
          <label className="pcc-label">
            Description
            <textarea rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </label>
          {error ? <p className="pcc-error">{error}</p> : null}
          <button type="button" className="pcc-save" style={{ background: color }} onClick={onSave}>Save article</button>
        </div>
      )}

      {scoped.length === 0 ? (
        <p className="pcc-empty stx-text-wrap">No catalogue articles yet in this part family.</p>
      ) : (
        <ul className="pcc-list">
          {scoped.map((it) => (
            <li key={it.id} className="pcc-item">
              <div className="pcc-item-main">
                <div className="pcc-item-name stx-text-wrap">{it.name}</div>
                <div className="pcc-item-meta stx-text-wrap">
                  {[it.sku, it.material, it.sellerName].filter(Boolean).join(' · ')}
                  {it.moq != null ? ` · MOQ ${it.moq}` : ''}
                  {it.unitPrice != null && Number.isFinite(it.unitPrice) ? ` · ${it.unitPrice}` : ''}
                </div>
                {it.description ? <p className="pcc-item-desc stx-text-wrap">{it.description}</p> : null}
              </div>
              {canRemoveCatalogueItem(it, { role: isSuperAdmin ? 'superadmin' : '', userId }) && (
                <button type="button" className="pcc-remove" onClick={() => removeItem(it.id)}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="pcc-sellers">
        <h4 className="pcc-sellers-title">Related suppliers</h4>
        {sellers.length === 0 ? (
          <p className="pcc-empty stx-text-wrap">No registered sellers in this part family yet.</p>
        ) : (
          <ul className="pcc-seller-list">
            {sellers.map((s) => (
              <li key={s.id || s.email}>
                <span className="stx-text-wrap">{s.company || s.name || s.email}</span>
                <span className="pcc-seller-loc">{[s.city, s.country].filter(Boolean).join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
        {canAdd && (
          <button
            type="button"
            className="pcc-link"
            onClick={() => {
              const p = new URLSearchParams({
                industry: industryId,
                productCategory: categoryId,
                process: subcategoryId,
                context: 'product',
              })
              navigate(`/add-supplier?${p.toString()}`)
            }}
          >
            Register a seller in this family
          </button>
        )}
      </div>
    </div>
  )
}
