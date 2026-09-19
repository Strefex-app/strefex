const sessionService = require('../../services/session')

Component({
  properties: {
    session: {
      type: Object,
      value: null,
    },
    compact: {
      type: Boolean,
      value: false,
    },
  },

  methods: {
    onTap() {
      const { session } = this.properties
      if (session && session.id) {
        wx.navigateTo({ url: `/pages/session-detail/session-detail?id=${session.id}` })
      }
    },
  },
})
