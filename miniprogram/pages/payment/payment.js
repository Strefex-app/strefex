const bookingService = require('../../services/booking')

Page({
  data: {
    booking: null,
    showPayment: false,
  },

  onLoad(options) {
    if (options.bookingId) {
      bookingService.getBooking(options.bookingId).then((booking) => {
        this.setData({
          booking: {
            ...booking,
            amount_yuan: (booking.amount_cents / 100).toFixed(2),
          },
          showPayment: booking.status === 'pending_payment',
        })
      })
    }
  },

  onOpenPayment() {
    this.setData({ showPayment: true })
  },

  onClosePayment() {
    this.setData({ showPayment: false })
  },

  onPaymentSuccess() {
    wx.showToast({ title: 'Payment successful', icon: 'success' })
    setTimeout(() => {
      wx.switchTab({ url: '/pages/bookings/bookings' })
    }, 1500)
  },
})
