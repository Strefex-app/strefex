import { describe, it, expect, beforeEach } from 'vitest'
import useWorkspaceModeStore, {
  WORKSPACE_MODES,
  defaultModeForAccount,
  availableWorkspaceModes,
} from '../store/workspaceModeStore'

describe('Workspace mode', () => {
  beforeEach(() => {
    useWorkspaceModeStore.setState({ mode: null })
  })

  it('defaults buyers to marketplace and manufacturers to company', () => {
    expect(defaultModeForAccount('buyer')).toBe('marketplace')
    expect(defaultModeForAccount('seller')).toBe('company')
    expect(defaultModeForAccount('service_provider')).toBe('company')
  })

  it('hides marketplace for service-provider-only accounts', () => {
    expect(availableWorkspaceModes(['service_provider'])).toEqual(['company'])
    expect(availableWorkspaceModes(['buyer'])).toEqual(['marketplace', 'company'])
    expect(availableWorkspaceModes(['seller'])).toEqual(['marketplace', 'company'])
  })

  it('labels marketplace mode as Network', () => {
    expect(WORKSPACE_MODES.find((item) => item.id === 'marketplace')?.label).toBe('Network')
    expect(WORKSPACE_MODES.find((item) => item.id === 'company')?.label).toBe('Company')
  })

  it('remembers an explicit mode', () => {
    useWorkspaceModeStore.getState().setMode('marketplace')
    expect(useWorkspaceModeStore.getState().resolveMode('seller')).toBe('marketplace')
    useWorkspaceModeStore.getState().setMode('company')
    expect(useWorkspaceModeStore.getState().resolveMode('buyer')).toBe('company')
  })
})
