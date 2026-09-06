const sessionService = require('../../services/session')
const bookingService = require('../../services/booking')
const authService = require('../../services/auth')

Page({
  data: {
    session: null,
    notes: '',
    submitting: false,
  },

  onLoad(options) {
    authService.ensureLoggedIn()
    if (options.sessionId) {
      sessionService.getSession(options.sessionId).then((session) => {
        this.setData({
          session: {
            ...session,
            price_yuan: (session.price_cents / 100).toFixed(2),
          },
        })
      })
    }
  },

  onNotesInput(e) {
    this.setData({ notes: e.detail.value })
  },

  onConfirm() {
    if (this.data.submitting || !this.data.session) return
    this.setData({ submitting: true })

    bookingService
      .createBooking(this.data.session.id, this.data.notes)
      .then((booking) => {
        wx.redirectTo({
          url: `/pages/payment/payment?bookingId=${booking.id}`,
        })
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  },
})
