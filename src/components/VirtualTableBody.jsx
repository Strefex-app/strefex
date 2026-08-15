import { useState } from 'react'

const VIRTUALIZE_AFTER = 100

/**
 * Window a long list. Short lists return the full array.
 */
export function useVirtualWindow(items, { rowHeight = 44, height = 520, overscan = 8 } = {}) {
  const [scrollTop, setScrollTop] = useState(0)
  const list = Array.isArray(items) ? items : []
  if (list.length <= VIRTUALIZE_AFTER) {
    return {
      items: list,
      topPad: 0,
      bottomPad: 0,
      onScroll: undefined,
      enabled: false,
      height,
    }
  }
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const visibleCount = Math.ceil(height / rowHeight) + overscan * 2
  const end = Math.min(list.length, start + visibleCount)
  return {
    items: list.slice(start, end),
    topPad: start * rowHeight,
    bottomPad: Math.max(0, (list.length - end) * rowHeight),
    onScroll: (e) => setScrollTop(e.currentTarget.scrollTop),
    enabled: true,
    height,
  }
}
