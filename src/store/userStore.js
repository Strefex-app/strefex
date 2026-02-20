import { create } from 'zustand'

export const useUserStore = create((set) => ({
  user: {
    name: 'John Doe',
    companyName: 'STREFEX Industries',
    email: 'john.doe@strefex.com',
    phone: '+1 (555) 123-4567',
    companyAddress: '123 Industrial Boulevard, Suite 100, New York, NY 10001',
  },
  updateUser: (userData) => set((state) => ({ user: { ...state.user, ...userData } })),
}))
