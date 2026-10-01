const sessionService = require('../../services/session')

Page({
  data: {
    sessions: [],
    category: '',
    level: '',
    categoryLabel: 'All',
    levelLabel: 'All levels',
    categories: [
      { id: '', label: 'All' },
      { id: 'skills', label: 'Skills' },
      { id: 'fitness', label: 'Fitness' },
      { id: 'tactics', label: 'Tactics' },
      { id: 'youth', label: 'Youth' },
    ],
    levels: [
      { id: '', label: 'All levels' },
      { id: 'Beginner', label: 'Beginner' },
      { id: 'Intermediate', label: 'Intermediate' },
      { id: 'Advanced', label: 'Advanced' },
    ],
  },

  onLoad(options) {
    if (options.category) {
      const cat = this.data.categories.find((c) => c.id === options.category)
      this.setData({
        category: options.category,
        categoryLabel: cat ? cat.label : 'All',
      })
    }
    this.loadSessions()
  },

  loadSessions() {
    const { category, level } = this.data
    const params = {}
    if (category) params.category = category
    if (level) params.level = level

    sessionService.listSessions(params).then((res) => {
      const sessions = (res.items || []).map((s) => ({
        ...s,
        price_yuan: (s.price_cents / 100).toFixed(2),
      }))
      this.setData({ sessions })
    })
  },

  onCategoryChange(e) {
    const idx = Number(e.detail.value)
    const cat = this.data.categories[idx]
    this.setData({ category: cat.id, categoryLabel: cat.label })
    this.loadSessions()
  },

  onLevelChange(e) {
    const idx = Number(e.detail.value)
    const lvl = this.data.levels[idx]
    this.setData({ level: lvl.id, levelLabel: lvl.label })
    this.loadSessions()
  },
})
