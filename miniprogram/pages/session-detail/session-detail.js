const sessionService = require('../../services/session')
const authService = require('../../services/auth')

Page({
  data: {
    session: null,
    loading: true,
  },

  onLoad(options) {
    if (options.id) {
      this.loadSession(options.id)
    }
  },

  loadSession(id) {
    sessionService.getSession(id).then((session) => {
      this.setData({
        session: {
          ...session,
          price_yuan: (session.price_cents / 100).toFixed(2),
        },
        loading: false,
      })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  onBook() {
    const { session } = this.data
    if (!session || session.spots_left === 0) return

    authService.ensureLoggedIn().then(() => {
      wx.navigateTo({
        url: `/pages/booking/booking?sessionId=${session.id}`,
      })
    })
  },
})
