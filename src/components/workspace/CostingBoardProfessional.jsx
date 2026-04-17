import { useEffect, useState } from 'react'
import { createRfqCosting, getRfqs, updateRfqCosting } from '../../services/api'
import CostingBoardHeader from './CostingBoardHeader'
import CostingBoardState from './CostingBoardState'
import CostingProjectCard from './CostingProjectCard'
import CostingStageModal, { createEmptyCostingForm } from './CostingStageModal'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const INTEGER_FORMATTER = new Intl.NumberFormat('en-GB')
const currencyFormatterCache = new Map()

const CURRENCY_THEME_CONFIG = {
  EUR: {
    theme: 'eur',
    label: 'Euro',
  },
  USD: {
    theme: 'usd',
    label: 'USD',
  },
  CNY: {
    theme: 'cny',
    label: 'China',
  },
}

const COSTING_STAGES = [
  {
    key: 'initial',
    label: 'Initial Costing',
    description: 'First costing version prepared for the project.',
  },
  {
    key: 'improved',
    label: 'Improved Costing',
    description: 'Updated costing after technical or commercial review.',
  },
  {
    key: 'last-call',
    label: 'Last Call Costing',
    description: 'Final costing step before project closure.',
  },
]

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

function getCurrencyFormatter(currencyCode) {
  const normalizedCurrencyCode = String(currencyCode || 'EUR').toUpperCase()

  if (!currencyFormatterCache.has(normalizedCurrencyCode)) {
    currencyFormatterCache.set(
      normalizedCurrencyCode,
      new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: normalizedCurrencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    )
  }

  return currencyFormatterCache.get(normalizedCurrencyCode)
}

function formatCurrencyValue(value, currencyCode = 'EUR', fallback = 'Not specified') {
  const normalizedValue = getOptionalText(value)

  if (!normalizedValue) {
    return fallback
  }

  const number = Number.parseFloat(normalizedValue.replace(/,/g, '.'))

  if (!Number.isFinite(number)) {
    return normalizedValue
  }

  try {
    return getCurrencyFormatter(currencyCode).format(number)
  } catch {
    return normalizedValue
  }
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

function normalizeCurrencyCode(value) {
  const normalizedValue = String(value || '').trim().toUpperCase()

  if (!normalizedValue) {
    return null
  }

  if (['EUR', 'EURO'].includes(normalizedValue)) {
    return 'EUR'
  }

  if (['USD', 'US DOLLAR', 'DOLLAR'].includes(normalizedValue)) {
    return 'USD'
  }

  if (['CNY', 'RMB', 'YUAN', 'RMB/CNY'].includes(normalizedValue)) {
    return 'CNY'
  }

  return null
}

function getCurrencyInfo(currencyCode) {
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode)

  if (!normalizedCurrencyCode) {
    return {
      code: null,
      label: 'Not specified',
      theme: 'neutral',
    }
  }

  return {
    code: normalizedCurrencyCode,
    label: CURRENCY_THEME_CONFIG[normalizedCurrencyCode].label,
    theme: CURRENCY_THEME_CONFIG[normalizedCurrencyCode].theme,
  }
}

function detectCurrencyFromRfqData(rfqData) {
  const explicitCurrencyFields = [
    rfqData.currency,
    rfqData.currency_code,
    rfqData.target_price_currency,
    rfqData.quotation_currency,
    rfqData.price_currency,
    rfqData.customer_currency,
    rfqData.devise,
  ]

  for (const currencyField of explicitCurrencyFields) {
    const normalizedCurrencyCode = normalizeCurrencyCode(currencyField)

    if (normalizedCurrencyCode) {
      return normalizedCurrencyCode
    }
  }

  const keyList = Object.keys(rfqData || {})
  const eurKey = keyList.find((key) => /(^|_)eur$/i.test(key))
  const usdKey = keyList.find((key) => /(^|_)usd$/i.test(key))
  const cnyKey = keyList.find((key) => /(^|_)(cny|rmb|yuan)$/i.test(key))

  if (eurKey && getOptionalText(rfqData[eurKey])) {
    return 'EUR'
  }

  if (usdKey && getOptionalText(rfqData[usdKey])) {
    return 'USD'
  }

  if (cnyKey && getOptionalText(rfqData[cnyKey])) {
    return 'CNY'
  }

  if (getOptionalText(rfqData.target_price_eur)) {
    return 'EUR'
  }

  if (getOptionalText(rfqData.target_price_usd)) {
    return 'USD'
  }

  if (getOptionalText(rfqData.target_price_cny) || getOptionalText(rfqData.target_price_rmb)) {
    return 'CNY'
  }

  return null
}

function getTargetPriceSource(rfqData, currencyCode) {
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode)

  if (normalizedCurrencyCode === 'USD') {
    return rfqData.target_price_usd || rfqData.target_price
  }

  if (normalizedCurrencyCode === 'CNY') {
    return rfqData.target_price_cny || rfqData.target_price_rmb || rfqData.target_price
  }

  if (normalizedCurrencyCode === 'EUR') {
    return rfqData.target_price_eur || rfqData.target_price
  }

  return (
    rfqData.target_price ||
    rfqData.target_price_eur ||
    rfqData.target_price_usd ||
    rfqData.target_price_cny ||
    rfqData.target_price_rmb
  )
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

  return 'neutral'
}

function getCostingStageKey(type) {
  if (type === 'Initial Costing') {
    return 'initial'
  }

  if (type === 'Improved Costing') {
    return 'improved'
  }

  if (type === 'Last Call Costing') {
    return 'last-call'
  }

  return 'unknown'
}

function getStageStatus(completedRfqCount, totalRfqCount) {
  if (totalRfqCount > 0 && completedRfqCount === totalRfqCount) {
    return {
      label: 'Complete',
      tone: 'done',
    }
  }

  if (completedRfqCount > 0) {
    return {
      label: 'Partial',
      tone: 'info',
    }
  }

  return {
    label: 'Not added',
    tone: 'neutral',
  }
}

function normalizeCosting(costing) {
  const type = getDisplayText(costing?.type, 'Costing')
  const reference = getDisplayText(costing?.reference, 'No reference')
  const productFamily = getDisplayText(costing?.product_family ?? costing?.productFamily, 'TBD')
  const plant = getDisplayText(costing?.plant ?? costing?.delivery_plant, 'Not specified')
  const createdDate = formatDateValue(
    costing?.createdAt ?? costing?.created_at ?? costing?.created_date,
    'Not dated',
  )

  return {
    id: String(costing?.id ?? reference),
    type,
    stageKey: getCostingStageKey(type),
    typeTone: getCostingTypeTone(type),
    reference,
    productFamily,
    product_family: costing?.product_family ?? costing?.productFamily ?? null,
    plant,
    createdAt: costing?.createdAt ?? costing?.created_at ?? costing?.created_date ?? null,
    createdDate,
    summary: formatCompactList([productFamily, plant], 'Linked costing entry'),
  }
}

function normalizeRfq(rfq) {
  const rfqData = rfq?.rfq_data || {}
  const rfqId = getDisplayText(rfq?.rfq_id, getOptionalText(rfqData.systematic_rfq_id) || 'RFQ')
  const reference = getOptionalText(rfqData.systematic_rfq_id) || rfqId
  const customerName = getOptionalText(rfqData.customer_name)
  const currencyCode = detectCurrencyFromRfqData(rfqData)
  const currencyInfo = getCurrencyInfo(currencyCode)
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
    id: rfqId,
    rfqId,
    reference,
    customerName,
    projectName,
    title: getDisplayText(rfqData.product_name, 'Unnamed RFQ'),
    deliveryPlant: getDisplayText(rfqData.delivery_plant),
    quotationDate: formatDateValue(rfqData.quotation_expected_date),
    annualVolume: formatNumberValue(rfqData.annual_volume),
    targetPrice: formatCurrencyValue(
      getTargetPriceSource(rfqData, currencyInfo.code),
      currencyInfo.code || 'EUR',
    ),
    currencyCode: currencyInfo.code,
    currencyLabel: currencyInfo.label,
    currencyTheme: currencyInfo.theme,
    deliveryZone: getOptionalText(rfqData.delivery_zone),
    productLine: getOptionalText(rfqData.product_line_acronym),
    sopYear: getOptionalText(rfqData.sop_year),
    costings,
    status: costings.length > 0 ? 'Costing linked' : 'Awaiting costing',
    statusTone: costings.length > 0 ? 'info' : 'warning',
  }
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

function getStageCostings(rfq, stageKey) {
  return rfq.costings.filter((costing) => costing.stageKey === stageKey)
}

function buildProjectStages(rfqs) {
  return COSTING_STAGES.map((stage) => {
    const completedRfqCount = rfqs.filter((rfq) => getStageCostings(rfq, stage.key).length > 0).length
    const costingCount = rfqs.reduce(
      (count, rfq) => count + getStageCostings(rfq, stage.key).length,
      0,
    )
    const stageStatus = getStageStatus(completedRfqCount, rfqs.length)

    return {
      ...stage,
      completedRfqCount,
      costingCount,
      statusLabel: stageStatus.label,
      statusTone: stageStatus.tone,
    }
  })
}

function getProjectStageEntries(project, stageKey) {
  return project.rfqs.flatMap((rfq) =>
    getStageCostings(rfq, stageKey).map((costing) => ({
      ...costing,
      rfqId: rfq.rfqId,
      elementReference: rfq.reference,
      reference: getDisplayText(costing?.reference, 'No reference'),
      productFamily: getDisplayText(
        costing?.productFamily ?? costing?.product_family,
        'TBD',
      ),
      plant: getDisplayText(costing?.plant ?? costing?.delivery_plant, 'Not specified'),
      createdDate: formatDateValue(
        costing?.createdDate ?? costing?.createdAt ?? costing?.created_at ?? costing?.created_date,
        'Not dated',
      ),
    })),
  )
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
    const projectStages = buildProjectStages(project.rfqs)
    const projectCurrencyCodes = getUniqueValues(project.rfqs.map((rfq) => rfq.currencyCode))
    const projectCurrencyInfo =
      projectCurrencyCodes.length === 1
        ? getCurrencyInfo(projectCurrencyCodes[0])
        : {
            code: null,
            label: projectCurrencyCodes.length > 1 ? 'Mixed' : 'Not specified',
            theme: 'neutral',
          }

    return {
      ...project,
      currencyCode: projectCurrencyInfo.code,
      currencyLabel: projectCurrencyInfo.label,
      currencyTheme: projectCurrencyInfo.theme,
      stages: projectStages,
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

export default function CostingBoardProfessional() {
  const [projects, setProjects] = useState([])
  const [expandedProjectIds, setExpandedProjectIds] = useState([])
  const [activeCostingModal, setActiveCostingModal] = useState(null)
  const [costingForm, setCostingForm] = useState(() => createEmptyCostingForm())
  const [costingFormError, setCostingFormError] = useState('')
  const [isSubmittingCosting, setIsSubmittingCosting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

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
    { label: 'Projects', value: totalProjects },
    { label: 'RFQs', value: totalRfqs },
    { label: 'Linked costings', value: totalCostings },
    { label: 'Awaiting costing', value: awaitingCostingCount },
  ]

  const toggleProject = (projectId) => {
    setExpandedProjectIds((currentIds) =>
      currentIds.includes(projectId)
        ? currentIds.filter((currentId) => currentId !== projectId)
        : [...currentIds, projectId],
    )
  }

  const closeCostingModal = ({ force = false } = {}) => {
    if (isSubmittingCosting && !force) {
      return
    }

    setActiveCostingModal(null)
    setCostingForm(createEmptyCostingForm())
    setCostingFormError('')
  }

  const openCostingModal = (project, stage) => {
    const projectRfq = project.rfqs[0]

    if (!projectRfq) {
      return
    }

    setActiveCostingModal({
      mode: 'create',
      projectId: project.id,
      projectTitle: project.title,
      stageKey: stage.key,
      stageLabel: stage.label,
      rfqId: projectRfq.rfqId,
      elementReference: projectRfq.reference,
    })
    setCostingForm(createEmptyCostingForm())
    setCostingFormError('')
  }

  const openEditCostingModal = (project, entry) => {
    setActiveCostingModal({
      mode: 'edit',
      projectId: project.id,
      projectTitle: project.title,
      stageKey: entry.stageKey,
      stageLabel: entry.stageLabel,
      costingId: entry.id,
      rfqId: entry.rfqId,
      elementReference: entry.elementReference,
    })
    setCostingForm(
      createEmptyCostingForm({
        reference: entry.reference === 'No reference' ? '' : entry.reference,
        productFamily: entry.productFamily || 'TBD',
        plant: entry.plant === 'Not specified' ? '' : entry.plant,
      }),
    )
    setCostingFormError('')
  }

  const handleCostingFormChange = (field, value) => {
    setCostingForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  const handleCostingSubmit = async (event) => {
    event.preventDefault()

    if (!activeCostingModal) {
      return
    }

    setIsSubmittingCosting(true)
    setCostingFormError('')

    try {
      const payload = {
        reference: costingForm.reference.trim(),
        product_family: costingForm.productFamily,
        plant: costingForm.plant,
      }

      if (activeCostingModal.mode === 'edit') {
        await updateRfqCosting(activeCostingModal.costingId, payload)
      } else {
        await createRfqCosting(activeCostingModal.rfqId, {
          type: activeCostingModal.stageLabel,
          ...payload,
        })
      }

      closeCostingModal({ force: true })
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      setCostingFormError(
        error.message ||
          (activeCostingModal.mode === 'edit'
            ? 'Unable to update the costing entry.'
            : 'Unable to create the costing entry.'),
      )
    } finally {
      setIsSubmittingCosting(false)
    }
  }

  return (
    <section className="costing-simple" aria-label="Costing projects board">
      <CostingBoardHeader
        totalProjects={totalProjects}
        boardStats={boardStats}
        pluralize={pluralize}
      />

      {isLoading ? (
        <CostingBoardState
          title="Loading costing data"
          description="The workspace is fetching RFQs and preparing the project view."
        />
      ) : null}

      {!isLoading && errorMessage ? (
        <CostingBoardState
          title="Unable to load costing data"
          description={errorMessage}
          actionLabel="Retry"
          onAction={() => setReloadKey((currentValue) => currentValue + 1)}
          role="alert"
        />
      ) : null}

      {!isLoading && !errorMessage && projects.length === 0 ? (
        <CostingBoardState
          title="No project available"
          description="No RFQ was returned by the backend for the costing workspace."
          actionLabel="Refresh"
          onAction={() => setReloadKey((currentValue) => currentValue + 1)}
        />
      ) : null}

      {!isLoading && !errorMessage && projects.length > 0 ? (
        <div className="costing-simple__projects">
          {projects.map((project) => {
            const isExpanded = expandedProjectIds.includes(project.id)
            const projectStageEntries = project.stages.flatMap((stage) =>
              getProjectStageEntries(project, stage.key).map((entry) => ({
                ...entry,
                stageLabel: stage.label,
                stageKey: stage.key,
              })),
            )

            return (
              <CostingProjectCard
                key={project.id}
                project={project}
                isExpanded={isExpanded}
                projectStageEntries={projectStageEntries}
                onToggle={() => toggleProject(project.id)}
                onOpenStage={openCostingModal}
                onEditCosting={openEditCostingModal}
              />
            )
          })}
        </div>
      ) : null}

      <CostingStageModal
        modal={activeCostingModal}
        form={costingForm}
        errorMessage={costingFormError}
        isSubmitting={isSubmittingCosting}
        onRequestClose={closeCostingModal}
        onSubmit={handleCostingSubmit}
        onFieldChange={handleCostingFormChange}
      />
    </section>
  )
}
