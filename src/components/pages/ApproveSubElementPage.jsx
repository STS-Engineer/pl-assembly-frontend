import { useState, useEffect } from 'react'
import { useRouter } from '../router/AppRouter'
import { routes } from '../router/routes'
import { getApprovalSubElementByToken, approveSubElementByToken } from '../../services/api'
import CostingToast from '../workspace/CostingToast'
import '../workspace/workspace.css'
import './ApproveSubElement.css'

const INITIAL_SUB_ELEMENT_APPROVAL_STATUS_VALUES = [
  'Not requested',
  'Approved',
  'Not approved',
  'To be approved',
  'Ready for app',
  'Need to be reworked',
]

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function getOptionalText(value) {
  const normalizedValue = String(value ?? '').trim()
  return normalizedValue || null
}

function getProjectDataSources(source = {}) {
  const candidateSources = [
    source,
    source.rfq_data,
    source.rfqData,
    source.rfq,
    source.rfq?.rfq_data,
    source.rfq?.rfqData,
    source.rfq_costing,
    source.rfq_costing?.rfq,
    source.rfq_costing?.rfq?.rfq_data,
    source.rfq_costing?.rfq?.rfqData,
    source.rfqCosting,
    source.rfqCosting?.rfq,
    source.rfqCosting?.rfq?.rfq_data,
    source.rfqCosting?.rfq?.rfqData,
  ]

  return candidateSources.filter(
    (candidateSource) => candidateSource && typeof candidateSource === 'object',
  )
}

function buildProjectDisplayName({ customerName, projectSubject, reference }) {
  const nameParts = [customerName, projectSubject, reference].filter(Boolean)

  if (nameParts.length > 0) {
    return nameParts.join(' - ')
  }

  if (reference) {
    return `Project - ${reference}`
  }

  return null
}

function getManagerOptions(subElement = {}) {
  const managers = Array.isArray(subElement.managers) ? subElement.managers : []

  return managers.map((manager, index) => {
    const id = getOptionalText(manager?.id)
    const email = getOptionalText(manager?.email)
    const fullName =
      getOptionalText(manager?.full_name ?? manager?.fullName) ||
      email ||
      `Manager ${index + 1}`

    return {
      selectionValue: id || email || `manager-${index + 1}`,
      id,
      email,
      fullName,
    }
  })
}

function resolveInitialManagerValue(subElement = {}, managerOptions = []) {
  const currentApprover = getOptionalText(subElement.approver)

  if (currentApprover) {
    const matchedManager = managerOptions.find(
      (manager) =>
        manager.fullName === currentApprover ||
        manager.email === currentApprover ||
        manager.id === currentApprover,
    )

    if (matchedManager) {
      return matchedManager.selectionValue
    }
  }

  return managerOptions[0]?.selectionValue || ''
}

function mergeApprovalResponse(response) {
  if (!response || typeof response !== 'object') {
    return response
  }

  return response?.sub_element
    ? {
        ...response,
        ...response.sub_element,
      }
    : response
}

function formatDateValue(value, fallback = 'Not planned') {
  if (!value) {
    return fallback
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : DATE_FORMATTER.format(date)
}

function formatDurationValue(value, fallback = 'Not defined') {
  const duration = Number.parseInt(value, 10)

  if (!Number.isFinite(duration) || duration <= 0) {
    return fallback
  }

  return `${duration} working day${duration > 1 ? 's' : ''}`
}

function getProjectDisplayName(subElement = {}) {
  const projectDataSource =
    getProjectDataSources(subElement).find(
      (candidateSource) =>
        getOptionalText(candidateSource.customer_name ?? candidateSource.customerName) ||
        getOptionalText(
          candidateSource.project_name ??
            candidateSource.projectName ??
            candidateSource.product_name ??
            candidateSource.productName,
        ) ||
        getOptionalText(
          candidateSource.systematic_rfq_id ??
            candidateSource.systematicRfqId ??
            candidateSource.rfq_id ??
            candidateSource.rfqId,
        ),
    ) || {}
  const customerName = getOptionalText(
    projectDataSource.customer_name ?? projectDataSource.customerName,
  )
  const projectSubject = getOptionalText(
    projectDataSource.project_name ??
      projectDataSource.projectName ??
      projectDataSource.product_name ??
      projectDataSource.productName,
  )
  const reference = getOptionalText(
    projectDataSource.systematic_rfq_id ??
      projectDataSource.systematicRfqId ??
      projectDataSource.rfq_id ??
      projectDataSource.rfqId,
  )
  const projectDisplayName = buildProjectDisplayName({
    customerName,
    projectSubject,
    reference,
  })

  if (projectDisplayName) {
    return projectDisplayName
  }

  return (
    getOptionalText(subElement.project_display_name) ||
    getOptionalText(subElement.projectDisplayName) ||
    getOptionalText(subElement.project_title) ||
    getOptionalText(subElement.projectTitle) ||
    getOptionalText(subElement.project) ||
    'N/A'
  )
}

function isDesignTypeStep(subElement = {}) {
  const normalizedKey = getOptionalText(subElement.key)
  const normalizedTitle = getOptionalText(
    subElement.title ?? subElement.sub_element_title,
  )

  return (
    normalizedKey === 'needed-data-understood' ||
    normalizedTitle === 'All needed data are available and understood'
  )
}

export default function ApproveSubElementPage({ routeParams = {} }) {
  const { navigate } = useRouter()
  const token = routeParams.token || ''
  const [subElement, setSubElement] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastFeedback, setToastFeedback] = useState('')
  const [toastFeedbackType, setToastFeedbackType] = useState('success')
  const [statusOptions, setStatusOptions] = useState([])
  const [selectedManagerValue, setSelectedManagerValue] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Invalid approval link')
      setIsLoading(false)
      return
    }

    async function loadApprovalData() {
      setIsLoading(true)
      setError('')

      try {
        const response = await getApprovalSubElementByToken(token)
        const data = mergeApprovalResponse(response)
        const managerOptions = getManagerOptions(data)

        setSubElement(data)
        setSelectedStatus(data.approval_status || data.approvalStatus || '')
        setSelectedManagerValue(resolveInitialManagerValue(data, managerOptions))

        // Extract status options from response
        if (response.status_options && Array.isArray(response.status_options)) {
          setStatusOptions(response.status_options)
        } else {
          // Default status options
          setStatusOptions(INITIAL_SUB_ELEMENT_APPROVAL_STATUS_VALUES)
        }
      } catch (err) {
        setError(err.message || 'Failed to load approval data')
      } finally {
        setIsLoading(false)
      }
    }

    loadApprovalData()
  }, [token])

  const handleApprove = async (e) => {
    e.preventDefault()

    if (!subElement || !selectedStatus) {
      setError('Please select a status before approving')
      return
    }

    const managerOptions = getManagerOptions(subElement)
    const selectedManager =
      managerOptions.find((manager) => manager.selectionValue === selectedManagerValue) || null
    const persistedDesignType = getOptionalText(
      subElement.design_type ?? subElement.designType,
    )

    if (managerOptions.length > 0 && !selectedManager) {
      setError('Please select a manager before approving')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await approveSubElementByToken(token, {
        approval_status: selectedStatus,
        ...(isDesignTypeStep(subElement) && persistedDesignType
          ? { design_type: persistedDesignType }
          : {}),
        approver: selectedManager?.fullName || subElement.approver,
        approver_email: selectedManager?.email,
        approver_id: selectedManager?.id,
        manager_id: selectedManager?.id,
      })
      const savedSubElement = mergeApprovalResponse(response)

      if (savedSubElement && typeof savedSubElement === 'object') {
        const nextSubElement = {
          ...(subElement || {}),
          ...savedSubElement,
          approver: savedSubElement.approver || selectedManager?.fullName || subElement.approver,
        }
        const nextManagerOptions = getManagerOptions(nextSubElement)

        setSubElement(nextSubElement)
        setSelectedStatus(
          savedSubElement.approval_status || savedSubElement.approvalStatus || selectedStatus,
        )
        setSelectedManagerValue(
          resolveInitialManagerValue(nextSubElement, nextManagerOptions),
        )
      }

      setToastFeedback('Sub-element approved successfully!')
      setToastFeedbackType('success')

      // Redirect to sign in after successful approval
      setTimeout(() => {
        navigate(routes.signIn)
      }, 2000)
    } catch (err) {
      const errorMessage = err.message || 'Failed to approve sub-element'
      setError(errorMessage)
      setToastFeedback(errorMessage)
      setToastFeedbackType('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="approve-sub-element-page">
        <div className="approve-sub-element-page__container">
          <div className="workspace-modal costing-simple__modal">
            <div className="workspace-modal__header">
              <span className="eyebrow">Approve Sub-Element</span>
            </div>
            <div className="workspace-modal__copy">
              <p>Loading approval data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !subElement) {
    return (
      <div className="approve-sub-element-page">
        <div className="approve-sub-element-page__container">
          <div className="workspace-modal costing-simple__modal">
            <div className="workspace-modal__header">
              <span className="eyebrow">Approval Error</span>
            </div>
            <div className="workspace-modal__copy">
              <p>{error}</p>
            </div>
            <div className="workspace-modal__actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => navigate(routes.signIn)}
              >
                Return to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!subElement) {
    return (
      <div className="approve-sub-element-page">
        <div className="approve-sub-element-page__container">
          <div className="workspace-modal costing-simple__modal">
            <div className="workspace-modal__header">
              <span className="eyebrow">Approve Sub-Element</span>
            </div>
            <div className="workspace-modal__copy">
              <p>No sub-element data found</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const projectDisplayName = getProjectDisplayName(subElement)
  const managerOptions = getManagerOptions(subElement)

  return (
    <>
      <CostingToast
        feedback={toastFeedback}
        feedbackType={toastFeedbackType}
        onClose={() => setToastFeedback('')}
      />
      <div className="approve-sub-element-page">
        <div className="approve-sub-element-page__container">
          <div className="workspace-modal costing-simple__modal">
            <div className="workspace-modal__header">
              <span className="eyebrow">Approve Sub-Element</span>
              <button
                type="button"
                className="workspace-modal__close"
                aria-label="Close"
                onClick={() => navigate(routes.signIn)}
                disabled={isSubmitting}
              >
                x
              </button>
            </div>

            <div className="workspace-modal__copy">
              <h2>Review and approve first step : {subElement.title || subElement.sub_element_title || 'ALL needed data are available and understood'}</h2>
            </div>

            <form className="workspace-modal__form" onSubmit={handleApprove}>
              <div className="workspace-modal__grid">
                <label className="workspace-modal__field">
                  <span>Costing Reference</span>
                  <div className="workspace-modal__value">
                    {projectDisplayName}
                  </div>
                </label>

                <label className="workspace-modal__field">
                  <span>Pilot</span>
                  <div className="workspace-modal__value">{subElement.pilot || 'N/A'}</div>
                </label>

                <label className="workspace-modal__field">
                  <span>Manager</span>
                  {managerOptions.length > 0 ? (
                    <select
                      value={selectedManagerValue}
                      onChange={(event) => setSelectedManagerValue(event.target.value)}
                      disabled={isSubmitting}
                      required
                    >
                      <option value="">-- Select a manager --</option>
                      {managerOptions.map((manager) => (
                        <option key={manager.selectionValue} value={manager.selectionValue}>
                          {manager.fullName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="workspace-modal__value">{subElement.approver || 'N/A'}</div>
                  )}
                </label>

                <label className="workspace-modal__field">
                  <span>Duration</span>
                  <div className="workspace-modal__value">
                    {formatDurationValue(subElement.duration)}
                  </div>
                </label>

                <label className="workspace-modal__field">
                  <span>Deadline</span>
                  <div className="workspace-modal__value">
                    {formatDateValue(subElement.due_date || subElement.dueDate)}
                  </div>
                </label>

                <label className="workspace-modal__field" htmlFor="approval-status">
                  <span>Status to Approve</span>
                  <select
                    id="approval-status"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="">-- Select a status --</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {error && (
                <div className="workspace-modal__feedback workspace-modal__feedback--error">
                  {error}
                </div>
              )}

              <div className="workspace-modal__actions">
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => navigate(routes.signIn)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isSubmitting || !selectedStatus}
                >
                  {isSubmitting ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
