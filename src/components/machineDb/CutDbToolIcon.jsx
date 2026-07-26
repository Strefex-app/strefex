import { useMemo } from 'react'
import { renderCutDbToolSvg } from '../../utils/cutDbToolIcons'

/** SVG illustration for a CutDB tool (by tool id / type / subtype). */
export default function CutDbToolIcon({ tool, width = 100, height = 72 }) {
  const markup = useMemo(() => renderCutDbToolSvg(tool, width, height), [tool, width, height])

  return (
    <div
      className="stx-cutdb-tool-icon"
      aria-hidden
      // SVG strings are generated locally from trusted seed data — not user input.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
