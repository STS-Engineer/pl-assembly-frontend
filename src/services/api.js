const API_BASE_URL = import.meta.env.VITE_API_URL
const RFQC_SUB_ELEMENT_API_ENABLED =
  String(import.meta.env.VITE_ENABLE_RFQC_SUB_ELEMENT_API || 'true').trim().toLowerCase() ===
  'true'
const RFQC_SUB_ELEMENT_BASE_PATHS = [
  '/rfq-costing-initial-sub-elements',
  '/rfqc-sub-element',
]

function buildApproveSubElementPayload(payload = {}) {
  const normalizedPayload = { ...payload }
  const approvalStatus =
    normalizedPayload.approval_status ?? normalizedPayload.approvalStatus
  const designType = normalizedPayload.design_type ?? normalizedPayload.designType
  const approver =
    normalizedPayload.approver ?? normalizedPayload.manager_name ?? normalizedPayload.managerName
  const approverEmail =
    normalizedPayload.approver_email ??
    normalizedPayload.approverEmail ??
    normalizedPayload.manager_email ??
    normalizedPayload.managerEmail
  const approverId =
    normalizedPayload.approver_id ??
    normalizedPayload.approverId ??
    normalizedPayload.manager_id ??
    normalizedPayload.managerId

  if (approvalStatus !== undefined) {
    normalizedPayload.approval_status = approvalStatus
    normalizedPayload.approvalStatus = approvalStatus
  }

  if (designType !== undefined) {
    normalizedPayload.design_type = designType
    normalizedPayload.designType = designType
  }

  if (approver !== undefined) {
    normalizedPayload.approver = approver
    normalizedPayload.manager_name = approver
    normalizedPayload.managerName = approver
  }

  if (approverEmail !== undefined) {
    normalizedPayload.approver_email = approverEmail
    normalizedPayload.approverEmail = approverEmail
    normalizedPayload.manager_email = approverEmail
    normalizedPayload.managerEmail = approverEmail
  }

  if (approverId !== undefined) {
    normalizedPayload.approver_id = approverId
    normalizedPayload.approverId = approverId
    normalizedPayload.manager_id = approverId
    normalizedPayload.managerId = approverId
  }

  return normalizedPayload
}

function buildUrl(path) {
  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${normalizedBaseUrl}${normalizedPath}`
}

function translateApiMessage(message) {
  if (typeof message !== 'string' || !message) {
    return message
  }

  const exactTranslations = {
    'Une erreur interne est survenue.': 'An internal error occurred.',
    'Compte cree avec succes. Votre compte est en attente d approbation par un administrateur.':
      'Account created successfully. Your account is pending administrator approval.',
    'Connexion reussie.': 'Sign in successful.',
    'Token invalide.': 'Invalid token.',
    'Token expire.': 'Token has expired.',
    'Token d approbation invalide.': 'Invalid approval token.',
    'Utilisateur introuvable.': 'User not found.',
    'Ce compte est deja approuve.': 'This account is already approved.',
    'Compte approuve avec succes.': 'Account approved successfully.',
    'Le mot de passe actuel est obligatoire.': 'Current password is required.',
    'Mot de passe actuel invalide.': 'Current password is incorrect.',
    'L email est obligatoire.': 'Email is required.',
    'Token de reinitialisation invalide.': 'Invalid password reset token.',
    'Token de reinitialisation invalide ou deja utilise.':
      'Invalid or already used password reset token.',
    'Token valide.': 'Token is valid.',
    'Mot de passe reinitialise avec succes.': 'Password reset successfully.',
    'Le nom complet est obligatoire.': 'Full name is required.',
    'Une adresse email valide est obligatoire.': 'A valid email address is required.',
    'Le mot de passe doit contenir au moins 6 caracteres.':
      'Password must contain at least 6 characters.',
    'Email et mot de passe sont obligatoires.': 'Email and password are required.',
    'Identifiant utilisateur invalide.': 'Invalid user identifier.',
    'Un compte existe deja avec cet email.': 'An account already exists with this email.',
    'Email ou mot de passe invalide.': 'Invalid email or password.',
    'Votre compte est en attente d approbation par un administrateur.':
      'Your account is pending administrator approval.',
    'Mot de passe modifie avec succes.': 'Password updated successfully.',
    'Authentication is required.': 'Authentication is required.',
  }

  if (exactTranslations[message]) {
    return exactTranslations[message]
  }

  return message
    .replace(
      /^Le champ newPassword doit contenir au moins 6 caracteres\.$/,
      'The new password must contain at least 6 characters.',
    )
    .replace(
      /^Le champ password doit contenir au moins 6 caracteres\.$/,
      'Password must contain at least 6 characters.',
    )
}

async function request(path, options = {}) {
  const { token, headers, ...fetchOptions } = options
  const requestUrl = buildUrl(path)
  let response

  console.log('[API] Sending request:', {
    method: fetchOptions.method || 'GET',
    url: requestUrl,
    hasToken: !!token,
  })

  try {
    response = await fetch(requestUrl, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    })
  } catch (error) {
    console.error('[API] Network error:', {
      url: requestUrl,
      message: error.message,
    })

    if (error instanceof TypeError) {
      throw new Error(
        `Unable to reach the backend at ${API_BASE_URL}. Please make sure the API server is running.`,
      )
    }

    throw error
  }

  const data = await response.json().catch(() => null)
  const translatedMessage = translateApiMessage(data?.message)

  console.log('[API] Response received:', {
    status: response.status,
    statusText: response.statusText,
    url: requestUrl,
    hasData: !!data,
  })

  if (!response.ok) {
    console.error('[API] HTTP error:', {
      status: response.status,
      statusText: response.statusText,
      message: data?.message,
      url: requestUrl,
    })

    const error = new Error(translatedMessage || 'Request failed.')
    error.statusCode = response.status
    error.responseData = data
    error.requestPath = path
    throw error
  }

  if (data && typeof data === 'object' && translatedMessage) {
    return {
      ...data,
      message: translatedMessage,
    }
  }

  return data
}

function buildQueryString(query = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    searchParams.set(key, String(value))
  })

  const serializedQuery = searchParams.toString()
  return serializedQuery ? `?${serializedQuery}` : ''
}

async function requestWithFallback(paths, options = {}) {
  let lastError = null
  const pathArray = Array.isArray(paths) ? paths : [paths]

  console.log('[API] requestWithFallback - Attempting paths:', pathArray)

  for (const path of pathArray) {
    try {
      console.log(`[API] Trying path: ${path}`)
      const result = await request(path, options)
      console.log(`[API] Success with path: ${path}`)
      return result
    } catch (error) {
      lastError = error
      console.warn(`[API] Failed with path: ${path}`, {
        statusCode: error?.statusCode,
        message: error?.message,
      })

      // If it's not a 404, throw immediately (don't try other paths)
      if (error?.statusCode !== 404) {
        console.error(`[API] Non-404 error, throwing immediately`, {
          statusCode: error?.statusCode,
          message: error?.message,
          path,
        })
        throw error
      }
    }
  }

  console.error('[API] All fallback paths failed. Last error:', {
    statusCode: lastError?.statusCode,
    message: lastError?.message,
    paths: pathArray,
  })

  throw lastError || new Error('Request failed.')
}

export function isRfqCostingSubElementApiEnabled() {
  return RFQC_SUB_ELEMENT_API_ENABLED
}

export function signUp(payload) {
  return request('/users/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function signIn(payload) {
  return request('/users/signin', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function forgotPassword(payload) {
  return request('/users/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function verifyResetPasswordToken(token) {
  return request(`/users/reset-password/${encodeURIComponent(token)}`, {
    method: 'GET',
  })
}

export function resetPassword(token, payload) {
  return request(`/users/reset-password/${encodeURIComponent(token)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function changePassword(userId, payload, token) {
  return request(`/users/${encodeURIComponent(userId)}/change-password`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  })
}

export function getNotifications(token, limit = 20) {
  const queryString = buildQueryString({ limit })

  return request(`/notifications${queryString}`, {
    method: 'GET',
    token,
  })
}

export function markAllNotificationsAsRead(token) {
  return request('/notifications/read-all', {
    method: 'PATCH',
    token,
  })
}

export function getUsers(token) {
  return request('/users', {
    method: 'GET',
    token,
  })
}

export function getRfqs() {
  return request('/rfqs', {
    method: 'GET',
  })
}

export function getRfqCostingSubElementsByCostingIds(costingIds, currentRole) {
  const normalizedCostingIds = Array.from(
    new Set(
      (Array.isArray(costingIds) ? costingIds : [])
        .map((costingId) => String(costingId ?? '').trim())
        .filter(Boolean),
    ),
  )
  const queryString = buildQueryString({
    current_role: currentRole,
    costing_ids: normalizedCostingIds.join(','),
  })

  return requestWithFallback(
    RFQC_SUB_ELEMENT_BASE_PATHS.map((basePath) => `${basePath}/costings${queryString}`),
    {
      method: 'GET',
    },
  )
}

export function createRfqCosting(rfqId, payload) {
  return request(`/rfqs/${encodeURIComponent(rfqId)}/costings`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateRfqCosting(costingId, payload) {
  return request(`/rfq-costing/${encodeURIComponent(costingId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteRfqCosting(costingId) {
  return request(`/rfq-costing/${encodeURIComponent(costingId)}`, {
    method: 'DELETE',
  })
}

export function getInitialSubElementOptions() {
  return request('/rfq-costing-initial-sub-elements/options', {
    method: 'GET',
  })
}

export function getInitialSubElementsByCostingId(costingId) {
  return request(`/rfq-costing-initial-sub-elements/costing/${encodeURIComponent(costingId)}`, {
    method: 'GET',
  })
}

export function getInitialSubElementByKey(costingId, key) {
  return request(`/rfq-costing-initial-sub-elements/costing/${encodeURIComponent(costingId)}/${encodeURIComponent(key)}`, {
    method: 'GET',
  })
}

export function updateInitialSubElement(costingId, key, payload) {
  const url = `/rfq-costing-initial-sub-elements/costing/${encodeURIComponent(costingId)}/${encodeURIComponent(key)}`
  console.log('[api.js] updateInitialSubElement ▶ PATCH', url)
  console.log('[api.js] payload sent:', payload)

  return request(url, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function getRfqCostingSubElementOptions() {
  return requestWithFallback(
    RFQC_SUB_ELEMENT_BASE_PATHS.map((basePath) => `${basePath}/options`),
    {
      method: 'GET',
    },
  )
}

export function getRfqCostingSubElements(costingId, currentRole) {
  const queryString = buildQueryString({ current_role: currentRole })
  const paths = RFQC_SUB_ELEMENT_BASE_PATHS.map(
    (basePath) => `${basePath}/costing/${encodeURIComponent(costingId)}${queryString}`,
  )

  return requestWithFallback(paths, {
    method: 'GET',
  })
}

export function getRfqCostingSubElement(costingId, key, currentRole) {
  const queryString = buildQueryString({ current_role: currentRole })

  return requestWithFallback(
    RFQC_SUB_ELEMENT_BASE_PATHS.map(
      (basePath) =>
        `${basePath}/costing/${encodeURIComponent(costingId)}/${encodeURIComponent(key)}${queryString}`,
    ),
    {
      method: 'GET',
    },
  )
}

export function updateRfqCostingSubElement(costingId, key, payload) {
  return requestWithFallback(
    RFQC_SUB_ELEMENT_BASE_PATHS.map(
      (basePath) =>
        `${basePath}/costing/${encodeURIComponent(costingId)}/${encodeURIComponent(key)}`,
    ),
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
}

export function getRfqCostingSubElementConversation(costingId, key, token) {
  return requestWithFallback(
    RFQC_SUB_ELEMENT_BASE_PATHS.map(
      (basePath) =>
        `${basePath}/costing/${encodeURIComponent(costingId)}/${encodeURIComponent(key)}/conversation`,
    ),
    {
      method: 'GET',
      token,
    },
  )
}

export function createRfqCostingSubElementConversationMessage(costingId, key, payload, token) {
  return requestWithFallback(
    RFQC_SUB_ELEMENT_BASE_PATHS.map(
      (basePath) =>
        `${basePath}/costing/${encodeURIComponent(costingId)}/${encodeURIComponent(key)}/conversation`,
    ),
    {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    },
  )
}

export function getApprovalSubElementByToken(approvalToken) {
  return requestWithFallback(
    RFQC_SUB_ELEMENT_BASE_PATHS.map(
      (basePath) => `${basePath}/approval/${encodeURIComponent(approvalToken)}`,
    ),
    {
      method: 'GET',
    },
  )
}

export function approveSubElementByToken(approvalToken, payload) {
  return requestWithFallback(
    RFQC_SUB_ELEMENT_BASE_PATHS.map(
      (basePath) => `${basePath}/approval/${encodeURIComponent(approvalToken)}`,
    ),
    {
      method: 'PATCH',
      body: JSON.stringify(buildApproveSubElementPayload(payload)),
    },
  )
}
