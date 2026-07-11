function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  return timeStr.slice(0, 5)
}

function formatPrice(cents) {
  return (cents / 100).toFixed(2)
}

function getWeekDates(baseDate) {
  const start = new Date(baseDate)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)

  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push({
      date: d.toISOString().slice(0, 10),
      dayLabel: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      dayNum: d.getDate(),
      isToday: d.toDateString() === new Date().toDateString(),
    })
  }
  return dates
}

function statusLabel(status) {
  const map = {
    pending_payment: 'Awaiting payment',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    completed: 'Completed',
    refunded: 'Refunded',
  }
  return map[status] || status
}

function statusClass(status) {
  const map = {
    pending_payment: 'tag-orange',
    confirmed: 'tag-green',
    cancelled: 'text-muted',
    completed: 'tag-blue',
    refunded: 'text-muted',
  }
  return map[status] || 'tag-green'
}

module.exports = {
  formatDate,
  formatTime,
  formatPrice,
  getWeekDates,
  statusLabel,
  statusClass,
}
