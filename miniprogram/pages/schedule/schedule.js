const sessionService = require('../../services/session')
const { getWeekDates, formatDate } = require('../../utils/util')

Page({
  data: {
    weekDates: [],
    selectedDate: '',
    sessions: [],
    sessionCounts: {},
    loading: true,
  },

  onShow() {
    const today = new Date().toISOString().slice(0, 10)
    const weekDates = getWeekDates(new Date())
    this.setData({
      weekDates,
      selectedDate: today,
    })
    this.loadWeekCounts(weekDates)
    this.loadSessions(today)
  },

  loadWeekCounts(weekDates) {
    const start = weekDates[0].date
    const end = weekDates[6].date
    sessionService.getSchedule(start, end).then((res) => {
      this.setData({ sessionCounts: res.counts_by_date || {} })
    })
  },

  loadSessions(date) {
    this.setData({ loading: true })
    sessionService.listSessions({ date }).then((res) => {
      const sessions = (res.items || []).map((s) => ({
        ...s,
        price_yuan: (s.price_cents / 100).toFixed(2),
      }))
      this.setData({ sessions, loading: false })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  onSelectDay(e) {
    const { date } = e.detail
    this.setData({ selectedDate: date })
    this.loadSessions(date)
  },

  onPrevWeek() {
    const base = new Date(this.data.selectedDate)
    base.setDate(base.getDate() - 7)
    const weekDates = getWeekDates(base)
    this.setData({ weekDates, selectedDate: weekDates[0].date })
    this.loadWeekCounts(weekDates)
    this.loadSessions(weekDates[0].date)
  },

  onNextWeek() {
    const base = new Date(this.data.selectedDate)
    base.setDate(base.getDate() + 7)
    const weekDates = getWeekDates(base)
    this.setData({ weekDates, selectedDate: weekDates[0].date })
    this.loadWeekCounts(weekDates)
    this.loadSessions(weekDates[0].date)
  },
})
