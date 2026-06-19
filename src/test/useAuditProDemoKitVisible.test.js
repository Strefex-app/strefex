import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuditProDemoKitVisible } from '../hooks/useAuditProDemoKitVisible'
import { useAuthStore } from '../store/authStore'
import { useAuditProDemoKitStore } from '../store/auditProDemoKitStore'

describe('useAuditProDemoKitVisible', () => {
  it('is false for non-superadmin even when demo kit toggled on', () => {
    useAuthStore.setState({ role: 'admin' })
    useAuditProDemoKitStore.setState({ demoKitVisible: true })
    const { result } = renderHook(() => useAuditProDemoKitVisible())
    expect(result.current).toBe(false)
  })

  it('is true only for superadmin with demo kit enabled', () => {
    useAuthStore.setState({ role: 'superadmin' })
    useAuditProDemoKitStore.setState({ demoKitVisible: true })
    const { result } = renderHook(() => useAuditProDemoKitVisible())
    expect(result.current).toBe(true)
  })

  it('is false for superadmin when demo kit is off', () => {
    useAuthStore.setState({ role: 'superadmin' })
    useAuditProDemoKitStore.setState({ demoKitVisible: false })
    const { result } = renderHook(() => useAuditProDemoKitVisible())
    expect(result.current).toBe(false)
  })
})
