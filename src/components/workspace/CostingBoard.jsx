import { useEffect, useState } from 'react'
import { getRfqs, getRfqCostingsByRfqId } from '../../services/api'
import CostingCreateModal from './CostingCreateModal'


const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const INTEGER_FORMATTER = new Intl.NumberFormat('en-GB')
const CURRENCY_FORMATTER = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function getOptionalText(value) {
  const normalizedValue = String(value ?? '').trim()
  return normalizedValue || null
}

function getDisplayText(value, fallback = 'Not specified') {
  return getOptionalText(value) || fallback
}

function formatDateValue(value, fallback = 'Not scheduled') {
  const normalizedValue = getOptionalText(value)

  if (!normalizedValue) {
    return fallback
  }

  const date = new Date(normalizedValue)

  if (Number.isNaN(date.getTime())) {
    return normalizedValue
  }

  return DATE_FORMATTER.format(date)
}

function formatNumberValue(value, fallback = 'Not specified') {
  const normalizedValue = getOptionalText(value)

  if (!normalizedValue) {
    return fallback
  }

  const number = Number.parseFloat(normalizedValue.replace(/,/g, '.'))

  if (!Number.isFinite(number)) {
    return normalizedValue
  }

  return INTEGER_FORMATTER.format(number)
}

function formatCurrencyValue(value, fallback = 'Not specified') {
  const normalizedValue = getOptionalText(value)

  if (!normalizedValue) {
    return fallback
  }

  const number = Number.parseFloat(normalizedValue.replace(/,/g, '.'))

  if (!Number.isFinite(number)) {
    return normalizedValue
  }

  return CURRENCY_FORMATTER.format(number)
}

function getUniqueValues(values) {
  const seenValues = new Set()
  const uniqueValues = []

  values.forEach((value) => {
    const normalizedValue = getOptionalText(value)

    if (!normalizedValue) {
      return
    }

    const uniqueKey = normalizedValue.toLowerCase()

    if (seenValues.has(uniqueKey)) {
      return
    }

    seenValues.add(uniqueKey)
    uniqueValues.push(normalizedValue)
  })

  return uniqueValues
}

function formatCompactList(values, fallback = 'Not specified') {
  const uniqueValues = getUniqueValues(values)

  if (uniqueValues.length === 0) {
    return fallback
  }

  if (uniqueValues.length <= 2) {
    return uniqueValues.join(', ')
  }

  return `${uniqueValues.slice(0, 2).join(', ')} +${uniqueValues.length - 2}`
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function createProjectId(projectName, customerName, reference) {
  const slugSource = [projectName, customerName, reference].filter(Boolean).join('-')
  const slug = slugSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || `project-${reference || 'rfq'}`
}

function buildProjectDisplayName({ customerName, projectSubject, reference }) {
  const nameParts = [customerName, projectSubject, reference].filter(Boolean)

  if (nameParts.length > 0) {
    return nameParts.join(' - ')
  }

  if (reference) {
    return `Project - ${reference}`
  }

  return 'Project'
}

function getCostingTypeTone(type) {
  if (type === 'Initial Costing') {
    return 'initial'
  }

  if (type === 'Improved Costing') {
    return 'improved'
  }

  if (type === 'Last Call Costing') {
    return 'last-call'
  }

  return 'rfq'
}

function normalizeCosting(costing) {
  const type = getDisplayText(costing?.type, 'Costing')
  const reference = getDisplayText(costing?.reference, 'No reference')

  return {
    id: String(costing?.id ?? reference),
    type,
    typeTone: getCostingTypeTone(type),
    reference,
    summary: formatCompactList(
      [costing?.product_family, costing?.plant],
      'Linked costing entry',
    ),
  }
}

function normalizeRfq(rfq) {
  const rfqData = rfq?.rfq_data || {}
  const reference =
    getOptionalText(rfqData.systematic_rfq_id) || getDisplayText(rfq?.rfq_id, 'RFQ')
  const customerName = getOptionalText(rfqData.customer_name)
  const projectSubject =
    getOptionalText(rfqData.project_name) ||
    getOptionalText(rfqData.product_name) ||
    'Project'
  const projectName = buildProjectDisplayName({
    customerName,
    projectSubject,
    reference,
  })
  const costings = Array.isArray(rfq?.costings)
    ? rfq.costings.map((costing) => normalizeCosting(costing))
    : []

  return {
    id: getDisplayText(rfq?.rfq_id, reference),
    reference,
    customerName,
    projectName,
    title: getDisplayText(rfqData.product_name, 'Unnamed RFQ'),
    deliveryPlant: getDisplayText(rfqData.delivery_plant),
    quotationDate: formatDateValue(rfqData.quotation_expected_date),
    annualVolume: formatNumberValue(rfqData.annual_volume),
    targetPrice: formatCurrencyValue(rfqData.target_price_eur),
    deliveryZone: getOptionalText(rfqData.delivery_zone),
    productLine: getOptionalText(rfqData.product_line_acronym),
    sopYear: getOptionalText(rfqData.sop_year),
    costings,
    status: costings.length > 0 ? 'Costing linked' : 'Awaiting costing',
    statusTone: costings.length > 0 ? 'info' : 'warning',
  }
}

function buildProjectDescription(rfqs) {
  const linkedCostingCount = rfqs.reduce((count, rfq) => count + rfq.costings.length, 0)
  const awaitingCostingCount = rfqs.filter((rfq) => rfq.costings.length === 0).length

  if (awaitingCostingCount === 0) {
    return `${pluralize(rfqs.length, 'RFQ')} • ${pluralize(linkedCostingCount, 'linked costing')}`
  }

  return `${pluralize(rfqs.length, 'RFQ')} • ${pluralize(linkedCostingCount, 'linked costing')} • ${pluralize(awaitingCostingCount, 'RFQ')} awaiting costing`
}

function buildProjectStatus(rfqs) {
  const awaitingCostingCount = rfqs.filter((rfq) => rfq.costings.length === 0).length

  if (awaitingCostingCount === 0) {
    return {
      label: 'Costing linked',
      tone: 'done',
    }
  }

  if (awaitingCostingCount === rfqs.length) {
    return {
      label: 'Awaiting costing',
      tone: 'warning',
    }
  }

  return {
    label: 'Partially linked',
    tone: 'info',
  }
}

function groupRfqsIntoProjects(rfqs) {
  const groupedProjects = new Map()

  rfqs
    .map((rfq) => normalizeRfq(rfq))
    .forEach((rfq) => {
      const projectId = createProjectId(rfq.projectName, rfq.customerName, rfq.reference)
      const existingProject = groupedProjects.get(projectId)

      if (existingProject) {
        existingProject.rfqs.push(rfq)
        return
      }

      groupedProjects.set(projectId, {
        id: projectId,
        title: rfq.projectName,
        rfqs: [rfq],
      })
    })

  return Array.from(groupedProjects.values()).map((project) => {
    const totalCostings = project.rfqs.reduce((count, rfq) => count + rfq.costings.length, 0)
    const projectStatus = buildProjectStatus(project.rfqs)

    return {
      ...project,
      description: buildProjectDescription(project.rfqs),
      meta: [
        formatCompactList(
          project.rfqs.map((rfq) => rfq.deliveryPlant),
          'Plant not specified',
        ),
        formatCompactList(
          project.rfqs.map((rfq) => rfq.deliveryZone),
          'Zone not specified',
        ),
        formatCompactList(
          project.rfqs.map((rfq) => rfq.productLine),
          'Line not specified',
        ),
        `SOP ${formatCompactList(
          project.rfqs.map((rfq) => rfq.sopYear),
          'not specified',
        )}`,
      ],
      costingCount: totalCostings,
      status: projectStatus.label,
      statusTone: projectStatus.tone,
    }
  })
}

function getProjectRfqCount(project) {
  return project.rfqs.length
}

function getAwaitingCostingCount(projects) {
  return projects.reduce(
    (count, project) =>
      count + project.rfqs.filter((rfq) => rfq.costings.length === 0).length,
    0,
  )
}

function CostingBoardState({
  title,
  description,
  actionLabel,
  onAction,
  role = 'status',
}) {
  return (
    <div className="costing-board__state" role={role}>
      <div className="costing-board__state-copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      {actionLabel && onAction ? (
        <div className="costing-board__state-actions">
          <button type="button" className="button button-ghost" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function CostingPill({ children, tone = 'muted' }) {
  return <span className={`costing-pill costing-pill--${tone}`}>{children}</span>
}

function CostingChevron({ expanded }) {
  return (
    <svg
      className={`costing-project__chevron${expanded ? ' costing-project__chevron--expanded' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7.5 10.25L12 14.75L16.5 10.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CostingTypeBadge({ type, tone }) {
  return <span className={`costing-type costing-type--${tone}`}>{type}</span>
}

export default function CostingBoard() {
  const [projects, setProjects] = useState([])
  const [expandedProjectIds, setExpandedProjectIds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRfqId, setSelectedRfqId] = useState(null)

  useEffect(() => {
    let isActive = true

    async function loadRfqs() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await getRfqs()
        const nextProjects = groupRfqsIntoProjects(Array.isArray(response) ? response : [])

        if (!isActive) {
          return
        }

        setProjects(nextProjects)
        setExpandedProjectIds((currentIds) => {
          const availableIds = nextProjects.map((project) => project.id)
          const nextExpandedIds = currentIds.filter((projectId) =>
            availableIds.includes(projectId),
          )

          return nextExpandedIds.length > 0 ? nextExpandedIds : availableIds.slice(0, 1)
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        setProjects([])
        setExpandedProjectIds([])
        setErrorMessage(error.message || 'Unable to load RFQs from backend.')
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadRfqs()

    return () => {
      isActive = false
    }
  }, [reloadKey])

  const totalProjects = projects.length
  const totalRfqs = projects.reduce((count, project) => count + getProjectRfqCount(project), 0)
  const totalCostings = projects.reduce((count, project) => count + project.costingCount, 0)
  const awaitingCostingCount = getAwaitingCostingCount(projects)

  const boardStats = [
    { label: 'Projects', value: totalProjects, tone: 'neutral' },
    { label: 'RFQs', value: totalRfqs, tone: 'info' },
    { label: 'Linked costings', value: totalCostings, tone: 'neutral' },
    { label: 'Awaiting costing', value: awaitingCostingCount, tone: 'warning' },
  ]

  const toggleProject = (projectId) => {
    setExpandedProjectIds((currentIds) =>
      currentIds.includes(projectId)
        ? currentIds.filter((currentId) => currentId !== projectId)
        : [...currentIds, projectId],
    )
  }

  const openCreateModal = (rfqId) => {
    setSelectedRfqId(rfqId)
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setSelectedRfqId(null)
  }

  const handleCostingCreated = async () => {
    // Recharger les données pour afficher le nouveau costing
    setReloadKey(prev => prev + 1)
  }

  return (
    <section className="costing-board" aria-label="Costing projects board">
      <header className="costing-board__toolbar">
        <div className="costing-board__copy">
          <span className="eyebrow">Costing workspace</span>
          <h2>PL Assembly : Costing</h2>
          <p>
            RFQs are loaded from the backend, grouped by project, and each linked costing entry is
            shown under its RFQ as soon as it exists.
          </p>
        </div>

        <div className="costing-board__summary">
          {boardStats.map((stat) => (
            <article key={stat.label} className={`costing-summary costing-summary--${stat.tone}`}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      </header>

      {isLoading ? (
        <CostingBoardState
          title="Loading RFQs"
          description="The costing workspace is fetching RFQs from the backend and preparing the project groups."
        />
      ) : null}

      {!isLoading && errorMessage ? (
        <CostingBoardState
          title="Unable to load RFQs"
          description={errorMessage}
          actionLabel="Retry"
          onAction={() => setReloadKey((currentValue) => currentValue + 1)}
          role="alert"
        />
      ) : null}

      {!isLoading && !errorMessage && projects.length === 0 ? (
        <CostingBoardState
          title="No RFQ available"
          description="No RFQ was returned by the backend for the costing workspace yet."
          actionLabel="Refresh"
          onAction={() => setReloadKey((currentValue) => currentValue + 1)}
        />
      ) : null}

      {!isLoading && !errorMessage && projects.length > 0 ? (
        <div className="costing-board__projects">
          {projects.map((project) => {
            const isExpanded = expandedProjectIds.includes(project.id)
            const rfqCount = getProjectRfqCount(project)

            return (
              <article
                key={project.id}
                className={`costing-project${isExpanded ? ' costing-project--expanded' : ''}`}
              >
                <div className="costing-project__summary">
                  <div className="costing-project__summary-main">
                    <div className="costing-project__heading">
                      <h3>{project.title}</h3>
                    </div>

                    <p>{project.description}</p>

                    <div className="costing-project__meta">
                      {project.meta.map((token) => (
                        <span key={`${project.id}-${token}`} className="costing-token">
                          {token}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="costing-project__summary-side">
                    <div className="costing-project__counts">
                      <span>{pluralize(rfqCount, 'RFQ')}</span>
                      <span>{pluralize(project.costingCount, 'linked costing')}</span>
                    </div>

                    <div className="costing-project__actions">
                      <CostingPill tone={project.statusTone}>{project.status}</CostingPill>
                      <button
                        type="button"
                        className="costing-project__toggle"
                        onClick={() => toggleProject(project.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`${project.id}-rfqs`}
                      >
                        <span>{isExpanded ? 'Hide RFQs' : 'View RFQs'}</span>
                        <CostingChevron expanded={isExpanded} />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="costing-project__content" id={`${project.id}-rfqs`}>
                    {project.rfqs.map((rfq) => (
                      <article key={rfq.id} className="costing-element">
                        <div className="costing-element__row">
                          <div className="costing-element__main">
                            <div className="costing-element__topline">
                              <CostingTypeBadge type="RFQ" tone="rfq" />
                              <span className="costing-element__ref">{rfq.reference}</span>
                            </div>
                            <strong>{rfq.title}</strong>
                          </div>

                          <div className="costing-element__meta">
                            <span className="costing-token">
                              {getDisplayText(rfq.customerName, 'Customer not specified')}
                            </span>
                            <CostingPill tone={rfq.statusTone}>{rfq.status}</CostingPill>
                          </div>
                        </div>

                        <div className="costing-element__fields">
                          <article className="costing-field">
                            <span>Delivery plant</span>
                            <strong>{rfq.deliveryPlant}</strong>
                          </article>

                          <article className="costing-field">
                            <span>Quote due</span>
                            <strong>{rfq.quotationDate}</strong>
                          </article>

                          <article className="costing-field">
                            <span>Annual volume</span>
                            <strong>{rfq.annualVolume}</strong>
                          </article>

                          <article className="costing-field">
                            <span>Target price</span>
                            <strong>{rfq.targetPrice}</strong>
                          </article>
                        </div>

                        <div className="costing-element__sublist">
                          <div className="costing-element__subhead">
                            <strong>Linked costings</strong>
                            <span>{pluralize(rfq.costings.length, 'item')}</span>
                            <button
                              type="button"
                              className="costing-add-button"
                              onClick={() => openCreateModal(rfq.id)}
                            >
                              + Add Initial Costing
                            </button>
                          </div>

                          {rfq.costings.length > 0 ? (
                            rfq.costings.map((costing) => (
                              <div key={costing.id} className="costing-subrow">
                                <div className="costing-subrow__main">
                                  <div className="costing-subrow__title">
                                    <CostingTypeBadge type={costing.type} tone={costing.typeTone} />
                                    <strong>{costing.type} [{costing.reference}]</strong>
                                  </div>
                                  <span className="costing-subrow__summary">{costing.summary}</span>
                                </div>

                                <div className="costing-subrow__meta">
                                  <CostingPill tone="info">Active</CostingPill>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="costing-empty-state">
                              <strong>No costing linked yet</strong>
                              <p>
                                This RFQ has been loaded into costing and will display linked
                                costing entries here once they are created.
                              </p>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : null}

      {showCreateModal && (
        <CostingCreateModal
          rfqId={selectedRfqId}
          onClose={closeCreateModal}
          onSuccess={handleCostingCreated}
        />
      )}
    </section>
  )
}
