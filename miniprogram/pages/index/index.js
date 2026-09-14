const sessionService = require('../../services/session')
const { formatDate } = require('../../utils/util')

Page({
  data: {
    featured: [],
    upcoming: [],
    categories: [
      { id: 'skills', label: 'Skills', icon: '⚽' },
      { id: 'fitness', label: 'Fitness', icon: '🏃' },
      { id: 'tactics', label: 'Tactics', icon: '📋' },
      { id: 'youth', label: 'Youth', icon: '🌟' },
    ],
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    sessionService.listSessions({ limit: 6 }).then((res) => {
      const sessions = (res.items || []).map((s) => ({
        ...s,
        price_yuan: (s.price_cents / 100).toFixed(2),
      }))
      this.setData({
        featured: sessions.slice(0, 3),
        upcoming: sessions.slice(0, 5),
      })
    })
  },

  onCategoryTap(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/sessions/sessions?category=${id}` })
  },

  onViewSchedule() {
    wx.switchTab({ url: '/pages/schedule/schedule' })
  },

  onViewAll() {
    wx.navigateTo({ url: '/pages/sessions/sessions' })
  },
})
