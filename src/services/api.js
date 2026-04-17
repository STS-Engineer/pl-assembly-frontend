const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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
    if (error instanceof TypeError) {
      throw new Error(
        `Unable to reach the backend at ${API_BASE_URL}. Please make sure the API server is running.`,
      )
    }

    throw error
  }

  const data = await response.json().catch(() => null)
  const translatedMessage = translateApiMessage(data?.message)

  if (!response.ok) {
    throw new Error(translatedMessage || 'Request failed.')
  }

  if (data && typeof data === 'object' && translatedMessage) {
    return {
      ...data,
      message: translatedMessage,
    }
  }

  return data
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

export function getRfqs() {
  return request('/rfqs', {
    method: 'GET',
  })
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
