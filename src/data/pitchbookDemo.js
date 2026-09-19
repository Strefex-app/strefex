/**
 * Demo seed data for PitchBook web preview (mirrors backend football_training_store).
 */

function addDays(base, days) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const TEMPLATES = [
  {
    title: 'Ball Mastery & First Touch',
    description:
      'Improve close control, receiving under pressure, and quick turns. Suitable for all outfield players.',
    category: 'skills',
    level: 'Beginner',
    coach_name: 'Coach Li Wei',
    venue_name: 'Greenfield Sports Center',
    venue_address: '88 Stadium Road, Pudong, Shanghai',
    start_time: '09:00',
    end_time: '10:30',
    duration_minutes: 90,
    price_cents: 12800,
    capacity: 16,
    equipment: 'Boots, shin guards, water bottle',
  },
  {
    title: 'High-Intensity Interval Training',
    description:
      'Football-specific fitness: sprints, agility ladders, and recovery drills to boost match endurance.',
    category: 'fitness',
    level: 'Intermediate',
    coach_name: 'Coach Sarah Chen',
    venue_name: 'Victory Arena',
    venue_address: '12 Athletic Blvd, Minhang, Shanghai',
    start_time: '18:00',
    end_time: '19:00',
    duration_minutes: 60,
    price_cents: 9800,
    capacity: 20,
    equipment: 'Training kit, towel',
  },
  {
    title: 'Positional Play & Pressing',
    description:
      'Tactical session on build-up patterns, pressing triggers, and defensive shape in a 4-3-3.',
    category: 'tactics',
    level: 'Advanced',
    coach_name: 'Coach Marco Silva',
    venue_name: 'Elite Football Park',
    venue_address: '5 Champions Way, Xuhui, Shanghai',
    start_time: '19:30',
    end_time: '21:00',
    duration_minutes: 90,
    price_cents: 16800,
    capacity: 14,
    equipment: 'Boots, bib (provided), notebook optional',
  },
  {
    title: 'Youth Development (U12–U15)',
    description:
      'Fun, structured training for young players: dribbling games, small-sided matches, and fair play.',
    category: 'youth',
    level: 'Beginner',
    coach_name: 'Coach Emma Wang',
    venue_name: 'Junior Kickers Field',
    venue_address: '33 Youth Lane, Changning, Shanghai',
    start_time: '15:00',
    end_time: '16:30',
    duration_minutes: 90,
    price_cents: 8800,
    capacity: 18,
    equipment: 'Boots, shin guards, parent consent on file',
  },
  {
    title: 'Finishing & Movement in the Box',
    description:
      'Strikers and attacking mids: timing runs, volleys, headers, and composure in front of goal.',
    category: 'skills',
    level: 'Intermediate',
    coach_name: 'Coach Li Wei',
    venue_name: 'Greenfield Sports Center',
    venue_address: '88 Stadium Road, Pudong, Shanghai',
    start_time: '10:00',
    end_time: '11:30',
    duration_minutes: 90,
    price_cents: 13800,
    capacity: 12,
    equipment: 'Boots, shin guards',
  },
  {
    title: 'Goalkeeper Specialist Session',
    description: 'Shot stopping, distribution, and 1v1 situations with dedicated GK coaching.',
    category: 'skills',
    level: 'Advanced',
    coach_name: 'Coach Marco Silva',
    venue_name: 'Elite Football Park',
    venue_address: '5 Champions Way, Xuhui, Shanghai',
    start_time: '08:00',
    end_time: '09:30',
    duration_minutes: 90,
    price_cents: 15800,
    capacity: 8,
    equipment: 'GK gloves, long sleeves recommended',
  },
]

let idCounter = 1

export function buildDemoSessions() {
  const today = new Date()
  const sessions = []

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    TEMPLATES.forEach((template, i) => {
      if ((dayOffset + i) % 3 === 0) return
      const booked = (dayOffset + i) % 5
      sessions.push({
        ...template,
        id: `demo-session-${idCounter++}`,
        date: addDays(today, dayOffset),
        spots_left: Math.max(0, template.capacity - booked),
      })
    })
  }

  return sessions
}

export const CATEGORIES = [
  { id: 'skills', label: 'Skills', icon: '⚽' },
  { id: 'fitness', label: 'Fitness', icon: '🏃' },
  { id: 'tactics', label: 'Tactics', icon: '📋' },
  { id: 'youth', label: 'Youth', icon: '🌟' },
]

export const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'profile', label: 'Profile' },
]

export function formatPrice(cents) {
  return (cents / 100).toFixed(2)
}

export function getWeekDates(baseDate = new Date()) {
  const start = new Date(baseDate)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + diff)

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const todayStr = new Date().toDateString()

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return {
      date: d.toISOString().slice(0, 10),
      dayLabel: labels[i],
      dayNum: d.getDate(),
      isToday: d.toDateString() === todayStr,
    }
  })
}
