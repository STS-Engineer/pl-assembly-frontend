const SESSION_STORAGE_KEY = 'pl-assembly-session'

function isBrowserAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getSession() {
  if (!isBrowserAvailable()) {
    return null
  }

  try {
    const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY)

    if (!rawSession) {
      return null
    }

    return JSON.parse(rawSession)
  } catch {
    return null
  }
}

export function saveSession(session) {
  if (!isBrowserAvailable()) {
    return
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  if (!isBrowserAvailable()) {
    return
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY)
}
