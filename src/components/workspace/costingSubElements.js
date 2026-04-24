export const COSTING_SUB_ELEMENT_STATUS_OPTIONS = [
  'To be planned',
  'Not requested',
  'Ready to start',
  'Escalation level 1',
  'In progress',
  'Late!',
  'Done',
  'Question to PM',
  'Question to sales',
  'Question to PL',
  'Help!!!',
]

export const COSTING_SUB_ELEMENT_APPROVAL_STATUS_OPTIONS = [
  'Not requested',
  'Approved',
  'Not approved',
  'To be approved',
  'Ready for app',
  'Need to be reworked',
]

export const COSTING_SUB_ELEMENT_TEMPLATES = [
  {
    key: 'needed-data-understood',
    index: '01',
    title: 'All needed data are available and understood',
    description:
      'Pilot validates that the input package is complete, aligned, and clear before costing work starts.',
    pilotRoleLabel: 'Pilot',
    approverRoleLabel: 'Esc level 1 / Approver',
    accessRolesLabel: 'Pilot, Manager or Admin',
    defaultPilot: 'Project pilot',
    defaultApprover: 'Manager',
    allowedRoleKeywords: ['pilot', 'manager', 'approver', 'admin'],
    defaultStatus: 'To be planned',
    defaultApprovalStatus: 'Not requested',
  },
  {
    key: 'technical-feasibility-assessment',
    index: '02',
    title: 'Technical feasibility assessment is available for customer communication',
    description:
      'Technical feasibility assessment is prepared and shared for customer communication.',
    pilotRoleLabel: 'Pilot',
    approverRoleLabel: 'Esc level 1 / Approver',
    accessRolesLabel: 'Pilot, Manager or Admin',
    defaultPilot: 'Project pilot',
    defaultApprover: 'Manager',
    allowedRoleKeywords: ['pilot', 'manager', 'approver', 'admin'],
    defaultStatus: 'To be planned',
    defaultApprovalStatus: 'Not requested',
  },
  {
    key: 'bom-spec-completed',
    index: '03',
    title: 'BoM and spec are correctly completed inside the costing file',
    description:
      'BoM and specifications are completed in the costing file and ready for the next review.',
    pilotRoleLabel: 'Pilot',
    approverRoleLabel: 'Esc level 1 / Approver',
    accessRolesLabel: 'Pilot, Manager or Admin',
    defaultPilot: 'Project pilot',
    defaultApprover: 'Manager',
    allowedRoleKeywords: ['pilot', 'manager', 'approver', 'admin'],
    defaultStatus: 'To be planned',
    defaultApprovalStatus: 'Not requested',
  },
  {
    key: 'avo-design-assembly-2d',
    index: '04',
    title: 'AVO Design owner : assembly 2D is available for customer communication',
    description:
      'The 2D assembly owned by AVO Design is available for customer communication.',
    pilotRoleLabel: 'Pilot',
    approverRoleLabel: 'Esc level 1 / Approver',
    accessRolesLabel: 'Pilot, Manager or Admin',
    defaultPilot: 'Project pilot',
    defaultApprover: 'Manager',
    allowedRoleKeywords: ['pilot', 'manager', 'approver', 'admin'],
    defaultStatus: 'To be planned',
    defaultApprovalStatus: 'Not requested',
  },
  {
    key: 'bom-cost-ready',
    index: '05',
    title: 'BoM cost is ready for costing calculation (estimated at 60% max)',
    description:
      'BoM cost is available to support the costing calculation stage.',
    pilotRoleLabel: 'Pilot',
    approverRoleLabel: 'Esc level 1 / Approver',
    accessRolesLabel: 'Pilot, Manager or Admin',
    defaultPilot: 'Project pilot',
    defaultApprover: 'Manager',
    allowedRoleKeywords: ['pilot', 'manager', 'approver', 'admin'],
    defaultStatus: 'To be planned',
    defaultApprovalStatus: 'Not requested',
  },
  {
    key: 'assembly-cost-line',
    index: '06',
    title: 'Assembly cost and line are available inside the costing file (estimated at max 60%)',
    description:
      'Assembly cost and line data are available in the costing file for evaluation.',
    pilotRoleLabel: 'Pilot',
    approverRoleLabel: 'Esc level 1 / Approver',
    accessRolesLabel: 'Pilot, Manager or Admin',
    defaultPilot: 'Project pilot',
    defaultApprover: 'Manager',
    allowedRoleKeywords: ['pilot', 'manager', 'approver', 'admin'],
    defaultStatus: 'To be planned',
    defaultApprovalStatus: 'Not requested',
  },
  {
    key: 'costing-file-reviewed',
    index: '07',
    title: 'Costing file is reviewed and approved with N+1',
    description:
      'The costing file has been reviewed and approved with the next management level.',
    pilotRoleLabel: 'Pilot',
    approverRoleLabel: 'Esc level 1 / Approver',
    accessRolesLabel: 'Pilot, Manager or Admin',
    defaultPilot: 'Project pilot',
    defaultApprover: 'Manager',
    allowedRoleKeywords: ['pilot', 'manager', 'approver', 'admin'],
    defaultStatus: 'To be planned',
    defaultApprovalStatus: 'Not requested',
  },
]

const STATUS_ALIASES = {
  'to be planned': 'To be planned',
  'to be plannd': 'To be planned',
  late: 'Late!',
  'late !': 'Late!',
  help: 'Help!!!',
  'help!': 'Help!!!',
  'help!!': 'Help!!!',
  'help !!!': 'Help!!!',
  'question to pm': 'Question to PM',
  'qustion to pm': 'Question to PM',
  'question to sales': 'Question to sales',
  'question to sals': 'Question to sales',
  'qustion to sales': 'Question to sales',
  'question to pl': 'Question to PL',
  'qustion to pl': 'Question to PL',
}

const APPROVAL_STATUS_ALIASES = {
  'not requested': 'Not requested',
  approved: 'Approved',
  'not approved': 'Not approved',
  'to be approved': 'To be approved',
  'ready for app': 'Ready for app',
  'need to b reworked': 'Need to be reworked',
  'need to be reworked': 'Need to be reworked',
}

const FIRST_COSTING_SUB_ELEMENT_KEY = 'needed-data-understood'
const TECHNICAL_FEASIBILITY_ASSESSMENT_KEY = 'technical-feasibility-assessment'
const BOM_SPEC_COMPLETED_KEY = 'bom-spec-completed'
const AVO_DESIGN_ASSEMBLY_2D_KEY = 'avo-design-assembly-2d'
const BOM_COST_READY_KEY = 'bom-cost-ready'
const ASSEMBLY_COST_LINE_KEY = 'assembly-cost-line'
const COSTING_FILE_REVIEWED_KEY = 'costing-file-reviewed'

const DESIGN_TYPE_VISIBLE_STEP_KEYS = {
  'customer design': [
    TECHNICAL_FEASIBILITY_ASSESSMENT_KEY,
    BOM_SPEC_COMPLETED_KEY,
  ],
  'avo design': [AVO_DESIGN_ASSEMBLY_2D_KEY],
}

const DEFAULT_COSTING_SUB_ELEMENT_ORDER = COSTING_SUB_ELEMENT_TEMPLATES.map(
  (template) => template.key,
)

const AVO_DESIGN_COSTING_SUB_ELEMENT_ORDER = [
  FIRST_COSTING_SUB_ELEMENT_KEY,
  AVO_DESIGN_ASSEMBLY_2D_KEY,
  ...DEFAULT_COSTING_SUB_ELEMENT_ORDER.filter(
    (key) => ![FIRST_COSTING_SUB_ELEMENT_KEY, AVO_DESIGN_ASSEMBLY_2D_KEY].includes(key),
  ),
]

const TECHNICAL_PACKAGE_STEP_KEYS = [
  TECHNICAL_FEASIBILITY_ASSESSMENT_KEY,
  BOM_SPEC_COMPLETED_KEY,
]

const COSTING_PREPARATION_STEP_KEYS = [BOM_COST_READY_KEY, ASSEMBLY_COST_LINE_KEY]

function getTrimmedText(value) {
  return String(value ?? '').trim()
}

function getBaseSubElementKey(value) {
  const trimmedValue = getTrimmedText(value)
  // Extract the base key by removing the suffix after ':' (e.g., 'needed-data-understood:1' -> 'needed-data-understood')
  return trimmedValue.split(':')[0]
}

function getDisplayText(value, fallback) {
  const normalizedValue = getTrimmedText(value)
  return normalizedValue || fallback
}

function getManagerDisplayName(sourceElement, fallback) {
  const managers = Array.isArray(sourceElement?.managers) ? sourceElement.managers : []
  const approverValue = getTrimmedText(
    sourceElement?.approver ?? sourceElement?.approver_name,
  )

  const normalizedManagers = managers
    .map((manager) => {
      const fullName = getTrimmedText(manager?.full_name ?? manager?.fullName ?? manager?.name)
      const email = getTrimmedText(manager?.email)
      const id = getTrimmedText(manager?.id)

      return {
        fullName,
        email,
        id,
      }
    })
    .filter((manager) => manager.fullName || manager.email || manager.id)

  if (approverValue) {
    const matchedManager = normalizedManagers.find(
      (manager) =>
        approverValue === manager.fullName ||
        approverValue === manager.email ||
        approverValue === manager.id,
    )

    if (matchedManager) {
      return matchedManager.fullName || matchedManager.email || fallback
    }
  }

  if (normalizedManagers.length === 1) {
    return normalizedManagers[0].fullName || normalizedManagers[0].email || fallback
  }

  return getDisplayText(approverValue, fallback)
}

function getPilotDisplayName(sourceElement, fallback) {
  const pilotNameValue = getTrimmedText(
    sourceElement?.pilot_name ??
      sourceElement?.pilotName ??
      sourceElement?.pilot_full_name ??
      sourceElement?.pilotFullName,
  )
  const pilotValue = getTrimmedText(sourceElement?.pilot)

  if (pilotNameValue) {
    return pilotNameValue
  }

  return getDisplayText(pilotValue, fallback)
}

function getLookupKey(value) {
  return getTrimmedText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeSelectValue(value, allowedValues, aliases, fallback) {
  const normalizedValue = getTrimmedText(value)

  if (!normalizedValue) {
    return fallback
  }

  if (allowedValues.includes(normalizedValue)) {
    return normalizedValue
  }

  return aliases[getLookupKey(normalizedValue)] || fallback
}

function formatCostingSubElementIndex(position) {
  const numericPosition = Number.parseInt(String(position ?? '').trim(), 10)

  if (!Number.isInteger(numericPosition) || numericPosition <= 0) {
    return '01'
  }

  return String(numericPosition).padStart(2, '0')
}

function getNormalizedDesignType(sourceElementsMap) {
  const firstSubElement = sourceElementsMap.get(FIRST_COSTING_SUB_ELEMENT_KEY)
  return getLookupKey(firstSubElement?.designType ?? firstSubElement?.design_type)
}

function isFirstCostingSubElementApproved(sourceElementsMap) {
  const firstSubElement = sourceElementsMap.get(FIRST_COSTING_SUB_ELEMENT_KEY)
  const firstSubElementApprovalStatus = normalizeCostingSubElementApprovalStatus(
    firstSubElement?.approvalStatus ?? firstSubElement?.approval_status,
    'Not requested',
  )

  return firstSubElementApprovalStatus === 'Approved'
}

function isCostingSubElementApproved(sourceElement) {
  const normalizedApprovalStatus = normalizeCostingSubElementApprovalStatus(
    sourceElement?.approvalStatus ?? sourceElement?.approval_status,
    '',
  )

  return normalizedApprovalStatus === 'Approved'
}

function areCostingSubElementsApproved(sourceElementsMap, stepKeys) {
  return stepKeys.every((key) => isCostingSubElementApproved(sourceElementsMap.get(key)))
}

function getOrderedVisibleCostingSubElementTemplates(sourceElementsMap, visibleKeys) {
  const orderedKeys =
    getNormalizedDesignType(sourceElementsMap) === 'avo design'
      ? AVO_DESIGN_COSTING_SUB_ELEMENT_ORDER
      : DEFAULT_COSTING_SUB_ELEMENT_ORDER

  return orderedKeys
    .filter((key) => visibleKeys.has(key))
    .map((key) => getCostingSubElementTemplate(key))
    .filter(Boolean)
}

function getVisibleCostingSubElementKeys(sourceElementsMap) {
  return new Set(DEFAULT_COSTING_SUB_ELEMENT_ORDER)
}

function getAutoStartedCostingSubElementKeys(sourceElementsMap) {
  if (!isFirstCostingSubElementApproved(sourceElementsMap)) {
    return new Set()
  }

  const normalizedDesignType = getNormalizedDesignType(sourceElementsMap)
  const autoStartedKeys = new Set()
  const isAvoDesign = normalizedDesignType === 'avo design'
  const isCustomerDesign = normalizedDesignType === 'customer design'

  if (isAvoDesign) {
    autoStartedKeys.add(AVO_DESIGN_ASSEMBLY_2D_KEY)
  }

  if (
    isCustomerDesign ||
    (isAvoDesign && isCostingSubElementApproved(sourceElementsMap.get(AVO_DESIGN_ASSEMBLY_2D_KEY)))
  ) {
    TECHNICAL_PACKAGE_STEP_KEYS.forEach((key) => {
      autoStartedKeys.add(key)
    })
  }

  if (areCostingSubElementsApproved(sourceElementsMap, TECHNICAL_PACKAGE_STEP_KEYS)) {
    COSTING_PREPARATION_STEP_KEYS.forEach((key) => {
      autoStartedKeys.add(key)
    })
  }

  if (areCostingSubElementsApproved(sourceElementsMap, COSTING_PREPARATION_STEP_KEYS)) {
    autoStartedKeys.add(COSTING_FILE_REVIEWED_KEY)
  }

  return autoStartedKeys
}

export function normalizeCostingSubElementStatus(value, fallback = 'To be planned') {
  return normalizeSelectValue(
    value,
    COSTING_SUB_ELEMENT_STATUS_OPTIONS,
    STATUS_ALIASES,
    fallback,
  )
}

export function normalizeCostingSubElementApprovalStatus(
  value,
  fallback = 'Not requested',
) {
  return normalizeSelectValue(
    value,
    COSTING_SUB_ELEMENT_APPROVAL_STATUS_OPTIONS,
    APPROVAL_STATUS_ALIASES,
    fallback,
  )
}

export function normalizeCostingSubElementStatusOptions(options) {
  const normalizedOptions = Array.isArray(options)
    ? options
        .map((option) => normalizeCostingSubElementStatus(option, ''))
        .filter(Boolean)
    : []

  return normalizedOptions.length > 0
    ? Array.from(new Set(normalizedOptions))
    : COSTING_SUB_ELEMENT_STATUS_OPTIONS
}

export function normalizeCostingSubElementApprovalStatusOptions(options) {
  const normalizedOptions = Array.isArray(options)
    ? options
        .map((option) => normalizeCostingSubElementApprovalStatus(option, ''))
        .filter(Boolean)
    : []

  return normalizedOptions.length > 0
    ? Array.from(new Set(normalizedOptions))
    : COSTING_SUB_ELEMENT_APPROVAL_STATUS_OPTIONS
}

export function getCostingSubElementTemplate(key) {
  return (
    COSTING_SUB_ELEMENT_TEMPLATES.find((template) => getTrimmedText(template.key) === getTrimmedText(key)) ||
    COSTING_SUB_ELEMENT_TEMPLATES.find((template) => getTrimmedText(template.key) === getBaseSubElementKey(key)) ||
    null
  )
}

function getConversationMessageCount(sourceElement = {}) {
  const rawMessageCount =
    sourceElement?.conversation_message_count ??
    sourceElement?.conversationMessageCount ??
    sourceElement?.message_count ??
    sourceElement?.messageCount ??
    sourceElement?.messages_count ??
    sourceElement?.messagesCount ??
    sourceElement?.conversation?.total_count ??
    sourceElement?.conversation?.totalCount ??
    sourceElement?.conversation?.message_count ??
    sourceElement?.conversation?.messageCount
  const parsedMessageCount = Number.parseInt(String(rawMessageCount ?? '').trim(), 10)

  if (Number.isInteger(parsedMessageCount) && parsedMessageCount >= 0) {
    return parsedMessageCount
  }

  if (Array.isArray(sourceElement?.conversation?.items)) {
    return sourceElement.conversation.items.length
  }

  return null
}

export function createDefaultCostingSubElements() {
  return COSTING_SUB_ELEMENT_TEMPLATES.map((template) => ({
    key: template.key,
    index: template.index,
    title: template.title,
    description: template.description,
    pilotRoleLabel: template.pilotRoleLabel,
    approverRoleLabel: template.approverRoleLabel,
    accessRolesLabel: template.accessRolesLabel,
    pilot: template.defaultPilot,
    approver: template.defaultApprover,
    status: template.defaultStatus,
    approvalStatus: template.defaultApprovalStatus,
    conversationMessageCount: null,
    duration: '',
    dueDate: '',
    permissions: {
      canFill: null,
      canView: true,
      currentRole: '',
    },
  }))
}

export function normalizeCostingSubElements(subElements) {
  const sourceElements = Array.isArray(subElements) ? subElements : []
  
  // Create a lookup map for O(n) performance instead of O(n*m)
  const sourceElementsMap = new Map()
  sourceElements.forEach((subElement) => {
    const trimmedKey = getTrimmedText(subElement?.key)
    const baseKey = getBaseSubElementKey(trimmedKey)
    if (baseKey) {
      sourceElementsMap.set(baseKey, subElement)
    }
  })

  const visibleKeys = getVisibleCostingSubElementKeys(sourceElementsMap)
  const autoStartedKeys = getAutoStartedCostingSubElementKeys(sourceElementsMap)
  const visibleTemplates = getOrderedVisibleCostingSubElementTemplates(
    sourceElementsMap,
    visibleKeys,
  )

  return visibleTemplates.map((template, visibleIndex) => {
    const sourceElement = sourceElementsMap.get(template.key) || {}
    const hasExplicitFillPermission =
      sourceElement?.permissions &&
      (Object.prototype.hasOwnProperty.call(sourceElement.permissions, 'canFill') ||
        Object.prototype.hasOwnProperty.call(sourceElement.permissions, 'can_fill'))
    const hasExplicitViewPermission =
      sourceElement?.permissions &&
      (Object.prototype.hasOwnProperty.call(sourceElement.permissions, 'canView') ||
        Object.prototype.hasOwnProperty.call(sourceElement.permissions, 'can_view'))

    const normalizedElement = {
      key: template.key,
      index: formatCostingSubElementIndex(visibleIndex + 1),
      title: getDisplayText(
        sourceElement?.title ?? sourceElement?.sub_element_title,
        template.title,
      ),
      description: template.description,
      pilotRoleLabel: getDisplayText(
        sourceElement?.pilot_role_label ?? sourceElement?.pilot_label,
        template.pilotRoleLabel,
      ),
      approverRoleLabel: getDisplayText(
        sourceElement?.approver_role_label ?? sourceElement?.approver_label,
        template.approverRoleLabel,
      ),
      accessRolesLabel: template.accessRolesLabel,
      pilot: getPilotDisplayName(sourceElement, template.defaultPilot),
      pilotId: getTrimmedText(sourceElement?.pilot_id ?? sourceElement?.pilotId),
      pilotEmail: getTrimmedText(sourceElement?.pilot_email ?? sourceElement?.pilotEmail),
      approver: getManagerDisplayName(sourceElement, template.defaultApprover),
      status: normalizeCostingSubElementStatus(sourceElement?.status, template.defaultStatus),
      approvalStatus: normalizeCostingSubElementApprovalStatus(
        sourceElement?.approvalStatus ?? sourceElement?.approval_status,
        template.defaultApprovalStatus,
      ),
      duration: getTrimmedText(
        sourceElement?.duration ??
          sourceElement?.work_duration ??
          sourceElement?.duration_days,
      ),
      conversationMessageCount: getConversationMessageCount(sourceElement),
      dueDate: getTrimmedText(
        sourceElement?.dueDate ??
          sourceElement?.due_date ??
          sourceElement?.deadline ??
          sourceElement?.echeance ??
          sourceElement?.echeances,
      ),
      permissions: {
        canFill: hasExplicitFillPermission
          ? Boolean(sourceElement?.permissions?.canFill ?? sourceElement?.permissions?.can_fill)
          : null,
        canView: hasExplicitViewPermission
          ? Boolean(sourceElement?.permissions?.canView ?? sourceElement?.permissions?.can_view)
          : true,
        currentRole: getTrimmedText(
          sourceElement?.permissions?.currentRole ?? sourceElement?.permissions?.current_role,
        ),
      },
      managers: Array.isArray(sourceElement?.managers) ? sourceElement.managers : [],
    }

    if (
      autoStartedKeys.has(template.key) &&
      ['To be planned', 'Not requested'].includes(normalizedElement.status)
    ) {
      normalizedElement.status = 'Ready to start'
    }

    return normalizedElement
  })
}

export function createEmptyCostingSubElementForm(subElement = {}) {
  return {
    status: normalizeCostingSubElementStatus(subElement.status, 'To be planned'),
    approvalStatus: normalizeCostingSubElementApprovalStatus(
      subElement.approvalStatus,
      'Not requested',
    ),
    duration: getTrimmedText(subElement.duration),
    dueDate: getTrimmedText(subElement.dueDate),
  }
}

export { getBaseSubElementKey }

export function canFillCostingSubElement(userRole, subElementKey) {
  const normalizedUserRole = getLookupKey(userRole)
  const template = getCostingSubElementTemplate(subElementKey)

  if (!template) {
    return true
  }

  if (!normalizedUserRole || normalizedUserRole === 'connected user') {
    return true
  }

  return template.allowedRoleKeywords.some((keyword) =>
    normalizedUserRole.includes(getLookupKey(keyword)),
  )
}
