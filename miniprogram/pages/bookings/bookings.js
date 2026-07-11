const bookingService = require('../../services/booking')
const authService = require('../../services/auth')
const { statusLabel, statusClass } = require('../../utils/util')

Page({
  data: {
    bookings: [],
    loading: true,
  },

  onShow() {
    authService.ensureLoggedIn().then(() => {
      this.loadBookings()
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  loadBookings() {
    bookingService.listBookings().then((res) => {
      const bookings = (res.items || []).map((b) => ({
        ...b,
        amount_yuan: (b.amount_cents / 100).toFixed(2),
        status_label: statusLabel(b.status),
        status_class: statusClass(b.status),
      }))
      this.setData({ bookings, loading: false })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  onPay(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/payment/payment?bookingId=${id}` })
  },

  onViewSchedule() {
    wx.switchTab({ url: '/pages/schedule/schedule' })
  },

  onCancel(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: 'Cancel booking',
      content: 'Are you sure you want to cancel this booking?',
      success: (res) => {
        if (res.confirm) {
          bookingService.cancelBooking(id).then(() => {
            wx.showToast({ title: 'Cancelled', icon: 'success' })
            this.loadBookings()
          })
        }
      },
    })
  },
})
