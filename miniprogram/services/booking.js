const { request } = require('../utils/request')

function createBooking(sessionId, notes) {
  return request({
    url: '/bookings',
    method: 'POST',
    data: { session_id: sessionId, notes: notes || '' },
  })
}

function listBookings() {
  return request({ url: '/bookings' })
}

function getBooking(id) {
  return request({ url: `/bookings/${id}` })
}

function cancelBooking(id) {
  return request({ url: `/bookings/${id}/cancel`, method: 'POST' })
}

module.exports = { createBooking, listBookings, getBooking, cancelBooking }
