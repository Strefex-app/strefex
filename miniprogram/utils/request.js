const { API_BASE_URL } = require('../config/index')

function getToken() {
  const app = getApp()
  return app.globalData.token || wx.getStorageSync('token') || ''
}

function request(options) {
  const { url, method = 'GET', data, header = {}, showLoading = true } = options

  if (showLoading) {
    wx.showLoading({ title: 'Loading...', mask: true })
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        Authorization: getToken() ? `Bearer ${getToken()}` : '',
        ...header,
      },
      success(res) {
        if (showLoading) wx.hideLoading()
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          const message = (res.data && res.data.detail) || 'Request failed'
          wx.showToast({ title: String(message).slice(0, 20), icon: 'none' })
          reject(res.data || { detail: message })
        }
      },
      fail(err) {
        if (showLoading) wx.hideLoading()
        wx.showToast({ title: 'Network error', icon: 'none' })
        reject(err)
      },
    })
  })
}

module.exports = { request, getToken }
