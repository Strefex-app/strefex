/**
 * Shop-floor entry: Enter records the current value and moves to the next field.
 */
export function handleEnterAdvance(event, { container, onLast } = {}) {
  if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return
  const tag = event.target.tagName
  if (tag !== 'INPUT' && tag !== 'SELECT') return
  if (event.target.tagName === 'TEXTAREA' || event.target.type === 'textarea') return
  event.preventDefault()
  event.stopPropagation()

  const nodes = listEntryFields(container)
  const index = nodes.indexOf(event.target)
  const next = index >= 0 ? nodes[index + 1] : null
  if (next) {
    focusEntry(next)
    return
  }
  onLast?.()
}

export function listEntryFields(container) {
  if (!container) return []
  return [...container.querySelectorAll('input:not([disabled]), select:not([disabled])')]
    .filter((el) => el.type !== 'file' && el.type !== 'hidden' && el.type !== 'checkbox' && el.type !== 'radio')
}

export function focusEntry(el) {
  if (!el) return
  el.focus()
  if (typeof el.select === 'function' && el.tagName === 'INPUT') {
    try { el.select() } catch { /* ignore */ }
  }
}

export function focusNewRowFirstField(container, columnCount) {
  const nodes = listEntryFields(container)
  if (!nodes.length) return
  const cols = Math.max(1, columnCount || 1)
  focusEntry(nodes[Math.max(0, nodes.length - cols)])
}
