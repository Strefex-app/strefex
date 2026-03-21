import { describe, it, expect, vi } from 'vitest'
import { removeStoragePathsBestEffort } from '../utils/storageCleanup'

describe('removeStoragePathsBestEffort', () => {
  it('calls remove for each path', async () => {
    const remove = vi.fn().mockResolvedValue(undefined)
    await removeStoragePathsBestEffort(['a', 'b'], remove)
    expect(remove).toHaveBeenCalledTimes(2)
    expect(remove).toHaveBeenCalledWith('a')
    expect(remove).toHaveBeenCalledWith('b')
  })

  it('continues after a failed remove', async () => {
    const remove = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(undefined)
    await removeStoragePathsBestEffort(['x', 'y', 'z'], remove)
    expect(remove).toHaveBeenCalledTimes(3)
  })

  it('no-ops on empty or invalid input', async () => {
    const remove = vi.fn()
    await removeStoragePathsBestEffort([], remove)
    await removeStoragePathsBestEffort(null, remove)
    await removeStoragePathsBestEffort(['p'], null)
    expect(remove).not.toHaveBeenCalled()
  })
})
