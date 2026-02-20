import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useExhibitionStore from '../store/exhibitionStore'
import './ProfileCalendar.css'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const INDUSTRY_COLORS = {
  Automotive: '#e74c3c',
  Manufacturing: '#3498db',
  Plastic: '#27ae60',
  Metal: '#e67e22',
  'Medical Equipment': '#9b59b6',
  'Raw Materials': '#16a085',
}

// Helper: format local date as YYYY-MM-DD (avoids UTC timezone shift)
const toLocalDateStr = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const ProfileCalendar = () => {
  const navigate = useNavigate()
  const contentRef = useRef(null)
  const {
    industries,
    tierLevels,
    getCountries,
    getEquipmentTags,
    getFilteredExhibitions,
    plannedExhibitions,
    addPlannedExhibition,
    removePlannedExhibition,
    getPlannedExhibitions,
    getExhibitionReminders,
  } = useExhibitionStore()

  const countries = getCountries()
  const equipmentTags = getEquipmentTags()

  // View mode: calendar | list
  const [viewMode, setViewMode] = useState('calendar')
  // Calendar year & month — default to current year/month
  const [calYear, setCalYear] = useState(2026)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())

  // Filters
  const [filters, setFilters] = useState({
    industry: 'All',
    country: 'All',
    tier: 'All',
    equipment: 'All',
    search: '',
    month: 'All',
    year: 'All',
  })

  // Selected exhibition for detail panel
  const [selectedExhibition, setSelectedExhibition] = useState(null)
  const [showReminders, setShowReminders] = useState(false)

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  // Filtered results
  const filteredExhibitions = useMemo(() => getFilteredExhibitions(filters), [filters, getFilteredExhibitions])

  // Group exhibitions by month for list view
  const groupedByMonth = useMemo(() => {
    const groups = {}
    filteredExhibitions.forEach((ex) => {
      const d = new Date(ex.startDate)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!groups[key]) groups[key] = { year: d.getFullYear(), month: d.getMonth(), items: [] }
      groups[key].items.push(ex)
    })
    return Object.values(groups).sort((a, b) => a.year - b.year || a.month - b.month)
  }, [filteredExhibitions])

  // Count exhibitions per industry
  const industryCounts = useMemo(() => {
    const counts = {}
    filteredExhibitions.forEach((ex) => {
      counts[ex.industry] = (counts[ex.industry] || 0) + 1
    })
    return counts
  }, [filteredExhibitions])

  // Calendar generation — use local dates
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1)
    const lastDay = new Date(calYear, calMonth + 1, 0)
    const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    const days = []

    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(calYear, calMonth, -i)
      days.push({ date: d, isCurrentMonth: false, exhibitions: [] })
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(calYear, calMonth, d)
      const dateStr = toLocalDateStr(date)
      const dayExhibitions = filteredExhibitions.filter((ex) => dateStr >= ex.startDate && dateStr <= ex.endDate)
      days.push({ date, isCurrentMonth: true, exhibitions: dayExhibitions })
    }

    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(calYear, calMonth + 1, d)
      days.push({ date, isCurrentMonth: false, exhibitions: [] })
    }

    return days
  }, [calYear, calMonth, filteredExhibitions])

  const goToPrevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) }
    else setCalMonth(calMonth - 1)
  }

  const goToNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) }
    else setCalMonth(calMonth + 1)
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatDateRange = (start, end) => {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    if (s.getMonth() === e.getMonth()) {
      return `${s.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${e.getDate()}, ${e.getFullYear()}`
    }
    return `${formatDate(start)} – ${formatDate(end)}, ${e.getFullYear()}`
  }

  const getDuration = (start, end) => {
    const days = Math.ceil((new Date(end + 'T00:00:00') - new Date(start + 'T00:00:00')) / 86400000) + 1
    return `${days} day${days > 1 ? 's' : ''}`
  }

  // Reminders
  const reminders = useMemo(() => getExhibitionReminders(), [getExhibitionReminders, plannedExhibitions])
  const plannedList = useMemo(() => getPlannedExhibitions(), [getPlannedExhibitions, plannedExhibitions])

  const isExPlanned = useCallback((id) => plannedExhibitions.includes(id), [plannedExhibitions])

  const togglePlanned = (ex) => {
    if (isExPlanned(ex.id)) removePlannedExhibition(ex.id)
    else addPlannedExhibition(ex.id)
  }

  // Month events for the calendar
  const monthEvents = useMemo(() => {
    return filteredExhibitions.filter((ex) => {
      const s = new Date(ex.startDate + 'T00:00:00')
      const e = new Date(ex.endDate + 'T00:00:00')
      return (s.getMonth() === calMonth && s.getFullYear() === calYear) ||
             (e.getMonth() === calMonth && e.getFullYear() === calYear)
    })
  }, [filteredExhibitions, calMonth, calYear])

  // ── Calendar Export Helpers (ICS / Google) ────────────────
  // Format date as ICS VALUE-DATE (YYYYMMDD)
  const toICSDate = (dateStr) => dateStr.replace(/-/g, '')

  // Generate ICS content for a single exhibition
  const generateICS = (ex) => {
    const uid = `${ex.id}@strefex.com`
    const now = new Date()
    const stamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const startD = toICSDate(ex.startDate)
    // ICS DTEND for all-day is exclusive, so add 1 day
    const endDate = new Date(ex.endDate + 'T00:00:00')
    endDate.setDate(endDate.getDate() + 1)
    const endD = toLocalDateStr(endDate).replace(/-/g, '')
    const location = `${ex.venue}, ${ex.city}, ${ex.country}`
    const description = `${ex.description}\\n\\nIndustry: ${ex.industry}\\nTier: ${ex.tier.join(', ')}\\nEquipment: ${ex.equipment.join(', ')}\\nVisitors: ${ex.visitors}\\nExhibitors: ${ex.exhibitors}\\nWebsite: ${ex.website}`

    // Alarms: 1 month, 1 week, 1 day before
    const alarms = [
      `BEGIN:VALARM\r\nTRIGGER:-P30D\r\nACTION:DISPLAY\r\nDESCRIPTION:${ex.name} starts in 1 month\r\nEND:VALARM`,
      `BEGIN:VALARM\r\nTRIGGER:-P7D\r\nACTION:DISPLAY\r\nDESCRIPTION:${ex.name} starts in 1 week\r\nEND:VALARM`,
      `BEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY\r\nDESCRIPTION:${ex.name} starts tomorrow\r\nEND:VALARM`,
    ]

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//STREFEX//Exhibition Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${startD}`,
      `DTEND;VALUE=DATE:${endD}`,
      `SUMMARY:${ex.name}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `URL:${ex.website}`,
      `CATEGORIES:${ex.industry}`,
      ...alarms,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
  }

  // Generate ICS for multiple exhibitions (planned or all filtered)
  const generateMultiICS = (exhibitions) => {
    const now = new Date()
    const stamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const events = exhibitions.map((ex) => {
      const startD = toICSDate(ex.startDate)
      const endDate = new Date(ex.endDate + 'T00:00:00')
      endDate.setDate(endDate.getDate() + 1)
      const endD = toLocalDateStr(endDate).replace(/-/g, '')
      const location = `${ex.venue}, ${ex.city}, ${ex.country}`
      const description = `${ex.description}\\n\\nIndustry: ${ex.industry}\\nTier: ${ex.tier.join(', ')}\\nWebsite: ${ex.website}`

      return [
        'BEGIN:VEVENT',
        `UID:${ex.id}@strefex.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${startD}`,
        `DTEND;VALUE=DATE:${endD}`,
        `SUMMARY:${ex.name}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        `URL:${ex.website}`,
        `CATEGORIES:${ex.industry}`,
        `BEGIN:VALARM\r\nTRIGGER:-P30D\r\nACTION:DISPLAY\r\nDESCRIPTION:${ex.name} in 1 month\r\nEND:VALARM`,
        `BEGIN:VALARM\r\nTRIGGER:-P7D\r\nACTION:DISPLAY\r\nDESCRIPTION:${ex.name} in 1 week\r\nEND:VALARM`,
        `BEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY\r\nDESCRIPTION:${ex.name} tomorrow\r\nEND:VALARM`,
        'END:VEVENT',
      ].join('\r\n')
    })

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//STREFEX//Exhibition Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:STREFEX Exhibitions',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n')
  }

  // Download ICS file
  const downloadICS = (content, filename) => {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Export single exhibition to ICS (Outlook / iOS / Android)
  const handleExportSingleICS = (ex) => {
    const ics = generateICS(ex)
    const safeName = ex.name.replace(/[^a-zA-Z0-9]/g, '_')
    downloadICS(ics, `${safeName}.ics`)
  }

  // Export all planned exhibitions as one ICS
  const handleExportPlannedICS = () => {
    const list = plannedList.length > 0 ? plannedList : filteredExhibitions
    const ics = generateMultiICS(list)
    downloadICS(ics, `strefex-exhibitions-${calYear}.ics`)
  }

  // Open Google Calendar with event
  const handleExportGoogleCalendar = (ex) => {
    const startD = toICSDate(ex.startDate)
    const endDate = new Date(ex.endDate + 'T00:00:00')
    endDate.setDate(endDate.getDate() + 1)
    const endD = toLocalDateStr(endDate).replace(/-/g, '')
    const location = encodeURIComponent(`${ex.venue}, ${ex.city}, ${ex.country}`)
    const details = encodeURIComponent(`${ex.description}\n\nIndustry: ${ex.industry}\nTier: ${ex.tier.join(', ')}\nWebsite: ${ex.website}`)
    const title = encodeURIComponent(ex.name)
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startD}/${endD}&details=${details}&location=${location}&sf=true`
    window.open(url, '_blank')
  }

  // Show/hide export menu
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef(null)

  // Close export menu on click outside
  useEffect(() => {
    if (!showExportMenu) return
    const handleClick = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showExportMenu])

  // PDF Export
  const handleExportPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageW = 210
    let y = 15

    // Title
    doc.setFontSize(18)
    doc.setTextColor(0, 8, 136)
    doc.text('Worldwide Exhibitions Calendar', pageW / 2, y, { align: 'center' })
    y += 8
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW / 2, y, { align: 'center' })
    y += 4
    const activeFilters = []
    if (filters.industry !== 'All') activeFilters.push(`Industry: ${filters.industry}`)
    if (filters.country !== 'All') activeFilters.push(`Country: ${filters.country}`)
    if (filters.tier !== 'All') activeFilters.push(`Tier: ${filters.tier}`)
    if (activeFilters.length) {
      doc.text(`Filters: ${activeFilters.join(' | ')}`, pageW / 2, y, { align: 'center' })
    }
    y += 8

    // Table Header
    doc.setFillColor(0, 8, 136)
    doc.rect(10, y, pageW - 20, 8, 'F')
    doc.setFontSize(9)
    doc.setTextColor(255)
    doc.text('Exhibition', 14, y + 5.5)
    doc.text('Industry', 82, y + 5.5)
    doc.text('Dates', 112, y + 5.5)
    doc.text('Location', 148, y + 5.5)
    doc.text('Tier', 185, y + 5.5)
    y += 10

    // Rows
    doc.setTextColor(50)
    const exList = filteredExhibitions.length > 0 ? filteredExhibitions : []
    exList.forEach((ex, i) => {
      if (y > 275) { doc.addPage(); y = 15 }
      if (i % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(10, y - 3, pageW - 20, 7, 'F') }

      doc.setFontSize(8)
      doc.setTextColor(30)
      const nameLines = doc.splitTextToSize(ex.name, 64)
      doc.text(nameLines[0], 14, y + 1)

      doc.setTextColor(80)
      doc.text(ex.industry, 82, y + 1)
      doc.text(`${formatDate(ex.startDate)} – ${formatDate(ex.endDate)}`, 112, y + 1)
      doc.text(`${ex.city}, ${ex.country}`, 148, y + 1)
      doc.setFontSize(7)
      doc.text(ex.tier.join(', '), 185, y + 1)
      y += 7
    })

    // Planned section
    if (plannedList.length > 0) {
      y += 5
      if (y > 260) { doc.addPage(); y = 15 }
      doc.setFontSize(14)
      doc.setTextColor(0, 8, 136)
      doc.text('Planned Exhibitions', 14, y)
      y += 8

      plannedList.forEach((ex) => {
        if (y > 275) { doc.addPage(); y = 15 }
        doc.setFontSize(9)
        doc.setTextColor(30)
        doc.text(`• ${ex.name}`, 14, y)
        doc.setTextColor(100)
        doc.text(`${formatDateRange(ex.startDate, ex.endDate)} — ${ex.city}, ${ex.country}`, 16, y + 5)
        y += 10
      })
    }

    doc.save(`exhibitions-calendar-${calYear}.pdf`)
  }

  return (
    <AppLayout>
      <div className="excal-page" ref={contentRef}>
        {/* Header */}
        <div className="excal-header">
          <button type="button" className="excal-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="excal-header-content">
            <div>
              <h1 className="excal-title">Worldwide Exhibitions Calendar</h1>
              <p className="excal-subtitle">
                Industry trade fairs and exhibitions — {filteredExhibitions.length} events found
              </p>
            </div>
            <div className="excal-header-actions">
              {/* Reminders Bell */}
              <button
                type="button"
                className={`reminder-bell-btn ${reminders.length > 0 ? 'has-reminders' : ''}`}
                onClick={() => setShowReminders(!showReminders)}
                title="Exhibition reminders"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {reminders.length > 0 && <span className="bell-badge">{reminders.length}</span>}
              </button>
              {/* Export Menu */}
              <div className="export-menu-wrapper" ref={exportMenuRef}>
                <button
                  type="button"
                  className="export-btn"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Export
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                {showExportMenu && (
                  <div className="export-dropdown">
                    <div className="export-dropdown-title">Export Calendar</div>
                    <button type="button" onClick={() => { handleExportPDF(); setShowExportMenu(false) }}>
                      <span className="export-icon pdf">PDF</span>
                      Export as PDF
                    </button>
                    <div className="export-dropdown-divider" />
                    <div className="export-dropdown-title">Add to Calendar App</div>
                    <button type="button" onClick={() => { handleExportPlannedICS(); setShowExportMenu(false) }}>
                      <span className="export-icon ics">ICS</span>
                      Outlook / Apple Calendar
                      <span className="export-sub">Downloads .ics file</span>
                    </button>
                    <button type="button" onClick={() => { handleExportPlannedICS(); setShowExportMenu(false) }}>
                      <span className="export-icon ios">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="2"/><path d="M16 8s-1.5-2-4-2-4 2-4 2M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </span>
                      iOS Calendar (iPhone/iPad)
                      <span className="export-sub">Downloads .ics file</span>
                    </button>
                    <button type="button" onClick={() => { handleExportPlannedICS(); setShowExportMenu(false) }}>
                      <span className="export-icon android">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3M3 14h2M19 14h2M8 4L6 2M16 4l2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </span>
                      Android Calendar
                      <span className="export-sub">Downloads .ics file</span>
                    </button>
                    <div className="export-dropdown-divider" />
                    <button type="button" onClick={() => {
                      if (filteredExhibitions.length > 0) handleExportGoogleCalendar(filteredExhibitions[0])
                      setShowExportMenu(false)
                    }}>
                      <span className="export-icon google">G</span>
                      Google Calendar
                      <span className="export-sub">Opens in browser</span>
                    </button>
                    <div className="export-dropdown-note">
                      {plannedList.length > 0
                        ? `Exporting ${plannedList.length} planned exhibition${plannedList.length > 1 ? 's' : ''}`
                        : `Exporting all ${filteredExhibitions.length} filtered exhibitions`}
                    </div>
                  </div>
                )}
              </div>
              {/* View Toggle */}
              <div className="excal-view-toggle">
                <button
                  type="button"
                  className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                  onClick={() => setViewMode('calendar')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Calendar
                </button>
                <button
                  type="button"
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reminders Dropdown */}
        {showReminders && (
          <div className="reminders-panel">
            <div className="reminders-header">
              <h3>Upcoming Planned Exhibitions</h3>
              <button type="button" className="reminder-link" onClick={() => { navigate('/notifications'); setShowReminders(false) }}>
                View Notifications →
              </button>
            </div>
            {reminders.length === 0 && plannedList.length === 0 && (
              <p className="no-reminders">No exhibitions planned. Click the star icon on any exhibition to add it to your plan.</p>
            )}
            {reminders.length > 0 && (
              <div className="reminders-list">
                {reminders.map((r) => (
                  <div key={r.id} className={`reminder-item ${r.urgency}`}>
                    <div className="reminder-urgency-bar" />
                    <div className="reminder-info">
                      <span className="reminder-name">{r.name}</span>
                      <span className="reminder-label">{r.label}</span>
                      <span className="reminder-meta">{r.city}, {r.country}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {plannedList.length > 0 && reminders.length === 0 && (
              <div className="reminders-list">
                {plannedList.slice(0, 5).map((ex) => (
                  <div key={ex.id} className="reminder-item info">
                    <div className="reminder-urgency-bar" />
                    <div className="reminder-info">
                      <span className="reminder-name">{ex.name}</span>
                      <span className="reminder-label">{formatDateRange(ex.startDate, ex.endDate)}</span>
                      <span className="reminder-meta">{ex.city}, {ex.country}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="planned-count">
              {plannedList.length} exhibition{plannedList.length !== 1 ? 's' : ''} in your plan
            </div>
          </div>
        )}

        {/* Industry Quick Filters */}
        <div className="excal-industry-bar">
          {industries.map((ind) => (
            <button
              key={ind}
              type="button"
              className={`industry-chip ${filters.industry === ind ? 'active' : ''}`}
              style={{ '--chip-color': ind === 'All' ? '#555' : (INDUSTRY_COLORS[ind] || '#555') }}
              onClick={() => updateFilter('industry', ind)}
            >
              {ind !== 'All' && <span className="chip-dot" style={{ background: INDUSTRY_COLORS[ind] }} />}
              {ind}
              {ind !== 'All' && industryCounts[ind] ? ` (${industryCounts[ind]})` : ''}
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="excal-filters">
          <div className="filter-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search exhibitions, cities, equipment..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
            />
          </div>
          <div className="filter-selects">
            <select value={filters.country} onChange={(e) => updateFilter('country', e.target.value)}>
              {countries.map((c) => <option key={c} value={c}>{c === 'All' ? 'All Countries' : c}</option>)}
            </select>
            <select value={filters.tier} onChange={(e) => updateFilter('tier', e.target.value)}>
              {tierLevels.map((t) => <option key={t} value={t}>{t === 'All' ? 'All Tier Levels' : t}</option>)}
            </select>
            <select value={filters.equipment} onChange={(e) => updateFilter('equipment', e.target.value)}>
              {equipmentTags.map((eq) => <option key={eq} value={eq}>{eq === 'All' ? 'All Equipment' : eq}</option>)}
            </select>
            <select value={filters.year} onChange={(e) => updateFilter('year', e.target.value)}>
              <option value="All">All Years</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
            {viewMode === 'list' && (
              <select value={filters.month} onChange={(e) => updateFilter('month', e.target.value)}>
                <option value="All">All Months</option>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            )}
          </div>
          {(filters.industry !== 'All' || filters.country !== 'All' || filters.tier !== 'All' || filters.equipment !== 'All' || filters.search || filters.month !== 'All' || filters.year !== 'All') && (
            <button
              type="button"
              className="filter-clear"
              onClick={() => setFilters({ industry: 'All', country: 'All', tier: 'All', equipment: 'All', search: '', month: 'All', year: 'All' })}
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="excal-calendar-section">
            <div className="cal-nav">
              <button type="button" onClick={goToPrevMonth}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <h2 className="cal-month-title">{MONTHS[calMonth]} {calYear}</h2>
              <button type="button" onClick={goToNextMonth}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className="cal-year-btns">
                <button type="button" className={calYear === 2026 ? 'active' : ''} onClick={() => setCalYear(2026)}>2026</button>
                <button type="button" className={calYear === 2027 ? 'active' : ''} onClick={() => setCalYear(2027)}>2027</button>
                <button type="button" className={calYear === 2028 ? 'active' : ''} onClick={() => setCalYear(2028)}>2028</button>
              </div>
            </div>

            <div className="cal-grid">
              <div className="cal-weekdays">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="cal-weekday">{d}</div>
                ))}
              </div>
              <div className="cal-days">
                {calendarDays.map((day, i) => {
                  const isToday = day.date.toDateString() === new Date().toDateString()
                  return (
                    <div
                      key={i}
                      className={`cal-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${day.exhibitions.length > 0 ? 'has-events' : ''}`}
                      onClick={() => {
                        if (day.exhibitions.length > 0) setSelectedExhibition(day.exhibitions[0])
                      }}
                    >
                      <span className="cal-day-num">{day.date.getDate()}</span>
                      {day.exhibitions.length > 0 && (
                        <div className="cal-day-events">
                          {day.exhibitions.slice(0, 3).map((ex) => (
                            <div
                              key={ex.id}
                              className={`cal-event-dot ${isExPlanned(ex.id) ? 'planned' : ''}`}
                              style={{ background: INDUSTRY_COLORS[ex.industry] }}
                              title={ex.name}
                              onClick={(e) => { e.stopPropagation(); setSelectedExhibition(ex) }}
                            />
                          ))}
                          {day.exhibitions.length > 3 && (
                            <span className="cal-more">+{day.exhibitions.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Month events underneath calendar */}
            <div className="cal-month-events">
              <h3>
                Events in {MONTHS[calMonth]} {calYear}
                <span className="events-count">{monthEvents.length} events</span>
              </h3>
              <div className="cal-events-list">
                {monthEvents.map((ex) => (
                  <div
                    key={ex.id}
                    className={`cal-event-item ${selectedExhibition?.id === ex.id ? 'selected' : ''} ${isExPlanned(ex.id) ? 'is-planned' : ''}`}
                    onClick={() => setSelectedExhibition(ex)}
                  >
                    <div className="event-color-bar" style={{ background: INDUSTRY_COLORS[ex.industry] }} />
                    <div className="event-info">
                      <div className="event-name">
                        {isExPlanned(ex.id) && <span className="planned-star" title="Planned">★</span>}
                        {ex.name}
                      </div>
                      <div className="event-meta">
                        <span>{formatDateRange(ex.startDate, ex.endDate)}</span>
                        <span className="meta-dot">·</span>
                        <span>{ex.city}, {ex.country}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`plan-star-btn ${isExPlanned(ex.id) ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); togglePlanned(ex) }}
                      title={isExPlanned(ex.id) ? 'Remove from plan' : 'Add to plan'}
                    >
                      {isExPlanned(ex.id) ? '★' : '☆'}
                    </button>
                    <div className="event-tags">
                      <span className="tag-industry" style={{ background: INDUSTRY_COLORS[ex.industry] }}>{ex.industry}</span>
                    </div>
                  </div>
                ))}
                {monthEvents.length === 0 && (
                  <div className="no-events">No exhibitions this month matching your filters.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="excal-list-section">
            {groupedByMonth.length === 0 && (
              <div className="no-events">No exhibitions found matching your filters.</div>
            )}
            {groupedByMonth.map((group) => (
              <div key={`${group.year}-${group.month}`} className="list-month-group">
                <div className="list-month-header">
                  <h3>{MONTHS[group.month]} {group.year}</h3>
                  <span className="month-count">{group.items.length} event{group.items.length > 1 ? 's' : ''}</span>
                </div>
                <div className="list-events">
                  {group.items.map((ex) => (
                    <div
                      key={ex.id}
                      className={`list-event-card ${selectedExhibition?.id === ex.id ? 'selected' : ''} ${isExPlanned(ex.id) ? 'is-planned' : ''}`}
                      onClick={() => setSelectedExhibition(ex)}
                    >
                      <div className="list-event-date-block" style={{ borderColor: INDUSTRY_COLORS[ex.industry] }}>
                        <span className="date-month">{MONTHS[new Date(ex.startDate + 'T00:00:00').getMonth()].slice(0, 3)}</span>
                        <span className="date-days">{new Date(ex.startDate + 'T00:00:00').getDate()}-{new Date(ex.endDate + 'T00:00:00').getDate()}</span>
                      </div>
                      <div className="list-event-body">
                        <div className="list-event-top">
                          <h4 className="list-event-name">
                            {isExPlanned(ex.id) && <span className="planned-star">★</span>}
                            {ex.name}
                          </h4>
                          <span className="list-event-industry" style={{ background: INDUSTRY_COLORS[ex.industry] }}>{ex.industry}</span>
                          <button
                            type="button"
                            className={`plan-star-btn ${isExPlanned(ex.id) ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); togglePlanned(ex) }}
                            title={isExPlanned(ex.id) ? 'Remove from plan' : 'Add to plan'}
                          >
                            {isExPlanned(ex.id) ? '★' : '☆'}
                          </button>
                        </div>
                        <p className="list-event-desc">{ex.description}</p>
                        <div className="list-event-details">
                          <span className="detail-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" /></svg>
                            {ex.city}, {ex.country}
                          </span>
                          <span className="detail-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                            {getDuration(ex.startDate, ex.endDate)}
                          </span>
                          <span className="detail-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            {ex.visitors} visitors
                          </span>
                          <span className="detail-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M2 20h20M5 20V8l7-5 7 5v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            {ex.exhibitors} exhibitors
                          </span>
                        </div>
                        <div className="list-event-tiers">
                          {ex.tier.map((t) => (
                            <span key={t} className="tier-badge">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Panel */}
        {selectedExhibition && (
          <div className="excal-detail-overlay" onClick={() => setSelectedExhibition(null)}>
            <div className="excal-detail-panel" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="detail-close" onClick={() => setSelectedExhibition(null)}>×</button>
              <div className="detail-banner" style={{ background: `linear-gradient(135deg, ${INDUSTRY_COLORS[selectedExhibition.industry]}dd 0%, ${INDUSTRY_COLORS[selectedExhibition.industry]}88 100%)` }}>
                <span className="detail-industry-badge">{selectedExhibition.industry}</span>
                <h2>{selectedExhibition.name}</h2>
                <p>{formatDateRange(selectedExhibition.startDate, selectedExhibition.endDate)}</p>
              </div>
              <div className="detail-body">
                <div className="detail-plan-row">
                  <button
                    type="button"
                    className={`plan-toggle-btn ${isExPlanned(selectedExhibition.id) ? 'planned' : ''}`}
                    onClick={() => togglePlanned(selectedExhibition)}
                  >
                    {isExPlanned(selectedExhibition.id) ? '★ Planned — Reminders Active' : '☆ Add to My Plan'}
                  </button>
                  {isExPlanned(selectedExhibition.id) && (
                    <span className="plan-reminder-note">Reminders: 1 month, 1 week, 1 day before</span>
                  )}
                </div>
                <p className="detail-description">{selectedExhibition.description}</p>

                <div className="detail-info-grid">
                  <div className="info-item">
                    <span className="info-label">Location</span>
                    <span className="info-value">{selectedExhibition.city}, {selectedExhibition.country}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Venue</span>
                    <span className="info-value">{selectedExhibition.venue}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Duration</span>
                    <span className="info-value">{getDuration(selectedExhibition.startDate, selectedExhibition.endDate)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Expected Visitors</span>
                    <span className="info-value">{selectedExhibition.visitors}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Exhibitors</span>
                    <span className="info-value">{selectedExhibition.exhibitors}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Website</span>
                    <a className="info-link" href={selectedExhibition.website} target="_blank" rel="noopener noreferrer">
                      Visit Website →
                    </a>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Tier Levels</h4>
                  <div className="detail-tags">
                    {selectedExhibition.tier.map((t) => (
                      <span key={t} className="detail-tag tier">{t}</span>
                    ))}
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Equipment & Technology Focus</h4>
                  <div className="detail-tags">
                    {selectedExhibition.equipment.map((eq) => (
                      <span key={eq} className="detail-tag equipment">{eq}</span>
                    ))}
                  </div>
                </div>

                {/* Export to Calendar */}
                <div className="detail-section">
                  <h4>Add to Calendar</h4>
                  <div className="detail-export-btns">
                    <button
                      type="button"
                      className="cal-export-btn outlook"
                      onClick={() => handleExportSingleICS(selectedExhibition)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      Outlook
                    </button>
                    <button
                      type="button"
                      className="cal-export-btn apple"
                      onClick={() => handleExportSingleICS(selectedExhibition)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 8c0-3.3-2.7-6-6-6S6 4.7 6 8" stroke="currentColor" strokeWidth="2"/><path d="M12 2c1 1 2 3 2 6M12 2c-1 1-2 3-2 6M4 14c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8-8 3.6-8 8z" stroke="currentColor" strokeWidth="2"/></svg>
                      iOS / Apple
                    </button>
                    <button
                      type="button"
                      className="cal-export-btn android"
                      onClick={() => handleExportSingleICS(selectedExhibition)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3M3 14h2M19 14h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      Android
                    </button>
                    <button
                      type="button"
                      className="cal-export-btn google"
                      onClick={() => handleExportGoogleCalendar(selectedExhibition)}
                    >
                      <span className="google-g">G</span>
                      Google
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ProfileCalendar
