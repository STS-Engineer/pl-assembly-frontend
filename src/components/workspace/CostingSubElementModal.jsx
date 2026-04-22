import { memo, useEffect, useRef, useState } from 'react'
import {
  COSTING_SUB_ELEMENT_STATUS_OPTIONS,
} from './costingSubElements'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const CALENDAR_MONTH_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
})

const CALENDAR_WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function createDateAtStartOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parsePositiveInteger(value) {
  const normalizedValue = String(value ?? '').trim()

  if (!/^\d+$/.test(normalizedValue)) {
    return null
  }

  const parsedValue = Number.parseInt(normalizedValue, 10)
  return parsedValue > 0 ? parsedValue : null
}

function parseDateValue(value) {
  const normalizedValue = String(value ?? '').trim()

  if (!normalizedValue) {
    return null
  }

  const isoMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const date = new Date(normalizedValue)
  return Number.isNaN(date.getTime()) ? null : createDateAtStartOfDay(date)
}

function formatDateValue(value, fallback = 'Not planned') {
  const date = parseDateValue(value)
  return date ? DATE_FORMATTER.format(date) : fallback
}

function formatIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDurationValue(value, fallback = 'Not defined') {
  const duration = parsePositiveInteger(value)

  if (!duration) {
    return fallback
  }

  return `${duration} working day${duration > 1 ? 's' : ''}`
}

function getCalendarMonth(value) {
  const date = parseDateValue(value) || new Date()
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function shiftMonth(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

function isSameDay(leftDate, rightDate) {
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  )
}

function compareCalendarDates(leftDate, rightDate) {
  return (
    createDateAtStartOfDay(leftDate).getTime() - createDateAtStartOfDay(rightDate).getTime()
  )
}

function orderDateRange(leftDate, rightDate) {
  return compareCalendarDates(leftDate, rightDate) <= 0
    ? [createDateAtStartOfDay(leftDate), createDateAtStartOfDay(rightDate)]
    : [createDateAtStartOfDay(rightDate), createDateAtStartOfDay(leftDate)]
}

function isWeekend(date) {
  const weekDay = createDateAtStartOfDay(date).getDay()
  return weekDay === 0 || weekDay === 6
}

function getNextBusinessDay(date) {
  const nextDate = createDateAtStartOfDay(date)

  while (isWeekend(nextDate)) {
    nextDate.setDate(nextDate.getDate() + 1)
  }

  return nextDate
}

function getPreviousBusinessDay(date) {
  const previousDate = createDateAtStartOfDay(date)

  while (isWeekend(previousDate)) {
    previousDate.setDate(previousDate.getDate() - 1)
  }

  return previousDate
}

function countBusinessDays(startDate, endDate) {
  const [rangeStart, rangeEnd] = orderDateRange(startDate, endDate)
  const cursor = createDateAtStartOfDay(rangeStart)
  let businessDayCount = 0

  while (compareCalendarDates(cursor, rangeEnd) <= 0) {
    if (!isWeekend(cursor)) {
      businessDayCount += 1
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return businessDayCount
}

function addBusinessDays(startDate, durationValue) {
  const duration = parsePositiveInteger(durationValue)

  if (!duration) {
    return null
  }

  const endDate = getNextBusinessDay(startDate)
  let remainingDays = duration - 1

  while (remainingDays > 0) {
    endDate.setDate(endDate.getDate() + 1)

    if (!isWeekend(endDate)) {
      remainingDays -= 1
    }
  }

  return endDate
}

function subtractBusinessDays(endDate, durationValue) {
  const duration = parsePositiveInteger(durationValue)

  if (!duration) {
    return null
  }

  const startDate = getPreviousBusinessDay(endDate)
  let remainingDays = duration - 1

  while (remainingDays > 0) {
    startDate.setDate(startDate.getDate() - 1)

    if (!isWeekend(startDate)) {
      remainingDays -= 1
    }
  }

  return startDate
}

function deriveRangeStartValue(endValue, durationValue) {
  const endDate = parseDateValue(endValue)
  const duration = parsePositiveInteger(durationValue)

  if (!endDate || !duration) {
    return ''
  }

  const startDate = subtractBusinessDays(endDate, duration)
  return startDate ? formatIsoDate(startDate) : ''
}

function isDateWithinRange(date, startDate, endDate) {
  if (!startDate || !endDate || isWeekend(date)) {
    return false
  }

  const [rangeStart, rangeEnd] = orderDateRange(startDate, endDate)

  return (
    compareCalendarDates(date, rangeStart) >= 0 && compareCalendarDates(date, rangeEnd) <= 0
  )
}

function createCalendarDays(displayedMonth, rangeStartValue, rangeEndValue) {
  const firstDayOfMonth = new Date(displayedMonth.getFullYear(), displayedMonth.getMonth(), 1)
  const daysInMonth = new Date(
    displayedMonth.getFullYear(),
    displayedMonth.getMonth() + 1,
    0,
  ).getDate()
  const leadingDays = (firstDayOfMonth.getDay() + 6) % 7
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7
  const gridStart = new Date(
    displayedMonth.getFullYear(),
    displayedMonth.getMonth(),
    1 - leadingDays,
  )
  const rangeStartDate = parseDateValue(rangeStartValue)
  const rangeEndDate = parseDateValue(rangeEndValue)
  const today = new Date()
  const days = []

  for (let index = 0; index < totalCells; index += 1) {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)

    days.push({
      isoValue: formatIsoDate(date),
      label: date.getDate(),
      isCurrentMonth: date.getMonth() === displayedMonth.getMonth(),
      isToday: isSameDay(date, today),
      isWeekend: isWeekend(date),
      isInRange: isDateWithinRange(date, rangeStartDate, rangeEndDate),
      isRangeStart: rangeStartDate ? isSameDay(date, rangeStartDate) : false,
      isRangeEnd: rangeEndDate ? isSameDay(date, rangeEndDate) : false,
    })
  }

  return days
}

function buildScheduleLabel(startValue, endValue) {
  if (startValue && endValue) {
    return `${formatDateValue(startValue)} -> ${formatDateValue(endValue)}`
  }

  if (endValue) {
    return formatDateValue(endValue)
  }

  return 'Choose workdays'
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.75 4.75V7.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.25 4.75V7.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.75 6.5H18.25C19.22 6.5 20 7.28 20 8.25V17.75C20 18.72 19.22 19.5 18.25 19.5H5.75C4.78 19.5 4 18.72 4 17.75V8.25C4 7.28 4.78 6.5 5.75 6.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 10.5H20"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronIcon({ direction = 'next' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === 'previous' ? 'M14.5 7.5L10 12L14.5 16.5' : 'M9.5 7.5L14 12L9.5 16.5'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DeadlineCalendarField({ value, duration, disabled, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [displayedMonth, setDisplayedMonth] = useState(() => getCalendarMonth(value))
  const [rangeAnchorValue, setRangeAnchorValue] = useState('')
  const [isSelectingRangeEnd, setIsSelectingRangeEnd] = useState(false)
  const fieldRef = useRef(null)
  const rangeStartValue = deriveRangeStartValue(value, duration)
  const selectedDateLabel = buildScheduleLabel(rangeStartValue, value)
  const selectedDurationLabel = formatDurationValue(duration, 'Select a start and an end date')
  const calendarDays = createCalendarDays(displayedMonth, rangeStartValue, value)

  useEffect(() => {
    setDisplayedMonth(getCalendarMonth(value))
  }, [value])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (!fieldRef.current?.contains(event.target)) {
        setIsOpen(false)
        setRangeAnchorValue('')
        setIsSelectingRangeEnd(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setRangeAnchorValue('')
        setIsSelectingRangeEnd(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const closeCalendar = () => {
    setIsOpen(false)
    setRangeAnchorValue('')
    setIsSelectingRangeEnd(false)
  }

  const handleSelectDate = (nextValue) => {
    const selectedDate = parseDateValue(nextValue)

    if (!selectedDate || isWeekend(selectedDate)) {
      return
    }

    if (!isSelectingRangeEnd || !rangeAnchorValue) {
      onChange({
        duration: '1',
        dueDate: nextValue,
      })
      setDisplayedMonth(getCalendarMonth(nextValue))
      setRangeAnchorValue(nextValue)
      setIsSelectingRangeEnd(true)
      return
    }

    const anchorDate = parseDateValue(rangeAnchorValue)

    if (!anchorDate) {
      onChange({
        duration: '1',
        dueDate: nextValue,
      })
      closeCalendar()
      return
    }

    const [rangeStartDate, rangeEndDate] = orderDateRange(anchorDate, selectedDate)

    onChange({
      duration: String(countBusinessDays(rangeStartDate, rangeEndDate)),
      dueDate: formatIsoDate(rangeEndDate),
    })
    closeCalendar()
  }

  const handleSelectToday = () => {
    const todayValue = formatIsoDate(getNextBusinessDay(new Date()))

    onChange({
      duration: '1',
      dueDate: todayValue,
    })
    closeCalendar()
  }

  const handleClear = () => {
    onChange({
      duration: '',
      dueDate: '',
    })
    closeCalendar()
  }

  return (
    <div className="costing-simple__calendar" ref={fieldRef}>
      <button
        type="button"
        className="costing-simple__date-shell costing-simple__date-shell--trigger"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        disabled={disabled}
        aria-expanded={isOpen}
      >
        <span className="costing-simple__date-icon" aria-hidden="true">
          <CalendarIcon />
        </span>

        <span className="costing-simple__date-copy">
          <strong>{selectedDateLabel}</strong>
          <span>{isSelectingRangeEnd ? 'Select the end date' : selectedDurationLabel}</span>
        </span>
      </button>

      {isOpen ? (
        <div className="costing-simple__calendar-panel">
          <div className="costing-simple__calendar-summary">
            <div className="costing-simple__calendar-meta">
              <span>Start</span>
              <strong>{formatDateValue(rangeStartValue, 'Not set')}</strong>
            </div>

            <div className="costing-simple__calendar-meta">
              <span>End</span>
              <strong>{formatDateValue(value, 'Not set')}</strong>
            </div>
          </div>

          <p className="costing-simple__calendar-hint">
            {isSelectingRangeEnd
              ? 'Choose the end date. Saturday and Sunday are excluded automatically.'
              : 'Select a start date, then an end date. Saturday and Sunday are excluded automatically.'}
          </p>

          <div className="costing-simple__calendar-head">
            <button
              type="button"
              className="costing-simple__calendar-nav"
              aria-label="Previous month"
              onClick={() => setDisplayedMonth((currentValue) => shiftMonth(currentValue, -1))}
              disabled={disabled}
            >
              <ChevronIcon direction="previous" />
            </button>

            <strong>{CALENDAR_MONTH_FORMATTER.format(displayedMonth)}</strong>

            <button
              type="button"
              className="costing-simple__calendar-nav"
              aria-label="Next month"
              onClick={() => setDisplayedMonth((currentValue) => shiftMonth(currentValue, 1))}
              disabled={disabled}
            >
              <ChevronIcon direction="next" />
            </button>
          </div>

          <div className="costing-simple__calendar-weekdays" aria-hidden="true">
            {CALENDAR_WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="costing-simple__calendar-days">
            {calendarDays.map((day) => (
              <button
                key={day.isoValue}
                type="button"
                className={`costing-simple__calendar-day${
                  day.isCurrentMonth ? '' : ' costing-simple__calendar-day--outside'
                }${day.isToday ? ' costing-simple__calendar-day--today' : ''}${
                  day.isWeekend ? ' costing-simple__calendar-day--weekend' : ''
                }${day.isInRange ? ' costing-simple__calendar-day--range' : ''}${
                  day.isRangeStart ? ' costing-simple__calendar-day--range-start' : ''
                }${day.isRangeEnd ? ' costing-simple__calendar-day--range-end' : ''
                }`}
                onClick={() => handleSelectDate(day.isoValue)}
                disabled={disabled || day.isWeekend}
                aria-pressed={day.isInRange}
              >
                {day.label}
              </button>
            ))}
          </div>

          <div className="costing-simple__calendar-actions">
            <button
              type="button"
              className="costing-simple__calendar-action"
              onClick={handleSelectToday}
              disabled={disabled}
            >
              Today
            </button>

            <button
              type="button"
              className="costing-simple__calendar-action costing-simple__calendar-action--ghost"
              onClick={handleClear}
              disabled={disabled}
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const CostingSubElementModal = memo(function CostingSubElementModal({
  modal,
  form,
  errorMessage,
  isSubmitting,
  statusOptions = COSTING_SUB_ELEMENT_STATUS_OPTIONS,
  onRequestClose,
  onSubmit,
  onFieldChange,
}) {
  useEffect(() => {
    if (!modal) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onRequestClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [modal, onRequestClose])

  if (!modal) {
    return null
  }

  const isViewMode = modal.mode === 'view'
  const durationLabel = formatDurationValue(form.duration)
  const dueDateLabel = formatDateValue(form.dueDate, 'Not planned')
  const rangeStartValue = deriveRangeStartValue(form.dueDate, form.duration)
  const scheduleLabel = buildScheduleLabel(rangeStartValue, form.dueDate)

  const handleSubmit = (event) => {
    if (isViewMode) {
      event.preventDefault()
      return
    }

    onSubmit(event)
  }

  const handleDurationChange = (value) => {
    onFieldChange('duration', value)

    const nextDuration = parsePositiveInteger(value)

    if (!nextDuration) {
      onFieldChange('dueDate', '')
      return
    }

    const todayBusinessDate = getNextBusinessDay(new Date())
    const nextDueDate = addBusinessDays(todayBusinessDate, nextDuration)

    if (nextDueDate) {
      onFieldChange('dueDate', formatIsoDate(nextDueDate))
    }
  }

  const handleScheduleChange = ({ dueDate, duration }) => {
    onFieldChange('duration', duration)
    onFieldChange('dueDate', dueDate)
  }

  return (
    <div className="workspace-modal-backdrop" role="presentation" onClick={onRequestClose}>
        <div
          className="workspace-modal costing-simple__modal costing-simple__modal--sub-element"
          role="dialog"
          aria-modal="true"
          aria-labelledby="costing-sub-element-modal-title"
          onClick={(event) => event.stopPropagation()}
        >
        <div className="workspace-modal__header">
          <span className="eyebrow">{isViewMode ? 'Sub-element overview' : 'Fill sub-element'}</span>
          <button
            type="button"
            className="workspace-modal__close"
            aria-label="Close costing sub-element dialog"
            onClick={onRequestClose}
            disabled={isSubmitting}
          >
            x
          </button>
        </div>

        <div className="workspace-modal__copy">
          <h2 id="costing-sub-element-modal-title">{modal.subElementTitle}</h2>
          <p>{`${modal.stageLabel} ${modal.costingReference}`}</p>
        </div>

        <form className="workspace-modal__form" onSubmit={handleSubmit}>
          <div className="workspace-modal__grid">
            <label className="workspace-modal__field">
              <span>Costing reference</span>
              <div className="workspace-modal__value">{modal.costingReference}</div>
            </label>

            <label className="workspace-modal__field">
              <span>{modal.pilotRoleLabel || 'Pilot'}</span>
              <div className="workspace-modal__value">{modal.pilot}</div>
            </label>

            <label className="workspace-modal__field">
              <span>Esc Level 1 / Approver</span>
              <div className="workspace-modal__value">{modal.approver}</div>
            </label>

            <label className="workspace-modal__field" htmlFor="costing-sub-element-status">
              <span>Status</span>
              {isViewMode ? (
                <div className="workspace-modal__value workspace-modal__value--wrap">
                  {form.status}
                </div>
              ) : (
                <select
                  id="costing-sub-element-status"
                  value={form.status}
                  onChange={(event) => onFieldChange('status', event.target.value)}
                  disabled={isSubmitting}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              )}
            </label>

            <label className="workspace-modal__field" htmlFor="costing-sub-element-duration">
              <span>Duration</span>
              {isViewMode ? (
                <div className="workspace-modal__value workspace-modal__value--wrap">
                  {durationLabel}
                </div>
              ) : (
                <input
                  id="costing-sub-element-duration"
                  type="number"
                  min="1"
                  step="1"
                  value={form.duration}
                  onChange={(event) => handleDurationChange(event.target.value)}
                  placeholder="Example: 5"
                  disabled={isSubmitting}
                />
              )}
            </label>

            <div className="workspace-modal__field">
              <span>Deadline</span>
              {isViewMode ? (
                <div className="workspace-modal__value workspace-modal__value--wrap">
                  <span>{scheduleLabel}</span>
                  <span>{dueDateLabel}</span>
                </div>
              ) : (
                <DeadlineCalendarField
                  value={form.dueDate}
                  duration={form.duration}
                  disabled={isSubmitting}
                  onChange={handleScheduleChange}
                />
              )}
            </div>
          </div>

          {errorMessage && !isViewMode ? (
            <div className="workspace-modal__feedback workspace-modal__feedback--error">
              {errorMessage}
            </div>
          ) : null}

          <div className="workspace-modal__actions">
            <button
              type="button"
              className="button button-ghost"
              onClick={onRequestClose}
              disabled={isSubmitting}
            >
              {isViewMode ? 'Close' : 'Cancel'}
            </button>

            {!isViewMode ? (
              <button type="submit" className="button button-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save update'}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
})

export default CostingSubElementModal
