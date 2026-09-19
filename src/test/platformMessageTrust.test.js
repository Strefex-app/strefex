import { describe, expect, it } from 'vitest'
import { isSameOriginMessage, isTrustedIframeMessage } from '../utils/platformMessageTrust'

describe('platformMessageTrust', () => {
  it('rejects a foreign origin', () => {
    const origin = window.location.origin
    expect(isSameOriginMessage({ origin: 'https://evil.example' })).toBe(false)
    expect(isSameOriginMessage({ origin })).toBe(true)
  })

  it('rejects a message that did not come from the sourcing iframe window', () => {
    const iframeWindow = {}
    const other = {}
    expect(isTrustedIframeMessage({ origin: window.location.origin, source: other }, iframeWindow)).toBe(false)
    expect(isTrustedIframeMessage({ origin: window.location.origin, source: iframeWindow }, iframeWindow)).toBe(true)
  })
})
