import { describe, it, expect } from 'vitest'
import { normalizeScanCode, findLotByScan, formatLotLabel } from '../utils/shopFloorScan'

describe('shop-floor scan', () => {
  const lots = [
    { id: '1', lotNumber: 'LOT-100', serialNumber: 'SN-9', materialCert: 'HEAT-1' },
    { id: '2', lotNumber: 'LOT-200', serialNumber: '', materialCert: '' },
  ]

  it('normalizes scan codes', () => {
    expect(normalizeScanCode(' lot-100 ')).toBe('LOT-100')
  })

  it('finds lots by lot number, serial, or material cert', () => {
    expect(findLotByScan(lots, 'lot-100')?.id).toBe('1')
    expect(findLotByScan(lots, 'SN-9')?.id).toBe('1')
    expect(findLotByScan(lots, 'heat-1')?.id).toBe('1')
    expect(findLotByScan(lots, 'missing')).toBeNull()
  })

  it('formats labels with optional serial', () => {
    expect(formatLotLabel(lots[0])).toContain('LOT-100')
    expect(formatLotLabel(lots[0])).toContain('SN-9')
    expect(formatLotLabel(lots[1])).toBe('LOT-200')
  })
})
