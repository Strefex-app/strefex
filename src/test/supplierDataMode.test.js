import { describe, expect, it } from 'vitest'
import {
  isLocalhostTestingHost,
  isSeededSupplierDirectoryEnabled,
  isSourcingDemoSeedAllowed,
} from '../config/supplierDataMode'

describe('supplierDataMode / sourcing demo seed gate', () => {
  it('never treats hosts as localhost demo for sourcing', () => {
    expect(isLocalhostTestingHost('localhost')).toBe(false)
    expect(isLocalhostTestingHost('127.0.0.1')).toBe(false)
    expect(isLocalhostTestingHost('strefex.app')).toBe(false)
  })

  it('never allows sourcing canvas demo seed', () => {
    expect(isSourcingDemoSeedAllowed({
      env: { DEV: false },
      hostname: 'strefex.app',
      showMarketplaceCatalog: false,
    })).toBe(false)

    expect(isSourcingDemoSeedAllowed({
      env: { DEV: true },
      hostname: 'strefex.app',
    })).toBe(false)

    expect(isSourcingDemoSeedAllowed({
      env: { DEV: false },
      hostname: 'localhost',
    })).toBe(false)

    expect(isSourcingDemoSeedAllowed({
      env: { DEV: false, VITE_SEED_SUPPLIER_DIRECTORY: 'true' },
      hostname: 'strefex.app',
    })).toBe(false)

    expect(isSourcingDemoSeedAllowed({
      env: { DEV: false },
      hostname: 'strefex.app',
      showMarketplaceCatalog: true,
    })).toBe(false)
  })

  it('reads VITE_SEED_SUPPLIER_DIRECTORY for non-sourcing directory surfaces', () => {
    expect(isSeededSupplierDirectoryEnabled({ VITE_SEED_SUPPLIER_DIRECTORY: 'true' })).toBe(true)
    expect(isSeededSupplierDirectoryEnabled({ VITE_SEED_SUPPLIER_DIRECTORY: 'false' })).toBe(false)
  })
})
