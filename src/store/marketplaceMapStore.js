import { create } from 'zustand'

const emptyView = () => ({
  locations: [],
  plantLocation: null,
  lanes: null,
  metric: 'risk',
  selectedId: null,
  slot: null,
  showLane: true,
})

export function mapSurfaceFromPath(pathname) {
  if (pathname === '/main-menu') return 'home'
  if (pathname === '/management/people') return 'hr'
  return 'none'
}

const useMarketplaceMapStore = create((set) => ({
  surface: 'none',
  viewports: { home: null, hr: null },
  home: emptyView(),
  sourcing: emptyView(),
  hr: emptyView(),
  setSurface: (surface) => set({ surface: surface || 'none' }),
  setViewportEl: (key, el) => set((s) => ({
    viewports: { ...s.viewports, [key]: el || null },
  })),
  setHomeView: (patch = {}) => set((s) => ({
    home: { ...s.home, ...patch },
  })),
  setSourcingView: (patch = {}) => set((s) => ({
    sourcing: { ...s.sourcing, ...patch },
  })),
  setHrView: (patch = {}) => set((s) => ({
    hr: { ...s.hr, ...patch },
  })),
}))

export default useMarketplaceMapStore
