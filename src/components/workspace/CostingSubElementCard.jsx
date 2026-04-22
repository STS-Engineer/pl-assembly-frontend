const STATUS_TONE_MAP = {
  done: 'done',
  'late!': 'critical',
  'help!!!': 'critical',
  'in progress': 'info',
  'ready to start': 'info',
  'escalation level 1': 'info',
  'question to pm': 'warning',
  'question to sales': 'warning',
  'question to pl': 'warning',
  'qustion to pm': 'warning',
  'qustion to sales': 'warning',
  'qustion to pl': 'warning',
}

function getStatusTone(status) {
  const normalizedStatus = String(status || '').toLowerCase().trim()
  return STATUS_TONE_MAP[normalizedStatus] || 'neutral'
}

const APPROVAL_TONE_MAP = {
  approved: 'done',
  'not approved': 'critical',
  'need to be reworked': 'critical',
  'need to b reworked': 'critical',
  'to be approved': 'warning',
  'ready for app': 'warning',
}

function getApprovalTone(approvalStatus) {
  const normalizedStatus = String(approvalStatus || '').toLowerCase().trim()
  return APPROVAL_TONE_MAP[normalizedStatus] || 'neutral'
}

function isApprovedSubElement(approvalStatus) {
  return String(approvalStatus || '').toLowerCase().trim() === 'approved'
}

function calculateWorkingDays(fromDate, toDate) {
  let workingDays = 0
  let currentDate = new Date(fromDate)
  const endDate = new Date(toDate)

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()
    // Count only Monday (1) to Friday (5), exclude Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return workingDays
}

function parseDate(dateValue) {
  if (!dateValue) return null
  const date = new Date(dateValue)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDurationLabel(value, dueDate) {
  // If dueDate is provided, calculate duration from today
  if (dueDate) {
    const parsedDueDate = parseDate(dueDate)
    if (parsedDueDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      parsedDueDate.setHours(0, 0, 0, 0)

      if (parsedDueDate >= today) {
        const workingDays = calculateWorkingDays(today, parsedDueDate)
        return `${workingDays} working day${workingDays !== 1 ? 's' : ''} remaining`
      } else {
        const workingDays = calculateWorkingDays(parsedDueDate, today)
        return `${workingDays} working day${workingDays !== 1 ? 's' : ''} overdue`
      }
    }
  }

  // Fallback to static duration value
  const duration = Number.parseInt(String(value ?? '').trim(), 10)

  if (!Number.isInteger(duration) || duration <= 0) {
    return 'Not defined'
  }

  return `${duration} working day${duration > 1 ? 's' : ''}`
}

export default function CostingSubElementCard({
  subElement,
  canFill,
  canAssignPilot = false,
  onAssignPilot,
  onFill,
  onView,
}) {
  const durationLabel = formatDurationLabel(subElement.duration, subElement.dueDate)
  const dueDateLabel = subElement.dueDateLabel || 'Not planned'
  const statusTone = getStatusTone(subElement.status)
  const approvalTone = getApprovalTone(subElement.approvalStatus)
  const isApproved = isApprovedSubElement(subElement.approvalStatus)

  return (
    <section className={`costing-simple__sub-element costing-simple__sub-element--${statusTone}`}>
      <div className="costing-simple__sub-element-head">
        <div className="costing-simple__sub-element-copy">
          <span className="costing-simple__sub-element-index">{subElement.index || '01'}</span>

          <div className="costing-simple__sub-element-body">
            <div className="costing-simple__sub-element-title-row">
              <strong>{subElement.title}</strong>

              <div className="costing-simple__sub-element-tags">
                <span className={`costing-simple__pill costing-simple__pill--${statusTone}`}>
                  {subElement.status}
                </span>
                <span className={`costing-simple__pill costing-simple__pill--${approvalTone}`}>
                  {subElement.approvalStatus}
                </span>
              </div>
            </div>

            <p>{subElement.description}</p>
          </div>
        </div>
      </div>

      <div className="costing-simple__sub-element-grid">
        <article className="costing-simple__sub-element-field">
          <span>{subElement.pilotRoleLabel || 'Pilot'}</span>
          <strong>{subElement.pilot || 'Not assigned'}</strong>
        </article>

        <article className="costing-simple__sub-element-field">
          <span>{subElement.approverRoleLabel || 'Approver'}</span>
          <strong>{subElement.approver || 'Not assigned'}</strong>
        </article>

        <article className="costing-simple__sub-element-field">
          <span>Duration</span>
          <strong>{durationLabel}</strong>
        </article>

        <article className="costing-simple__sub-element-field">
          <span>Deadline</span>
          <strong>{dueDateLabel}</strong>
        </article>
      </div>

      <div className="costing-simple__sub-element-footer">
        <p className="costing-simple__sub-element-note">
          Fill access: assigned pilot or assigned manager only.
        </p>

        <div className="costing-simple__sub-element-actions">
          {canAssignPilot ? (
            <button
              type="button"
              className="button button-ghost costing-simple__sub-element-action"
              onClick={onAssignPilot}
            >
              {subElement.pilot && subElement.pilot !== 'Project pilot'
                ? 'Reassign pilot'
                : 'Assign pilot'}
            </button>
          ) : null}

          {canFill ? (
            <button
              type="button"
              className="button button-primary costing-simple__sub-element-action"
              onClick={onFill}
              disabled={isApproved}
              title={isApproved ? 'This step is already approved.' : undefined}
            >
              Fill form
            </button>
          ) : null}

          <button
            type="button"
            className="button button-secondary costing-simple__sub-element-action"
            onClick={onView}
          >
            View
          </button>
        </div>
      </div>
    </section>
  )
}
