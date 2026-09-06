const { request } = require('../utils/request')

function wechatLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(loginRes) {
        if (!loginRes.code) {
          reject(new Error('wx.login failed'))
          return
        }
        request({
          url: '/auth/wechat-login',
          method: 'POST',
          data: { code: loginRes.code },
        })
          .then((data) => {
            const app = getApp()
            app.setAuth(data.access_token, data.user)
            resolve(data)
          })
          .catch(reject)
      },
      fail: reject,
    })
  })
}

function ensureLoggedIn() {
  const app = getApp()
  if (app.globalData.token) {
    return Promise.resolve(app.globalData.userInfo)
  }
  return wechatLogin()
}

module.exports = { wechatLogin, ensureLoggedIn }
