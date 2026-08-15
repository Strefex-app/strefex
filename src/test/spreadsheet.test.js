import { describe, expect, it } from 'vitest'
import { readSpreadsheetFirstSheet } from '../utils/spreadsheet'

describe('readSpreadsheetFirstSheet', () => {
  it('rejects files larger than 5 MB before parsing', async () => {
    const buf = new ArrayBuffer(5 * 1024 * 1024 + 1)
    await expect(readSpreadsheetFirstSheet(buf)).rejects.toThrow(/too large/)
  })
})
