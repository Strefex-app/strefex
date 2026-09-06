const { request } = require('./request')

/**
 * Invoke WeChat Pay via wx.requestPayment after backend unified order.
 */
function payWithWeChat(bookingId) {
  return request({
    url: '/payments/wechat',
    method: 'POST',
    data: { booking_id: bookingId },
  }).then((order) => {
    return new Promise((resolve, reject) => {
      if (order.mock) {
        wx.showModal({
          title: 'Dev mode',
          content: 'WeChat Pay simulated. Confirm to mark booking paid.',
          success(res) {
            if (res.confirm) {
              return request({
                url: '/payments/mock-confirm',
                method: 'POST',
                data: { booking_id: bookingId, provider: 'wechat' },
              }).then(resolve).catch(reject)
            }
            reject(new Error('Payment cancelled'))
          },
        })
        return
      }

      wx.requestPayment({
        timeStamp: order.timeStamp,
        nonceStr: order.nonceStr,
        package: order.package,
        signType: order.signType || 'RSA',
        paySign: order.paySign,
        success: resolve,
        fail: reject,
      })
    })
  })
}

/**
 * Alipay in mini program: backend returns order string; open via my.tradePay (Alipay mini)
 * or copy link / QR for H5. We use backend H5 pay URL opened in web-view or external browser.
 */
function payWithAlipay(bookingId) {
  return request({
    url: '/payments/alipay',
    method: 'POST',
    data: { booking_id: bookingId },
  }).then((order) => {
    return new Promise((resolve, reject) => {
      if (order.mock) {
        wx.showModal({
          title: 'Dev mode',
          content: 'Alipay simulated. Confirm to mark booking paid.',
          success(res) {
            if (res.confirm) {
              return request({
                url: '/payments/mock-confirm',
                method: 'POST',
                data: { booking_id: bookingId, provider: 'alipay' },
              }).then(resolve).catch(reject)
            }
            reject(new Error('Payment cancelled'))
          },
        })
        return
      }

      if (order.pay_url) {
        wx.setClipboardData({
          data: order.pay_url,
          success() {
            wx.showModal({
              title: 'Alipay',
              content: 'Payment link copied. Open in browser to complete payment, then return here.',
              showCancel: false,
              success: () => resolve(order),
            })
          },
          fail: reject,
        })
        return
      }

      reject(new Error('Alipay order missing pay_url'))
    })
  })
}

module.exports = { payWithWeChat, payWithAlipay }
