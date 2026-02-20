/**
 * Vitest global test setup.
 * Configures jsdom, mocks browser APIs, and extends matchers.
 */
import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (i) => Object.keys(store)[i] || null,
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock matchMedia
window.matchMedia = window.matchMedia || function () {
  return { matches: false, addListener: () => {}, removeListener: () => {} }
}
