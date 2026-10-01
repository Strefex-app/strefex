Component({
  properties: {
    weekDates: {
      type: Array,
      value: [],
    },
    selectedDate: {
      type: String,
      value: '',
    },
    sessionCounts: {
      type: Object,
      value: {},
    },
  },

  methods: {
    onSelectDay(e) {
      const { date } = e.currentTarget.dataset
      this.triggerEvent('select', { date })
    },
  },
})
