import { useEffect, useState } from 'react'
import {
  createRfqCostingSubElementConversationMessage,
  createRfq,
  createRfqCosting,
  deleteRfqCosting,
  getUsers,
  getRfqs,
  getRfqCostingSubElementOptions,
  getRfqCostingSubElementConversation,
  getRfqCostingSubElementsByCostingIds,
  getRfqCostingSubElements,
  isRfqCostingSubElementApiEnabled,
  updateRfqCosting,
  updateRfqCostingSubElement,
} from '../../services/api'
import { getSession } from '../../services/session'
import CostingBoardHeader from './CostingBoardHeader'
import CostingBoardState from './CostingBoardState'
import CostingDeleteConfirmationModal from './CostingDeleteConfirmationModal'
import CostingToast from './CostingToast'
import CostingProjectCard from './CostingProjectCard'
import CostingPilotAssignmentModal from './CostingPilotAssignmentModal'
import CostingRfqModal, { createEmptyRfqForm } from './CostingRfqModal'
import CostingStageModal, { createEmptyCostingForm } from './CostingStageModal'
import CostingSubElementConversationDrawer from './CostingSubElementConversationDrawer'
import CostingSubElementModal from './CostingSubElementModal'
import {
  COSTING_SUB_ELEMENT_STATUS_OPTIONS,
  createDefaultCostingSubElements,
  createEmptyCostingSubElementForm,
  getCostingSubElementTemplate,
  normalizeCostingSubElementStatusOptions,
  normalizeCostingSubElements,
  getBaseSubElementKey,
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

  const rawSubElements =
    stageKey === 'initial' ? costing?.subElements ?? costing?.sub_elements : []
  const normalizedSubElements =
    stageKey === 'initial' ? normalizeCostingSubElements(rawSubElements) : []
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
  const pilotLookupValues = [
    ...getIdentityLookupValuesFromValue(subElement?.pilotId),
    ...getIdentityLookupValuesFromValue(subElement?.pilotEmail),
    ...getIdentityLookupValuesFromValue(subElement?.pilot),
  ]

  if (currentUserLookupValues.length === 0 || pilotLookupValues.length === 0) {
    return false
  }

  return currentUserLookupValues.some((lookupValue) => pilotLookupValues.includes(lookupValue))
}

function getPilotAssignmentValue(pilotUser) {
  const fullName = getOptionalText(pilotUser?.full_name ?? pilotUser?.fullName)
  const email = getOptionalText(pilotUser?.email)

  return fullName || email || String(pilotUser?.id ?? '')
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
  const pilotOptionsMap = new Map()

  candidateUsers.forEach((pilotUser) => {
    const selectionValue =
      getOptionalText(pilotUser?.email) ||
      getOptionalText(pilotUser?.id) ||
      getPilotAssignmentValue(pilotUser)

    if (!selectionValue || pilotOptionsMap.has(selectionValue)) {
      return
    }

    pilotOptionsMap.set(selectionValue, {
      selectionValue,
      id: pilotUser?.id ?? null,
      assignmentValue: getPilotAssignmentValue(pilotUser),
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

function getConversationMentionableUsers(users = []) {
  const candidateUsers = Array.isArray(users) ? users : []
  const mentionableUsersMap = new Map()

  candidateUsers.forEach((user) => {
    const approvalStatus = getOptionalText(user?.approval_status ?? user?.approvalStatus)

    if (approvalStatus && approvalStatus.toLowerCase() !== 'approved') {
      return
    }

    const fullName = getOptionalText(user?.full_name ?? user?.fullName ?? user?.name)
    const email = getOptionalText(user?.email)
    const id = getOptionalText(user?.id)
    const displayName = fullName || email || `User ${id || ''}`.trim()
    const mentionValue = fullName || displayName
    const key = email || id || mentionValue

    if (!key || mentionableUsersMap.has(key)) {
      return
    }

    mentionableUsersMap.set(key, {
      id: id || key,
      name: displayName,
      full_name: fullName || displayName,
      email,
      mentionValue,
    })
  })

  return Array.from(mentionableUsersMap.values()).sort((leftUser, rightUser) =>
    `${leftUser.name} ${leftUser.email}`.localeCompare(`${rightUser.name} ${rightUser.email}`),
  )
}

function getMatchedPilotUser(subElement, users = []) {
  const pilotLookupValues = [
    subElement?.pilotId,
    subElement?.pilotEmail,
    subElement?.pilot,
  ]
    .flatMap((value) => getIdentityLookupValuesFromValue(value))

  if (pilotLookupValues.length === 0) {
    return null
  }

  return (Array.isArray(users) ? users : []).find((user) => {
    const userLookupValues = getIdentityLookupValues(user)
    return pilotLookupValues.some((lookupValue) => userLookupValues.includes(lookupValue))
  }) || null
}

function getPilotDisplayValue(subElement, users = []) {
  const matchedPilotUser = getMatchedPilotUser(subElement, users)

  if (matchedPilotUser) {
    return (
      getOptionalText(matchedPilotUser?.full_name ?? matchedPilotUser?.fullName ?? matchedPilotUser?.name) ||
      getOptionalText(matchedPilotUser?.email) ||
      getOptionalText(subElement?.pilot)
    )
  }

  return getOptionalText(subElement?.pilot)
}

function enrichProjectsWithPilotUsers(projects, users = []) {
  if (!Array.isArray(users) || users.length === 0) {
    return projects
  }

  return (Array.isArray(projects) ? projects : []).map((project) => ({
    ...project,
    rfqs: (Array.isArray(project.rfqs) ? project.rfqs : []).map((rfq) => ({
      ...rfq,
      costings: (Array.isArray(rfq.costings) ? rfq.costings : []).map((costing) => ({
        ...costing,
        subElements: (Array.isArray(costing.subElements) ? costing.subElements : []).map((subElement) => {
          const matchedPilotUser = getMatchedPilotUser(subElement, users)

          if (!matchedPilotUser) {
            return subElement
          }

          return {
            ...subElement,
            pilot:
              getOptionalText(
                matchedPilotUser?.full_name ?? matchedPilotUser?.fullName ?? matchedPilotUser?.name,
              ) ||
              subElement.pilot,
            pilotId: getOptionalText(subElement?.pilotId ?? matchedPilotUser?.id),
            pilotEmail: getOptionalText(subElement?.pilotEmail ?? matchedPilotUser?.email),
          }
        }),
      })),
    })),
  }))
}

function getConversationMessageCountFromResponse(response = null) {
  const rawMessageCount =
    response?.total_count ??
    response?.totalCount ??
    response?.message_count ??
    response?.messageCount ??
    response?.conversation?.total_count ??
    response?.conversation?.totalCount
  const parsedMessageCount = Number.parseInt(String(rawMessageCount ?? '').trim(), 10)

  if (Number.isInteger(parsedMessageCount) && parsedMessageCount >= 0) {
    return parsedMessageCount
  }

  return Array.isArray(response?.items) ? response.items.length : 0
}

function updateProjectsConversationMessageCount(projects, costingId, subElementKey, messageCount) {
  const normalizedCostingId = String(costingId ?? '').trim()
  const normalizedSubElementKey = getBaseSubElementKey(subElementKey)

  if (!normalizedCostingId || !normalizedSubElementKey) {
    return projects
  }

  return (Array.isArray(projects) ? projects : []).map((project) => ({
    ...project,
    rfqs: (Array.isArray(project.rfqs) ? project.rfqs : []).map((rfq) => ({
      ...rfq,
      costings: (Array.isArray(rfq.costings) ? rfq.costings : []).map((costing) => {
        if (String(costing?.id ?? '').trim() !== normalizedCostingId) {
          return costing
        }

        return {
          ...costing,
          subElements: (Array.isArray(costing.subElements) ? costing.subElements : []).map(
            (subElement) =>
              getBaseSubElementKey(subElement?.key) === normalizedSubElementKey
                ? {
                    ...subElement,
                    conversationMessageCount: messageCount,
                  }
                : subElement,
          ),
        }
      }),
    })),
  }))
}

function buildConversationCountLookupKey(costingId, subElementKey) {
  const normalizedCostingId = String(costingId ?? '').trim()
  const normalizedSubElementKey = getBaseSubElementKey(subElementKey)

  if (!normalizedCostingId || !normalizedSubElementKey) {
    return ''
  }

  return `${normalizedCostingId}:${normalizedSubElementKey}`
}

function updateProjectsConversationMessageCounts(projects, messageCountsByKey = new Map()) {
  if (!(messageCountsByKey instanceof Map) || messageCountsByKey.size === 0) {
    return projects
  }

  return (Array.isArray(projects) ? projects : []).map((project) => ({
    ...project,
    rfqs: (Array.isArray(project.rfqs) ? project.rfqs : []).map((rfq) => ({
      ...rfq,
      costings: (Array.isArray(rfq.costings) ? rfq.costings : []).map((costing) => ({
        ...costing,
        subElements: (Array.isArray(costing.subElements) ? costing.subElements : []).map(
          (subElement) => {
            const lookupKey = buildConversationCountLookupKey(costing?.id, subElement?.key)

            if (!lookupKey || !messageCountsByKey.has(lookupKey)) {
              return subElement
            }

            return {
              ...subElement,
              conversationMessageCount: messageCountsByKey.get(lookupKey),
            }
          },
        ),
      })),
    })),
  }))
}

function canAccessSubElementConversation(currentUser, currentUserBackendRole, subElement) {
  return (
    currentUserBackendRole === 'admin' ||
    isCurrentUserAssignedManager(currentUser, subElement) ||
    isCurrentUserAssignedPilot(currentUser, subElement)
  )
}

async function preloadConversationMessageCounts(
  projects,
  currentUser,
  currentUserBackendRole,
  sessionToken,
) {
  if (!sessionToken) {
    return projects
  }

  const targets = []
  const seenLookupKeys = new Set()

  ;(Array.isArray(projects) ? projects : []).forEach((project) => {
    ;(Array.isArray(project.rfqs) ? project.rfqs : []).forEach((rfq) => {
      ;(Array.isArray(rfq.costings) ? rfq.costings : []).forEach((costing) => {
        if (costing?.stageKey !== 'initial' || !costing?.id) {
          return
        }

        ;(Array.isArray(costing.subElements) ? costing.subElements : []).forEach((subElement) => {
          const lookupKey = buildConversationCountLookupKey(costing.id, subElement?.key)
          const hasKnownMessageCount = Number.isInteger(subElement?.conversationMessageCount)

          if (
            !lookupKey ||
            hasKnownMessageCount ||
            seenLookupKeys.has(lookupKey) ||
            !canAccessSubElementConversation(currentUser, currentUserBackendRole, subElement)
          ) {
            return
          }

          seenLookupKeys.add(lookupKey)
          targets.push({
            lookupKey,
            costingId: costing.id,
            subElementKey: getBaseSubElementKey(subElement?.key),
          })
        })
      })
    })
  })

  if (targets.length === 0) {
    return projects
  }

  const messageCountsByKey = new Map()
  const batchSize = 6

  for (let index = 0; index < targets.length; index += batchSize) {
    const batch = targets.slice(index, index + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (target) => {
        try {
          const response = await getRfqCostingSubElementConversation(
            target.costingId,
            target.subElementKey,
            sessionToken,
          )

          return [target.lookupKey, getConversationMessageCountFromResponse(response)]
        } catch (error) {
          if (![401, 403, 404].includes(error?.statusCode)) {
            console.warn('[CostingBoard] Unable to preload conversation count:', error)
          }

          return null
        }
      }),
    )

    batchResults.forEach((result) => {
      if (!Array.isArray(result) || result.length !== 2) {
        return
      }

      const [lookupKey, messageCount] = result
      messageCountsByKey.set(lookupKey, messageCount)
    })
  }

  return updateProjectsConversationMessageCounts(projects, messageCountsByKey)
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

function serializeSubElementForCostingPayload(subElement) {
  return {
    key: subElement.key,
    title: subElement.title,
    pilot: subElement.pilot,
    approver: subElement.approver,
    status: subElement.status,
    approval_status: subElement.approvalStatus,
    duration: subElement.duration,
    due_date: subElement.dueDate,
  }
}

function getCreatedCostingId(response) {
  return (
    getOptionalText(response?.id) ||
    getOptionalText(response?.costing_id) ||
    getOptionalText(response?.costingId) ||
    getOptionalText(response?.costing?.id) ||
    getOptionalText(response?.costing?.costing_id) ||
    getOptionalText(response?.costing?.costingId) ||
    getOptionalText(response?.item?.id) ||
    getOptionalText(response?.item?.costing_id) ||
    getOptionalText(response?.item?.costingId) ||
    getOptionalText(response?.data?.id) ||
    getOptionalText(response?.data?.costing_id) ||
    getOptionalText(response?.data?.costingId)
  )
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

export default function CostingBoardProfessional({ currentUser = {}, workspaceAction = null }) {
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
  const [activeRfqModal, setActiveRfqModal] = useState(null)
  const [rfqForm, setRfqForm] = useState(() => createEmptyRfqForm())
  const [rfqFormError, setRfqFormError] = useState('')
  const [isSubmittingRfq, setIsSubmittingRfq] = useState(false)
  const [workspaceFeedback, setWorkspaceFeedback] = useState('')
  const [workspaceFeedbackType, setWorkspaceFeedbackType] = useState('success')
  const [deletingCostingId, setDeletingCostingId] = useState('')
  const [activeDeleteCostingModal, setActiveDeleteCostingModal] = useState(null)
  const [activeConversationDrawer, setActiveConversationDrawer] = useState(null)
  const [conversationData, setConversationData] = useState(null)
  const [conversationError, setConversationError] = useState('')
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [isSubmittingConversation, setIsSubmittingConversation] = useState(false)
  const [isLoadingConversationMentionUsers, setIsLoadingConversationMentionUsers] =
    useState(false)
  const [conversationMentionUsersError, setConversationMentionUsersError] = useState('')
  const [conversationReloadKey, setConversationReloadKey] = useState(0)
  const [subElementOptions, setSubElementOptions] = useState(() => DEFAULT_SUB_ELEMENT_OPTIONS)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const currentUserBackendRole = getCurrentUserBackendRole(currentUser)
  const currentUserIdentityKey = getIdentityLookupValues(currentUser).join('|')
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

        const nextProjects = enrichProjectsWithPilotUsers(
          groupRfqsIntoProjects(nextRfqs),
          pilotUsers,
        )
        const hydratedProjects = await preloadConversationMessageCounts(
          nextProjects,
          currentUser,
          currentUserBackendRole,
          getSession()?.token,
        )

        if (!isActive) {
          return
        }

        setSubElementOptions(nextSubElementOptions)
        setProjects(hydratedProjects)
        setExpandedProjectIds((currentIds) => {
          const availableIds = hydratedProjects.map((project) => project.id)
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
  }, [currentUserBackendRole, currentUserIdentityKey, isSubElementApiEnabled, reloadKey])

  useEffect(() => {
    if (pilotUsers.length > 0) {
      return undefined
    }

    let isActive = true

    async function loadUsers() {
      try {
        const response = await getUsers(getSession()?.token)
        const nextPilotUsers = Array.isArray(response) ? response : response?.items ?? []

        if (!isActive) {
          return
        }

        setPilotUsers(nextPilotUsers)
      } catch (error) {
        console.warn('[CostingBoard] Unable to preload users:', error)
      }
    }

    loadUsers()

    return () => {
      isActive = false
    }
  }, [pilotUsers.length])

  useEffect(() => {
    if (pilotUsers.length === 0) {
      return
    }

    setProjects((currentProjects) => enrichProjectsWithPilotUsers(currentProjects, pilotUsers))
  }, [pilotUsers])

  useEffect(() => {
    if (!activeConversationDrawer) {
      setConversationData(null)
      setConversationError('')
      setIsLoadingConversation(false)
      return undefined
    }

    let isActive = true

    async function loadConversation() {
      setIsLoadingConversation(true)
      setConversationError('')

      try {
        const sessionToken = getSession()?.token

        if (!sessionToken) {
          throw new Error('Authentication is required.')
        }

        const baseKey = getBaseSubElementKey(activeConversationDrawer.subElementKey)
        console.log('[CostingBoard] Loading conversation for:', {
          costingId: activeConversationDrawer.costingId,
          subElementKey: activeConversationDrawer.subElementKey,
          baseKey,
        })

        const response = await getRfqCostingSubElementConversation(
          activeConversationDrawer.costingId,
          baseKey,
          sessionToken,
        )

        if (!isActive) {
          return
        }

        console.log('[CostingBoard] Conversation loaded successfully:', {
          messageCount: response?.items?.length || 0,
        })
        setConversationData(response)
        setProjects((currentProjects) =>
          updateProjectsConversationMessageCount(
            currentProjects,
            activeConversationDrawer.costingId,
            activeConversationDrawer.subElementKey,
            getConversationMessageCountFromResponse(response),
          ),
        )
      } catch (error) {
        if (!isActive) {
          return
        }

        console.error('[CostingBoard] Failed to load conversation:', {
          message: error.message,
          statusCode: error.statusCode,
          costingId: activeConversationDrawer.costingId,
          subElementKey: activeConversationDrawer.subElementKey,
          error,
        })

        setConversationData(null)
        
        let errorMessage = error.message || 'Unable to load the conversation.'
        
        // Provide more specific error messages
        if (error.statusCode === 404) {
          errorMessage = `This conversation step is not available for costing ${activeConversationDrawer.costingId}. Please verify the costing exists and is in Initial Costing stage.`
        } else if (error.statusCode === 401) {
          errorMessage = 'Your session has expired. Please sign in again.'
        } else if (error.statusCode === 403) {
          errorMessage = 'You do not have permission to access this conversation.'
        }
        
        setConversationError(errorMessage)
      } finally {
        if (isActive) {
          setIsLoadingConversation(false)
        }
      }
    }

    loadConversation()

    return () => {
      isActive = false
    }
  }, [
    activeConversationDrawer?.costingId,
    activeConversationDrawer?.subElementKey,
    conversationReloadKey,
  ])

  useEffect(() => {
    if (!activeConversationDrawer) {
      setConversationMentionUsersError('')
      setIsLoadingConversationMentionUsers(false)
      return undefined
    }

    if (pilotUsers.length > 0) {
      setConversationMentionUsersError('')
      return undefined
    }

    let isActive = true

    async function loadConversationMentionUsers() {
      setIsLoadingConversationMentionUsers(true)
      setConversationMentionUsersError('')

      try {
        const response = await getUsers(getSession()?.token)
        const nextUsers = Array.isArray(response) ? response : response?.items ?? []

        if (!isActive) {
          return
        }

        setPilotUsers(nextUsers)
      } catch (error) {
        if (!isActive) {
          return
        }

        setConversationMentionUsersError(error.message || 'Unable to load users to mention.')
      } finally {
        if (isActive) {
          setIsLoadingConversationMentionUsers(false)
        }
      }
    }

    loadConversationMentionUsers()

    return () => {
      isActive = false
    }
  }, [activeConversationDrawer?.costingId, activeConversationDrawer?.subElementKey, pilotUsers.length])

  useEffect(() => {
    if (!workspaceAction || workspaceAction.type !== 'open-step-conversation') {
      return
    }

    const normalizedCostingId = String(workspaceAction.costingId || '').trim()
    const normalizedSubElementKey = getBaseSubElementKey(workspaceAction.subElementKey)

    if (!normalizedCostingId || !normalizedSubElementKey) {
      return
    }

    let matchedProject = null
    let matchedEntry = null
    let matchedSubElement = null

    projects.some((project) => {
      const projectEntries = project.stages.flatMap((stage) =>
        getProjectStageEntries(project, stage.key).map((entry) => ({
          ...entry,
          stageLabel: stage.label,
          stageKey: stage.key,
        })),
      )

      return projectEntries.some((entry) => {
        if (String(entry.id) !== normalizedCostingId) {
          return false
        }

        const entrySubElements = Array.isArray(entry.subElements) ? entry.subElements : []
        const foundSubElement =
          entrySubElements.find(
            (subElement) => getBaseSubElementKey(subElement.key) === normalizedSubElementKey,
          ) || null

        matchedProject = project
        matchedEntry = entry
        matchedSubElement = foundSubElement
        return true
      })
    })

    if (matchedProject) {
      setExpandedProjectIds((currentIds) =>
        currentIds.includes(matchedProject.id) ? currentIds : [...currentIds, matchedProject.id],
      )
    }

    setActiveConversationDrawer({
      projectId: matchedProject?.id || null,
      projectTitle: matchedProject?.title || workspaceAction.projectTitle || 'Project',
      costingId: normalizedCostingId,
      costingReference: matchedEntry?.reference || workspaceAction.costingReference || '',
      stageLabel: matchedEntry?.stageLabel || workspaceAction.stageLabel || 'Initial Costing',
      subElementKey: matchedSubElement?.key || normalizedSubElementKey,
      subElementTitle:
        matchedSubElement?.title || workspaceAction.subElementTitle || 'Step conversation',
    })
    setConversationReloadKey((currentValue) => currentValue + 1)
  }, [projects, workspaceAction?.requestId])

  const visibleProjects =
    pilotUsers.length > 0 ? enrichProjectsWithPilotUsers(projects, pilotUsers) : projects

  const totalProjects = visibleProjects.length
  const totalRfqs = visibleProjects.reduce((count, project) => count + getProjectRfqCount(project), 0)
  const totalCostings = visibleProjects.reduce((count, project) => count + project.costingCount, 0)
  const awaitingCostingCount = getAwaitingCostingCount(visibleProjects)

  const boardStats = [
    { label: 'RFQs', value: totalProjects },
    { label: 'Sub-elements', value: totalRfqs },
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

  const closeRfqModal = ({ force = false } = {}) => {
    if (isSubmittingRfq && !force) {
      return
    }

    setActiveRfqModal(null)
    setRfqForm(createEmptyRfqForm())
    setRfqFormError('')
  }

  const closeDeleteCostingModal = ({ force = false } = {}) => {
    if (deletingCostingId && !force) {
      return
    }

    setActiveDeleteCostingModal(null)
  }

  const openRfqModal = () => {
    setActiveRfqModal({
      mode: 'create',
    })
    setRfqForm(createEmptyRfqForm())
    setRfqFormError('')
  }

  const openDeleteCostingModal = (project, entry) => {
    const costingId = String(entry?.id ?? '').trim()

    if (!costingId) {
      return
    }

    setActiveDeleteCostingModal({
      costingId,
      projectTitle: project?.title || 'Project',
      stageLabel: entry?.stageLabel || 'Costing',
      reference: entry?.reference || '',
    })
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

  const closeConversationDrawer = ({ force = false } = {}) => {
    if (isSubmittingConversation && !force) {
      return
    }

    setActiveConversationDrawer(null)
    setConversationData(null)
    setConversationError('')
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
        mode === 'edit'
          ? getPilotDisplayValue(
              {
                ...subElement,
                pilot: getSubElementPilotValue(subElement, currentUser),
              },
              pilotUsers,
            ) || getSubElementPilotValue(subElement, currentUser)
          : getPilotDisplayValue(subElement, pilotUsers) || subElement.pilot,
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

  const openConversationDrawer = (project, entry, subElement) => {
    if (!canAccessConversation(subElement)) {
      return
    }

    setActiveConversationDrawer({
      projectId: project.id,
      projectTitle: project.title,
      costingId: entry.id,
      costingReference: entry.reference,
      stageLabel: entry.stageLabel,
      subElementKey: subElement.key,
      subElementTitle: subElement.title,
    })
    setConversationReloadKey((currentValue) => currentValue + 1)
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
        getOptionalText(getPilotDisplayValue(subElement, pilotUsers)) &&
        getPilotDisplayValue(subElement, pilotUsers) !== 'Project pilot'
          ? getPilotDisplayValue(subElement, pilotUsers)
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
      const response = await getUsers(getSession()?.token)
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

  const canAccessConversation = (subElement) =>
    currentUserBackendRole === 'admin' || canFillSubElement(subElement)

  const handleRfqFormChange = (field, value) => {
    setRfqForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  const handleRfqSubmit = async (event) => {
    event.preventDefault()

    if (!activeRfqModal) {
      return
    }

    const reference = String(rfqForm.reference ?? '').trim()
    const productName = String(rfqForm.productName ?? '').trim()
    const annualVolume = String(rfqForm.annualVolume ?? '').trim()
    const targetPrice = String(rfqForm.targetPrice ?? '').trim().replace(',', '.')

    if (!reference) {
      setRfqFormError('RFQ reference is required.')
      return
    }

    if (!productName) {
      setRfqFormError('Product name is required.')
      return
    }

    if (annualVolume && !/^\d+$/.test(annualVolume)) {
      setRfqFormError('Annual volume must be a whole number.')
      return
    }

    if (targetPrice && !/^\d+(\.\d+)?$/.test(targetPrice)) {
      setRfqFormError('Target price must be a valid number.')
      return
    }

    setIsSubmittingRfq(true)
    setRfqFormError('')

    try {
      await createRfq({
        reference,
        customer_name: String(rfqForm.customerName ?? '').trim(),
        project_name: String(rfqForm.projectName ?? '').trim(),
        product_name: productName,
        delivery_plant: String(rfqForm.deliveryPlant ?? '').trim(),
        quotation_expected_date: String(rfqForm.quotationDate ?? '').trim(),
        annual_volume: annualVolume,
        target_price: targetPrice,
        target_price_currency: String(rfqForm.currency ?? 'EUR').trim() || 'EUR',
        // Additional RFQ fields
        scope: String(rfqForm.scope ?? '').trim(),
        country: String(rfqForm.country ?? '').trim(),
        po_date: String(rfqForm.poDate ?? '').trim(),
        ppap_date: String(rfqForm.ppapDate ?? '').trim(),
        contact_name: String(rfqForm.contactName ?? '').trim(),
        contact_email: String(rfqForm.contactEmail ?? '').trim(),
        contact_phone: String(rfqForm.contactPhone ?? '').trim(),
        contact_role: String(rfqForm.contactRole ?? '').trim(),
        customer_pn: String(rfqForm.customerPn ?? '').trim(),
        application: String(rfqForm.application ?? '').trim(),
        business_trigger: String(rfqForm.businessTrigger ?? '').trim(),
        final_recommendation: String(rfqForm.finalRecommendation ?? '').trim(),
        expected_payment_terms: String(rfqForm.expectedPaymentTerms ?? '').trim(),
      })

      closeRfqModal({ force: true })
      setWorkspaceFeedback('RFQ created successfully.')
      setWorkspaceFeedbackType('success')
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      const nextErrorMessage =
        error?.statusCode === 404
          ? 'Manual RFQ creation is not available on the backend.'
          : error.message || 'Unable to create the RFQ.'

      setRfqFormError(nextErrorMessage)
      setWorkspaceFeedback(nextErrorMessage)
      setWorkspaceFeedbackType('error')
    } finally {
      setIsSubmittingRfq(false)
    }
  }

  const handleCostingFormChange = (field, value) => {
    setCostingForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  const handleDeleteCosting = async () => {
    const costingId = String(activeDeleteCostingModal?.costingId ?? '').trim()

    if (!costingId) {
      return
    }

    setDeletingCostingId(costingId)

    try {
      await deleteRfqCosting(costingId)
      closeDeleteCostingModal({ force: true })
      setWorkspaceFeedback('Costing deleted successfully.')
      setWorkspaceFeedbackType('success')
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      setWorkspaceFeedback(error.message || 'Unable to delete the costing.')
      setWorkspaceFeedbackType('error')
    } finally {
      setDeletingCostingId('')
    }
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
        const createdCosting = await createRfqCosting(activeCostingModal.rfqId, {
          type: activeCostingModal.stageLabel,
          ...payload,
        })

        if (activeCostingModal.stageKey === 'initial') {
          const createdCostingId = getCreatedCostingId(createdCosting)

          if (createdCostingId) {
            try {
              await updateRfqCosting(createdCostingId, {
                sub_elements: createDefaultCostingSubElements().map(
                  serializeSubElementForCostingPayload,
                ),
              })
            } catch (error) {
              console.warn(
                `[CostingBoard] Unable to seed initial costing steps for costing ${createdCostingId}:`,
                error,
              )
            }
          }
        }
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
            getBaseSubElementKey(activePilotAssignmentModal.subElementKey),
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
      setWorkspaceFeedback('Pilot assigned successfully.')
      setWorkspaceFeedbackType('success')
      setReloadKey((currentValue) => currentValue + 1)
    } catch (error) {
      const nextErrorMessage = error.message || 'Unable to assign the pilot.'
      setPilotAssignmentError(nextErrorMessage)
      setWorkspaceFeedback(nextErrorMessage)
      setWorkspaceFeedbackType('error')
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
            getBaseSubElementKey(activeSubElementModal.subElementKey),
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

  const handleConversationSubmit = async (payload) => {
    if (!activeConversationDrawer) {
      throw new Error('No active conversation was selected.')
    }

    const sessionToken = getSession()?.token

    if (!sessionToken) {
      throw new Error('Authentication is required.')
    }

    setIsSubmittingConversation(true)

    try {
      const baseKey = getBaseSubElementKey(activeConversationDrawer.subElementKey)
      console.log('[CostingBoard] Submitting conversation message:', {
        costingId: activeConversationDrawer.costingId,
        subElementKey: activeConversationDrawer.subElementKey,
        baseKey,
        messageLength: payload?.message?.length || 0,
      })

      const response = await createRfqCostingSubElementConversationMessage(
        activeConversationDrawer.costingId,
        baseKey,
        payload,
        sessionToken,
      )

      console.log('[CostingBoard] Message sent successfully')
      const currentConversationItems = Array.isArray(conversationData?.items) ? conversationData.items : []
      const nextConversationMessageCount = response?.item
        ? currentConversationItems.length + 1
        : getConversationMessageCountFromResponse(response)

      setConversationData((currentConversationData) => {
        const currentItems = Array.isArray(currentConversationData?.items)
          ? currentConversationData.items
          : []
        const nextItems = response?.item ? [...currentItems, response.item] : currentItems

        return {
          conversation: response?.conversation || currentConversationData?.conversation || null,
          items: nextItems,
          total_count: nextItems.length,
        }
      })
      setProjects((currentProjects) =>
        updateProjectsConversationMessageCount(
          currentProjects,
          activeConversationDrawer.costingId,
          activeConversationDrawer.subElementKey,
          nextConversationMessageCount,
        ),
      )

      return response
    } catch (error) {
      console.error('[CostingBoard] Failed to send message:', {
        message: error.message,
        statusCode: error.statusCode,
        error,
      })

      if (error.statusCode === 404) {
        throw new Error(
          `Cannot send message: This conversation step is not available for costing ${activeConversationDrawer.costingId}.`,
        )
      } else if (error.statusCode === 401) {
        throw new Error('Your session has expired. Please sign in again.')
      } else if (error.statusCode === 403) {
        throw new Error('You do not have permission to send messages in this conversation.')
      }

      throw error instanceof Error ? error : new Error('Unable to send the message.')
    } finally {
      setIsSubmittingConversation(false)
    }
  }

  return (
    <>
      <CostingToast
        feedback={workspaceFeedback}
        feedbackType={workspaceFeedbackType}
        onClose={() => setWorkspaceFeedback('')}
      />

      <section className="costing-simple" aria-label="Costing projects board">
      <CostingBoardHeader
        totalProjects={totalProjects}
        boardStats={boardStats}
        pluralize={pluralize}
        onAddManualRfq={openRfqModal}
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

      {!isLoading && !errorMessage && visibleProjects.length === 0 ? (
        <CostingBoardState
          title="No project available"
          description="No RFQ was returned by the backend for the costing workspace."
          actionLabel="Refresh"
          onAction={() => setReloadKey((currentValue) => currentValue + 1)}
        />
      ) : null}

      {!isLoading && !errorMessage && visibleProjects.length > 0 ? (
        <div className="costing-simple__projects">
          {visibleProjects.map((project) => {
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
                onDeleteCosting={openDeleteCostingModal}
                deletingCostingId={deletingCostingId}
                canFillSubElement={canFillSubElement}
                canAssignPilot={canAssignPilot}
                canAccessConversation={canAccessConversation}
                onAssignPilot={openPilotAssignmentModal}
                onFillSubElement={openFillSubElementModal}
                onViewSubElement={openViewSubElementModal}
                onOpenConversation={openConversationDrawer}
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

      <CostingRfqModal
        modal={activeRfqModal}
        form={rfqForm}
        errorMessage={rfqFormError}
        isSubmitting={isSubmittingRfq}
        onRequestClose={closeRfqModal}
        onSubmit={handleRfqSubmit}
        onFieldChange={handleRfqFormChange}
      />

      <CostingDeleteConfirmationModal
        modal={activeDeleteCostingModal}
        isSubmitting={Boolean(deletingCostingId)}
        onRequestClose={closeDeleteCostingModal}
        onSubmit={handleDeleteCosting}
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

      <CostingSubElementConversationDrawer
        drawer={activeConversationDrawer}
        conversation={conversationData}
        currentUser={currentUser}
        isLoading={isLoadingConversation}
        isSubmitting={isSubmittingConversation}
        mentionableUsers={getConversationMentionableUsers(pilotUsers)}
        isLoadingMentionableUsers={isLoadingConversationMentionUsers}
        mentionableUsersError={conversationMentionUsersError}
        errorMessage={conversationError}
        onRequestClose={closeConversationDrawer}
        onReload={() => setConversationReloadKey((currentValue) => currentValue + 1)}
        onSubmit={handleConversationSubmit}
      />
      </section>
    </>
  )
}
