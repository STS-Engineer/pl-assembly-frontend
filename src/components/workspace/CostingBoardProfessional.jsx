import { useEffect, useState } from 'react'
import {
  createRfqCosting,
  getUsers,
  getRfqs,
  getRfqCostingSubElementOptions,
  getRfqCostingSubElementsByCostingIds,
  getRfqCostingSubElements,
  isRfqCostingSubElementApiEnabled,
  updateRfqCosting,
  updateRfqCostingSubElement,
} from '../../services/api'
import CostingBoardHeader from './CostingBoardHeader'
import CostingBoardState from './CostingBoardState'
import CostingToast from './CostingToast'
import CostingProjectCard from './CostingProjectCard'
import CostingPilotAssignmentModal from './CostingPilotAssignmentModal'
import CostingStageModal, { createEmptyCostingForm } from './CostingStageModal'
import CostingSubElementModal from './CostingSubElementModal'
import {
  COSTING_SUB_ELEMENT_STATUS_OPTIONS,
  createEmptyCostingSubElementForm,
  getCostingSubElementTemplate,
  normalizeCostingSubElementStatusOptions,
  normalizeCostingSubElements,
} from './costingSubElements'

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

const DEFAULT_SUB_ELEMENT_OPTIONS = {
  statusOptions: COSTING_SUB_ELEMENT_STATUS_OPTIONS,
}

let cachedSubElementOptions = null

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
  const normalizedType = String(type || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  if (normalizedType.includes('initial')) {
    return 'initial'
  }

  if (normalizedType.includes('improved')) {
    return 'improved'
  }

  if (normalizedType.includes('last') && normalizedType.includes('call')) {
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
  const stageKey = getCostingStageKey(type)
  const reference = getDisplayText(costing?.reference, 'No reference')
  const productFamily = getDisplayText(costing?.product_family ?? costing?.productFamily, 'TBD')
  const plant = getDisplayText(costing?.plant ?? costing?.delivery_plant, 'Not specified')
  const createdDate = formatDateValue(
    costing?.createdAt ?? costing?.created_at ?? costing?.created_date,
    'Not dated',
  )

  // Always normalize sub-elements, regardless of stage key
  const rawSubElements = costing?.subElements ?? costing?.sub_elements
  const normalizedSubElements = normalizeCostingSubElements(rawSubElements)
  const subElements = normalizedSubElements.map((subElement) => ({
    ...subElement,
    dueDateLabel: formatDateValue(subElement.dueDate, 'Not planned'),
  }))

  return {
    id: String(costing?.id ?? reference),
    type,
    stageKey,
    typeTone: getCostingTypeTone(type),
    reference,
    productFamily,
    product_family: costing?.product_family ?? costing?.productFamily ?? null,
    plant,
    createdAt: costing?.createdAt ?? costing?.created_at ?? costing?.created_date ?? null,
    createdDate,
    subElements,
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

function getRoleLookupValue(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function hasUserRoleKeyword(userRole, keyword) {
  return getRoleLookupValue(userRole).includes(getRoleLookupValue(keyword))
}

function getCurrentUserDisplayName(user = {}) {
  return getDisplayText(user?.full_name ?? user?.fullName ?? user?.email, 'Workspace user')
}

function getCurrentUserRole(user = {}) {
  return getDisplayText(user?.role, 'Connected user')
}

function getCurrentUserBackendRole(user = {}) {
  const normalizedRole = getRoleLookupValue(user?.role)

  if (!normalizedRole || normalizedRole === 'connected user') {
    return 'user'
  }

  if (normalizedRole.includes('admin')) {
    return 'admin'
  }

  if (normalizedRole.includes('manager') || normalizedRole.includes('approver')) {
    return 'manager'
  }

  if (normalizedRole.includes('pilot')) {
    return 'pilot'
  }

  if (normalizedRole === 'pm' || normalizedRole.includes('project manager')) {
    return 'pm'
  }

  if (normalizedRole === 'pl' || normalizedRole.includes('product line')) {
    return 'pl'
  }

  if (normalizedRole.includes('sales')) {
    return 'sales'
  }

  return 'user'
}

function getSubElementPilotValue(subElement, currentUser) {
  const template = getCostingSubElementTemplate(subElement?.key)
  const storedPilot = getOptionalText(subElement?.pilot)
  const defaultPilot = template?.defaultPilot || 'Project pilot'
  const normalizedCurrentUserRole = getRoleLookupValue(currentUser?.role)

  if (storedPilot && storedPilot.toLowerCase() !== defaultPilot.toLowerCase()) {
    return storedPilot
  }

  if (
    !normalizedCurrentUserRole ||
    normalizedCurrentUserRole === 'connected user' ||
    hasUserRoleKeyword(currentUser?.role, 'pilot')
  ) {
    return getCurrentUserDisplayName(currentUser)
  }

  return storedPilot || defaultPilot
}

function getSubElementApproverValue(subElement, currentUser) {
  const template = getCostingSubElementTemplate(subElement?.key)
  const storedApprover = getOptionalText(subElement?.approver)
  const defaultApprover = template?.defaultApprover || 'Manager'

  if (storedApprover && storedApprover.toLowerCase() !== defaultApprover.toLowerCase()) {
    return storedApprover
  }

  if (
    ['manager', 'approver', 'admin'].some((keyword) =>
      hasUserRoleKeyword(currentUser?.role, keyword),
    )
  ) {
    return getCurrentUserDisplayName(currentUser)
  }

  return storedApprover || defaultApprover
}

function getIdentityLookupValues(source = {}) {
  return Array.from(
    new Set(
      [
        source?.id,
        source?.email,
        source?.full_name,
        source?.fullName,
        source?.name,
      ]
        .map((value) => String(value ?? '').trim().toLowerCase())
        .filter(Boolean),
    ),
  )
}

function getIdentityLookupValuesFromValue(value) {
  const normalizedValue = String(value ?? '').trim().toLowerCase()
  return normalizedValue ? [normalizedValue] : []
}

function isApprovedSubElement(subElement) {
  return String(subElement?.approvalStatus ?? subElement?.approval_status ?? '')
    .trim()
    .toLowerCase() === 'approved'
}

function isCurrentUserAssignedManager(currentUser, subElement) {
  const currentUserLookupValues = getIdentityLookupValues(currentUser)
  const managerLookupValues = [
    ...(Array.isArray(subElement?.managers) ? subElement.managers : []).flatMap((manager) =>
      getIdentityLookupValues(manager),
    ),
    ...getIdentityLookupValuesFromValue(subElement?.approver),
  ]

  if (currentUserLookupValues.length === 0 || managerLookupValues.length === 0) {
    return false
  }

  return currentUserLookupValues.some((lookupValue) => managerLookupValues.includes(lookupValue))
}

function isCurrentUserAssignedPilot(currentUser, subElement) {
  const currentUserLookupValues = getIdentityLookupValues(currentUser)
  const pilotLookupValues = getIdentityLookupValuesFromValue(subElement?.pilot)

  if (currentUserLookupValues.length === 0 || pilotLookupValues.length === 0) {
    return false
  }

  return currentUserLookupValues.some((lookupValue) => pilotLookupValues.includes(lookupValue))
}

function getPilotAssignmentValue(pilotUser, fullNameCounts) {
  const fullName = getOptionalText(pilotUser?.full_name ?? pilotUser?.fullName)
  const email = getOptionalText(pilotUser?.email)
  const normalizedFullName = String(fullName || '').toLowerCase()

  if (fullName && fullNameCounts.get(normalizedFullName) === 1) {
    return fullName
  }

  return email || fullName || String(pilotUser?.id ?? '')
}

function getPilotOptionLabel(pilotUser) {
  const fullName = getOptionalText(pilotUser?.full_name ?? pilotUser?.fullName)
  const email = getOptionalText(pilotUser?.email)
  const labelParts = [fullName || email || `User ${pilotUser?.id ?? ''}`]

  if (fullName && email) {
    labelParts.push(email)
  }

  return labelParts.join(' | ')
}

function getPilotSelectionOptions(users, subElementKey) {
  const candidateUsers = Array.isArray(users) ? users : []
  const fullNameCounts = candidateUsers.reduce((counts, user) => {
    const fullName = getOptionalText(user?.full_name ?? user?.fullName)

    if (!fullName) {
      return counts
    }

    const normalizedFullName = fullName.toLowerCase()
    counts.set(normalizedFullName, (counts.get(normalizedFullName) || 0) + 1)
    return counts
  }, new Map())
  const pilotOptionsMap = new Map()

  candidateUsers.forEach((pilotUser) => {
    const selectionValue =
      getOptionalText(pilotUser?.email) ||
      getOptionalText(pilotUser?.id) ||
      getPilotAssignmentValue(pilotUser, fullNameCounts)

    if (!selectionValue || pilotOptionsMap.has(selectionValue)) {
      return
    }

    pilotOptionsMap.set(selectionValue, {
      selectionValue,
      id: pilotUser?.id ?? null,
      assignmentValue: getPilotAssignmentValue(pilotUser, fullNameCounts),
      fullName: getOptionalText(pilotUser?.full_name ?? pilotUser?.fullName),
      email: getOptionalText(pilotUser?.email),
      role: getOptionalText(pilotUser?.role),
      label: getPilotOptionLabel(pilotUser),
    })
  })

  return Array.from(pilotOptionsMap.values()).sort((leftOption, rightOption) =>
    leftOption.label.localeCompare(rightOption.label),
  )
}

function resolveInitialPilotSelectionValue(subElement, pilotOptions) {
  const template = getCostingSubElementTemplate(subElement?.key)
  const defaultPilot = getOptionalText(template?.defaultPilot) || 'Project pilot'
  const currentPilot = getOptionalText(subElement?.pilot)

  if (!currentPilot || currentPilot.toLowerCase() === defaultPilot.toLowerCase()) {
    return ''
  }

  const matchedPilot = pilotOptions.find(
    (pilotOption) =>
      currentPilot === pilotOption.assignmentValue ||
      currentPilot === pilotOption.fullName ||
      currentPilot === pilotOption.email,
  )

  return matchedPilot?.selectionValue || ''
}

async function attachInitialCostingSubElements(rfqs, currentRole) {
  const sourceRfqs = Array.isArray(rfqs) ? rfqs : []
  const initialCostingIds = sourceRfqs.flatMap((rfq) =>
    (Array.isArray(rfq?.costings) ? rfq.costings : [])
      .filter((costing) => getCostingStageKey(costing?.type) === 'initial' && costing?.id)
      .map((costing) => String(costing.id)),
  )

  if (initialCostingIds.length === 0) {
    return sourceRfqs
  }

  try {
    const response = await getRfqCostingSubElementsByCostingIds(initialCostingIds, currentRole)
    const itemsByCostingId =
      response?.items_by_costing_id ?? response?.itemsByCostingId ?? {}

    return sourceRfqs.map((rfq) => ({
      ...rfq,
      costings: (Array.isArray(rfq?.costings) ? rfq.costings : []).map((costing) => {
        const stageKey = getCostingStageKey(costing?.type)

        if (stageKey !== 'initial' || !costing?.id) {
          return costing
        }

        return {
          ...costing,
          subElements: Array.isArray(itemsByCostingId[String(costing.id)])
            ? itemsByCostingId[String(costing.id)]
            : [],
        }
      }),
    }))
  } catch (bulkError) {
    if (bulkError?.statusCode !== 404) {
      throw bulkError
    }
  }

  return Promise.all(
    sourceRfqs.map(async (rfq) => {
      const sourceCostings = Array.isArray(rfq?.costings) ? rfq.costings : []

      const nextCostings = await Promise.all(
        sourceCostings.map(async (costing) => {
          const stageKey = getCostingStageKey(costing?.type)
          
          if (stageKey !== 'initial' || !costing?.id) {
            return costing
          }

          try {
            const response = await getRfqCostingSubElements(costing.id, currentRole)

            // Handle both { items: [...] } and direct array responses
            const subElementsArray = Array.isArray(response) ? response : response?.items ?? []

            return {
              ...costing,
              subElements: subElementsArray,
            }
          } catch (err) {
            console.error(
              `[attachInitialCostingSubElements] Failed to fetch sub-elements for costing ${costing.id}:`,
              err,
            )
            return costing
          }
        }),
      )

      return {
        ...rfq,
        costings: nextCostings,
      }
    }),
  )
}

export default function CostingBoardProfessional({ currentUser = {} }) {
  const [projects, setProjects] = useState([])
  const [expandedProjectIds, setExpandedProjectIds] = useState([])
  const [activeCostingModal, setActiveCostingModal] = useState(null)
  const [costingForm, setCostingForm] = useState(() => createEmptyCostingForm())
  const [costingFormError, setCostingFormError] = useState('')
  const [isSubmittingCosting, setIsSubmittingCosting] = useState(false)
  const [activeSubElementModal, setActiveSubElementModal] = useState(null)
  const [subElementForm, setSubElementForm] = useState(() => createEmptyCostingSubElementForm())
  const [subElementFormError, setSubElementFormError] = useState('')
  const [isSubmittingSubElement, setIsSubmittingSubElement] = useState(false)
  const [activePilotAssignmentModal, setActivePilotAssignmentModal] = useState(null)
  const [pilotUsers, setPilotUsers] = useState([])
  const [selectedPilotValue, setSelectedPilotValue] = useState('')
  const [pilotAssignmentError, setPilotAssignmentError] = useState('')
  const [isLoadingPilotUsers, setIsLoadingPilotUsers] = useState(false)
  const [isSubmittingPilotAssignment, setIsSubmittingPilotAssignment] = useState(false)
  const [pilotAssignmentFeedback, setPilotAssignmentFeedback] = useState('')
  const [pilotAssignmentFeedbackType, setPilotAssignmentFeedbackType] = useState('success')
  const [subElementOptions, setSubElementOptions] = useState(() => DEFAULT_SUB_ELEMENT_OPTIONS)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const currentUserBackendRole = getCurrentUserBackendRole(currentUser)
  const isSubElementApiEnabled = isRfqCostingSubElementApiEnabled()

  useEffect(() => {
    let isActive = true

    async function loadRfqs() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const rfqResponse = await getRfqs()
        let nextRfqs = Array.isArray(rfqResponse) ? rfqResponse : []
        let nextSubElementOptions = cachedSubElementOptions || DEFAULT_SUB_ELEMENT_OPTIONS

        if (isSubElementApiEnabled) {
          try {
            const [subElementOptionsResponse, rfqsWithSubElements] = await Promise.all([
              cachedSubElementOptions ? Promise.resolve(null) : getRfqCostingSubElementOptions(),
              attachInitialCostingSubElements(nextRfqs, currentUserBackendRole),
            ])

            nextRfqs = rfqsWithSubElements

            if (subElementOptionsResponse) {
              nextSubElementOptions = {
                statusOptions: normalizeCostingSubElementStatusOptions(
                  subElementOptionsResponse?.status_options,
                ),
              }
              cachedSubElementOptions = nextSubElementOptions
            }
          } catch (error) {
            console.warn('[loadRfqs] Sub-element API error:', error)
            if (error?.statusCode !== 404) {
              throw error
            }
          }
        }

        const nextProjects = groupRfqsIntoProjects(nextRfqs)

        if (!isActive) {
          return
        }

        setSubElementOptions(nextSubElementOptions)
        setProjects(nextProjects)
        setExpandedProjectIds((currentIds) => {
          const availableIds = nextProjects.map((project) => project.id)
          return currentIds.filter((projectId) => availableIds.includes(projectId))
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        setProjects([])
        setSubElementOptions(DEFAULT_SUB_ELEMENT_OPTIONS)
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
  }, [currentUserBackendRole, isSubElementApiEnabled, reloadKey])

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

  const closeSubElementModal = ({ force = false } = {}) => {
    if (isSubmittingSubElement && !force) {
      return
    }

    setActiveSubElementModal(null)
    setSubElementForm(createEmptyCostingSubElementForm())
    setSubElementFormError('')
  }

  const closePilotAssignmentModal = ({ force = false } = {}) => {
    if (isSubmittingPilotAssignment && !force) {
      return
    }

    setActivePilotAssignmentModal(null)
    setSelectedPilotValue('')
    setPilotAssignmentError('')
  }

  const openSubElementModal = (project, entry, subElement, mode) => {
    setActiveSubElementModal({
      mode,
      projectId: project.id,
      projectTitle: project.title,
      costingId: entry.id,
      costingReference: entry.reference,
      stageLabel: entry.stageLabel,
      subElementKey: subElement.key,
      subElementTitle: subElement.title,
      pilotRoleLabel: subElement.pilotRoleLabel,
      pilot:
        mode === 'edit' ? getSubElementPilotValue(subElement, currentUser) : subElement.pilot,
      approver:
        mode === 'edit'
          ? getSubElementApproverValue(subElement, currentUser)
          : subElement.approver,
      subElements: entry.subElements,
    })
    setSubElementForm(createEmptyCostingSubElementForm(subElement))
    setSubElementFormError('')
  }

  const openFillSubElementModal = (project, entry, subElement) => {
    if (!canFillSubElement(subElement) || isApprovedSubElement(subElement)) {
      return
    }

    openSubElementModal(project, entry, subElement, 'edit')
  }

  const openViewSubElementModal = (project, entry, subElement) => {
    openSubElementModal(project, entry, subElement, 'view')
  }

  const openPilotAssignmentModal = async (project, entry, subElement) => {
    if (!canAssignPilot(subElement)) {
      return
    }

    const managerName =
      getDisplayText(
        subElement?.managers?.[0]?.full_name ??
          subElement?.managers?.[0]?.fullName ??
          subElement?.managers?.[0]?.email,
        getOptionalText(subElement?.approver) || 'Manager',
      )

    setActivePilotAssignmentModal({
      projectId: project.id,
      projectTitle: project.title,
      costingId: entry.id,
      costingReference: entry.reference,
      stageLabel: entry.stageLabel,
      subElementKey: subElement.key,
      subElementTitle: subElement.title,
      currentPilot:
        getOptionalText(subElement.pilot) && subElement.pilot !== 'Project pilot'
          ? subElement.pilot
          : '',
      managerName,
      subElement,
      subElements: entry.subElements,
    })
    setPilotAssignmentError('')

    const existingPilotOptions = getPilotSelectionOptions(pilotUsers, subElement.key)
    setSelectedPilotValue(resolveInitialPilotSelectionValue(subElement, existingPilotOptions))

    if (pilotUsers.length > 0) {
      return
    }

    setIsLoadingPilotUsers(true)

    try {
      const response = await getUsers()
      const nextPilotUsers = Array.isArray(response) ? response : response?.items ?? []
      const nextPilotOptions = getPilotSelectionOptions(nextPilotUsers, subElement.key)

      setPilotUsers(nextPilotUsers)
      setSelectedPilotValue(resolveInitialPilotSelectionValue(subElement, nextPilotOptions))
    } catch (error) {
      setPilotAssignmentError(error.message || 'Unable to load the list of pilots.')
    } finally {
      setIsLoadingPilotUsers(false)
    }
  }

  const canAssignPilot = (subElement) => isCurrentUserAssignedManager(currentUser, subElement)

  const canFillSubElement = (subElement) =>
    isCurrentUserAssignedManager(currentUser, subElement) ||
    isCurrentUserAssignedPilot(currentUser, subElement)

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

  const handleSubElementFormChange = (field, value) => {
    setSubElementForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  const handlePilotAssignmentSubmit = async (event) => {
    event.preventDefault()

    if (!activePilotAssignmentModal) {
      return
    }

    const availablePilotOptions = getPilotSelectionOptions(
      pilotUsers,
      activePilotAssignmentModal.subElementKey,
    )
    const selectedPilot =
      availablePilotOptions.find((pilotOption) => pilotOption.selectionValue === selectedPilotValue) ||
      null
    const nextApprover = getSubElementApproverValue(
      activePilotAssignmentModal.subElement,
      currentUser,
    )

    if (!selectedPilot) {
      setPilotAssignmentError('Please select a pilot before saving.')
      return
    }

    setIsSubmittingPilotAssignment(true)
    setPilotAssignmentError('')

    try {
      if (isSubElementApiEnabled) {
        try {
          await updateRfqCostingSubElement(
            activePilotAssignmentModal.costingId,
            activePilotAssignmentModal.subElementKey,
            {
              current_role: currentUserBackendRole,
              pilot: selectedPilot.assignmentValue,
              pilot_id: selectedPilot.id,
              pilot_email: selectedPilot.email,
              approver: nextApprover,
              status: activePilotAssignmentModal.subElement.status,
              approvalStatus: activePilotAssignmentModal.subElement.approvalStatus,
              duration: activePilotAssignmentModal.subElement.duration,
              dueDate: activePilotAssignmentModal.subElement.dueDate,
            },
          )
        } catch (error) {
          if (error?.statusCode !== 404) {
            throw error
          }

          const nextSubElements = (activePilotAssignmentModal.subElements || []).map((subElement) =>
            subElement.key === activePilotAssignmentModal.subElementKey
              ? {
                  ...subElement,
                  pilot: selectedPilot.assignmentValue,
                  approver: nextApprover,
                }
              : subElement,
          )

          await updateRfqCosting(activePilotAssignmentModal.costingId, {
            sub_elements: nextSubElements.map((subElement) => ({
              key: subElement.key,
              title: subElement.title,
              pilot: subElement.pilot,
              approver: subElement.approver,
              status: subElement.status,
              approval_status: subElement.approvalStatus,
              duration: subElement.duration,
              due_date: subElement.dueDate,
            })),
          })
        }
      } else {
        const nextSubElements = (activePilotAssignmentModal.subElements || []).map((subElement) =>
          subElement.key === activePilotAssignmentModal.subElementKey
            ? {
                ...subElement,
                pilot: selectedPilot.assignmentValue,
                approver: nextApprover,
              }
            : subElement,
        )

        await updateRfqCosting(activePilotAssignmentModal.costingId, {
          sub_elements: nextSubElements.map((subElement) => ({
            key: subElement.key,
            title: subElement.title,
            pilot: subElement.pilot,
            approver: subElement.approver,
            status: subElement.status,
            approval_status: subElement.approvalStatus,
            duration: subElement.duration,
            due_date: subElement.dueDate,
          })),
        })
      }

      closePilotAssignmentModal({ force: true })
      setPilotAssignmentFeedback('Pilot assigned successfully.')
      setPilotAssignmentFeedbackType('success')
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      const nextErrorMessage = error.message || 'Unable to assign the pilot.'
      setPilotAssignmentError(nextErrorMessage)
      setPilotAssignmentFeedback(nextErrorMessage)
      setPilotAssignmentFeedbackType('error')
    } finally {
      setIsSubmittingPilotAssignment(false)
    }
  }

  const handleSubElementSubmit = async (event) => {
    event.preventDefault()

    if (!activeSubElementModal || activeSubElementModal.mode === 'view') {
      return
    }

    const normalizedDuration = String(subElementForm.duration ?? '').trim()

    if (normalizedDuration && !/^\d+$/.test(normalizedDuration)) {
      setSubElementFormError('Duration must be a whole number of days.')
      return
    }

    setIsSubmittingSubElement(true)
    setSubElementFormError('')

    try {
      if (isSubElementApiEnabled) {
        try {
          await updateRfqCostingSubElement(
            activeSubElementModal.costingId,
            activeSubElementModal.subElementKey,
            {
              current_role: currentUserBackendRole,
              pilot: activeSubElementModal.pilot,
              approver: activeSubElementModal.approver,
              status: subElementForm.status,
              approvalStatus: subElementForm.approvalStatus,
              duration: normalizedDuration,
              dueDate: subElementForm.dueDate,
            },
          )
        } catch (error) {
          if (error?.statusCode !== 404) {
            throw error
          }

          const nextSubElements = (activeSubElementModal.subElements || []).map((subElement) =>
            subElement.key === activeSubElementModal.subElementKey
              ? {
                  ...subElement,
                  pilot: activeSubElementModal.pilot,
                  approver: activeSubElementModal.approver,
                  status: subElementForm.status,
                  approvalStatus: subElementForm.approvalStatus,
                  duration: normalizedDuration,
                  dueDate: subElementForm.dueDate,
                }
              : subElement,
          )

          await updateRfqCosting(activeSubElementModal.costingId, {
            sub_elements: nextSubElements.map((subElement) => ({
              key: subElement.key,
              title: subElement.title,
              pilot: subElement.pilot,
              approver: subElement.approver,
              status: subElement.status,
              approval_status: subElement.approvalStatus,
              duration: subElement.duration,
              due_date: subElement.dueDate,
            })),
          })
        }
      } else {
        const nextSubElements = (activeSubElementModal.subElements || []).map((subElement) =>
          subElement.key === activeSubElementModal.subElementKey
            ? {
                ...subElement,
                pilot: activeSubElementModal.pilot,
                approver: activeSubElementModal.approver,
                status: subElementForm.status,
                approvalStatus: subElementForm.approvalStatus,
                duration: normalizedDuration,
                dueDate: subElementForm.dueDate,
              }
            : subElement,
        )

        await updateRfqCosting(activeSubElementModal.costingId, {
          sub_elements: nextSubElements.map((subElement) => ({
            key: subElement.key,
            title: subElement.title,
            pilot: subElement.pilot,
            approver: subElement.approver,
            status: subElement.status,
            approval_status: subElement.approvalStatus,
            duration: subElement.duration,
            due_date: subElement.dueDate,
          })),
        })
      }

      closeSubElementModal({ force: true })
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      setSubElementFormError(error.message || 'Unable to update the costing sub-element.')
    } finally {
      setIsSubmittingSubElement(false)
    }
  }

  const activePilotOptions = getPilotSelectionOptions(
    pilotUsers,
    activePilotAssignmentModal?.subElementKey,
  )

  return (
    <>
      <CostingToast
        feedback={pilotAssignmentFeedback}
        feedbackType={pilotAssignmentFeedbackType}
        onClose={() => setPilotAssignmentFeedback('')}
      />

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
                canFillSubElement={canFillSubElement}
                canAssignPilot={canAssignPilot}
                onAssignPilot={openPilotAssignmentModal}
                onFillSubElement={openFillSubElementModal}
                onViewSubElement={openViewSubElementModal}
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

      <CostingSubElementModal
        modal={activeSubElementModal}
        form={subElementForm}
        errorMessage={subElementFormError}
        isSubmitting={isSubmittingSubElement}
        statusOptions={subElementOptions.statusOptions}
        onRequestClose={closeSubElementModal}
        onSubmit={handleSubElementSubmit}
        onFieldChange={handleSubElementFormChange}
        costingId={activeSubElementModal?.costingId}
        subElementKey={activeSubElementModal?.subElementKey}
      />

      <CostingPilotAssignmentModal
        modal={activePilotAssignmentModal}
        pilotOptions={activePilotOptions}
        selectedPilotValue={selectedPilotValue}
        isLoading={isLoadingPilotUsers}
        isSubmitting={isSubmittingPilotAssignment}
        errorMessage={pilotAssignmentError}
        onRequestClose={closePilotAssignmentModal}
        onPilotChange={setSelectedPilotValue}
        onSubmit={handlePilotAssignmentSubmit}
      />
      </section>
    </>
  )
}
