import { create } from 'zustand'

export const useSupplierStore = create((set) => ({
  submissions: [],
  addSubmission: (submission) => {
    const newSubmission = {
      id: Date.now().toString(),
      ...submission,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    set((state) => ({
      submissions: [newSubmission, ...state.submissions],
    }))
    return newSubmission
  },
  updateSubmissionStatus: (id, status) => {
    set((state) => ({
      submissions: state.submissions.map((sub) =>
        sub.id === id
          ? { ...sub, status, updatedAt: new Date().toISOString() }
          : sub
      ),
    }))
  },
  getSubmissionById: (id) => {
    return useSupplierStore.getState().submissions.find((sub) => sub.id === id)
  },
}))
