const authService = require('../../services/auth')

Page({
  data: {
    userInfo: null,
    loggedIn: false,
  },

  onShow() {
    const app = getApp()
    const userInfo = app.globalData.userInfo
    this.setData({
      userInfo,
      loggedIn: !!app.globalData.token,
    })
  },

  onLogin() {
    authService.wechatLogin().then((data) => {
      this.setData({
        userInfo: data.user,
        loggedIn: true,
      })
      wx.showToast({ title: 'Signed in', icon: 'success' })
    })
  },

  onLogout() {
    const app = getApp()
    app.clearAuth()
    this.setData({ userInfo: null, loggedIn: false })
    wx.showToast({ title: 'Signed out', icon: 'none' })
  },

  onBrowse() {
    wx.navigateTo({ url: '/pages/sessions/sessions' })
  },
})
