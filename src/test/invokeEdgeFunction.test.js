import { describe, expect, it } from 'vitest'
import { isEdgeFunctionUnreachable } from '../utils/invokeEdgeFunction'

describe('invokeEdgeFunction', () => {
  it('recognises the browser CORS / missing-function error', () => {
    expect(isEdgeFunctionUnreachable('Failed to send a request to the Edge Function')).toBe(true)
    expect(isEdgeFunctionUnreachable(new Error('Failed to fetch'))).toBe(true)
    expect(isEdgeFunctionUnreachable('Only company admins can send login invites')).toBe(false)
  })
})
