const { request } = require('../utils/request')

function listSessions(params = {}) {
  return request({ url: '/sessions', data: params, showLoading: false })
}

function getSession(id) {
  return request({ url: `/sessions/${id}` })
}

function getSchedule(startDate, endDate) {
  return request({
    url: '/schedule',
    data: { start_date: startDate, end_date: endDate },
    showLoading: false,
  })
}

module.exports = { listSessions, getSession, getSchedule }
