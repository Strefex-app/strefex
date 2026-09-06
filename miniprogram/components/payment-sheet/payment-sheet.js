const { payWithWeChat, payWithAlipay } = require('../../utils/payment')

Component({
  properties: {
    bookingId: {
      type: String,
      value: '',
    },
    amountYuan: {
      type: String,
      value: '0.00',
    },
    visible: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    selected: 'wechat',
  },

  methods: {
    onSelect(e) {
      this.setData({ selected: e.currentTarget.dataset.method })
    },

    onClose() {
      this.triggerEvent('close')
    },

    onPay() {
      const { bookingId, selected } = this.data
      const payFn = selected === 'alipay' ? payWithAlipay : payWithWeChat

      payFn(bookingId)
        .then(() => {
          this.triggerEvent('success')
        })
        .catch((err) => {
          if (err && err.errMsg && err.errMsg.includes('cancel')) {
            wx.showToast({ title: 'Payment cancelled', icon: 'none' })
          }
        })
    },
  },
})
