import { ToggleCheckButton } from './ToggleCheckButton'
import './CategorySubcategoryChecklist.css'

/**
 * Nested category → subcategory multi-check UI for manufacturers.
 * Selecting a parent reveals subcategory checkmarks so shops can combine
 * e.g. molds + checking fixtures + die making under the same family.
 *
 * @param {{ id: string, name: string, description?: string, subcategories?: { id: string, name: string, description?: string }[] }[]} categories
 * @param {Record<string, string[]>} selectedSubs
 * @param {(next: Record<string, string[]>) => void} onChange
 */
export default function CategorySubcategoryChecklist({
  categories = [],
  selectedSubs = {},
  onChange,
  disabled = false,
  emptyLabel = 'No categories for this industry yet.',
}) {
  const setParent = (catId, checked, subOptions) => {
    const next = { ...selectedSubs }
    if (!checked) {
      delete next[catId]
    } else {
      // Empty list = parent open, awaiting subcategory picks when options exist.
      // Sentinel '*' = whole category when there are no subcategory options.
      next[catId] = subOptions.length ? [] : ['*']
    }
    onChange(next)
  }

  const setSub = (catId, subId, checked) => {
    const prev = Array.isArray(selectedSubs[catId]) ? selectedSubs[catId] : []
    const withoutSentinel = prev.filter((id) => id !== '*' && id !== '__all__')
    const list = checked
      ? [...new Set([...withoutSentinel, subId])]
      : withoutSentinel.filter((id) => id !== subId)
    const next = { ...selectedSubs }
    if (list.length === 0) next[catId] = []
    else next[catId] = list
    onChange(next)
  }

  if (!categories.length) {
    return <p className="csc-empty">{emptyLabel}</p>
  }

  return (
    <div className="csc-list">
      {categories.map((cat) => {
        const subs = Array.isArray(cat.subcategories) ? cat.subcategories : []
        const selected = Array.isArray(selectedSubs[cat.id]) ? selectedSubs[cat.id] : []
        const parentOn = Object.prototype.hasOwnProperty.call(selectedSubs, cat.id)
        const selectedReal = selected.filter((id) => id !== '*' && id !== '__all__')
        return (
          <div key={cat.id} className={`csc-family${parentOn ? ' csc-family--on' : ''}`}>
            <ToggleCheckButton
              checked={parentOn}
              disabled={disabled}
              className="csc-parent"
              onChange={(checked) => setParent(cat.id, checked, subs)}
            >
              <span className="csc-title">{cat.name}</span>
              {cat.description ? <span className="csc-desc">{cat.description}</span> : null}
            </ToggleCheckButton>
            {parentOn && subs.length > 0 && (
              <div className="csc-subs" role="group" aria-label={`${cat.name} subcategories`}>
                <p className="csc-subs-hint">Select one or more subcategories (combinations allowed):</p>
                {subs.map((sub) => (
                  <ToggleCheckButton
                    key={sub.id}
                    checked={selectedReal.includes(sub.id)}
                    disabled={disabled}
                    className="csc-sub"
                    onChange={(checked) => setSub(cat.id, sub.id, checked)}
                  >
                    <span className="csc-title">{sub.name}</span>
                    {sub.description ? <span className="csc-desc">{sub.description}</span> : null}
                  </ToggleCheckButton>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Whether every opened parent with subcategory options has ≥1 subcategory checked. */
export function subMapIsComplete(selectedSubs, categories) {
  const byId = new Map((categories || []).map((c) => [c.id, c]))
  const entries = Object.entries(selectedSubs || {})
  if (!entries.length) return false
  for (const [catId, list] of entries) {
    const cat = byId.get(catId)
    const subs = cat?.subcategories || []
    const real = (Array.isArray(list) ? list : []).filter((id) => id && id !== '*' && id !== '__all__')
    if (subs.length > 0 && real.length === 0) return false
    if (subs.length === 0 && !(Array.isArray(list) && list.length > 0)) return false
  }
  return true
}

/**
 * Normalize selection map for persistence.
 * @returns {{ parents: string[], subs: Record<string, string[]> }}
 */
export function sanitizeSubMap(selectedSubs) {
  const parents = []
  const subs = {}
  for (const [catId, list] of Object.entries(selectedSubs || {})) {
    const real = (Array.isArray(list) ? list : []).filter((id) => id && id !== '*' && id !== '__all__')
    parents.push(catId)
    if (real.length) subs[catId] = real
  }
  return { parents, subs }
}
