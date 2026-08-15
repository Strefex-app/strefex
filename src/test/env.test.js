import { describe, expect, it } from 'vitest'
import env from '../config/env'

describe('env', () => {
  it('exports IS_PROD as the Vite production flag', () => {
    expect(typeof env.IS_PROD).toBe('boolean')
    expect(env.IS_PROD).toBe(Boolean(import.meta.env.PROD))
    expect(env.IS_DEV).toBe(Boolean(import.meta.env.DEV))
    expect(env.IS_PROD).toBe(!env.IS_DEV)
  })
})
