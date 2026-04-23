import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from '../router/AppRouter'
import { routes } from '../router/routes'
import {
  changePassword,
  getNotifications,
  markAllNotificationsAsRead,
} from '../../services/api'
import { clearSession, getSession } from '../../services/session'
import WorkspaceSidebar from '../workspace/WorkspaceSidebar'
import {
  isWorkspaceSectionId,
  workspaceSections,
} from '../workspace/workspaceSections'
import WorkspaceDashboardPage from './WorkspaceDashboardPage'
import WorkspaceCostingPage from './WorkspaceCostingPage'
import WorkspaceProductDevelopmentPage from './WorkspaceProductDevelopmentPage'
import '../workspace/workspace.css'

const workspacePageComponents = {
  dashboard: WorkspaceDashboardPage,
  costing: WorkspaceCostingPage,
  'product-development': WorkspaceProductDevelopmentPage,
}

function getDisplayName(user = {}) {
  const fullName = String(user.full_name || user.fullName || '').trim()

  if (fullName) {
    return fullName
  }

  return String(user.email || 'Workspace user')
}

function getUserInitials(user = {}) {
  const displayName = getDisplayName(user)
  const nameParts = displayName
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)

  if (nameParts.length === 0) {
    return 'U'
  }

  return nameParts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function AccountActionIcon({ action }) {
  if (action === 'change-password') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M8 10V7.75C8 5.68 9.68 4 11.75 4S15.5 5.68 15.5 7.75V10"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.25 10H16.25C17.22 10 18 10.78 18 11.75V17.25C18 18.22 17.22 19 16.25 19H7.25C6.28 19 5.5 18.22 5.5 17.25V11.75C5.5 10.78 6.28 10 7.25 10Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11.75 13.25V15.75"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.25 7.75L18.5 12L14.25 16.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 12H18.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 5.5H8.25C6.73 5.5 5.5 6.73 5.5 8.25V15.75C5.5 17.27 6.73 18.5 8.25 18.5H10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NotificationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.75 18.25C10.1 19.18 10.96 19.85 12 19.85C13.04 19.85 13.9 19.18 14.25 18.25"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.75 15.25H17.25C17.83 15.25 18.17 14.6 17.84 14.13L16.95 12.84C16.65 12.4 16.49 11.89 16.49 11.36V9.75C16.49 7.26 14.47 5.25 12 5.25C9.53 5.25 7.51 7.26 7.51 9.75V11.36C7.51 11.89 7.35 12.4 7.05 12.84L6.16 14.13C5.83 14.6 6.17 15.25 6.75 15.25Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function decodeAccessTokenSubject(token) {
  try {
    const tokenParts = String(token || '').split('.')

    if (tokenParts.length !== 3) {
      return null
    }

    const payload = JSON.parse(window.atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')))
    const subject = Number(payload?.sub)

    if (!Number.isInteger(subject) || subject <= 0) {
      return null
    }

    return subject
  } catch {
    return null
  }
}

function formatNotificationTime(timestamp) {
  if (!timestamp) {
    return 'Just now'
  }

  const parsedDate = new Date(timestamp)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Just now'
  }

  const now = Date.now()
  const diffInMinutes = Math.round((parsedDate.getTime() - now) / 60000)
  const absoluteDiffInMinutes = Math.abs(diffInMinutes)

  if (absoluteDiffInMinutes < 1) {
    return 'Just now'
  }

  if (absoluteDiffInMinutes < 60) {
    return `${absoluteDiffInMinutes} min ago`
  }

  if (absoluteDiffInMinutes < 60 * 24) {
    return `${Math.round(absoluteDiffInMinutes / 60)} h ago`
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate)
}

function normalizeNotificationItems(items = []) {
  return (Array.isArray(items) ? items : []).map((notification) => ({
    ...notification,
    read: Boolean(notification?.read),
    timeLabel: formatNotificationTime(notification?.created_at),
  }))
}

function normalizeNotificationsResponse(response = null) {
  const normalizedItems = normalizeNotificationItems(
    Array.isArray(response) ? response : response?.items,
  )
  const unreadCount = Number.parseInt(String(response?.unread_count ?? ''), 10)

  return {
    items: normalizedItems,
    unreadCount:
      Number.isInteger(unreadCount) && unreadCount >= 0
        ? unreadCount
        : normalizedItems.filter((notification) => !notification.read).length,
  }
}

function getNotificationActionTarget(actionUrl) {
  const normalizedActionUrl = String(actionUrl || '').trim().toLowerCase()

  if (!normalizedActionUrl) {
    return undefined
  }

  return normalizedActionUrl.startsWith('http') ? '_blank' : undefined
}

function getNotificationInternalAction(notification = {}) {
  const metadata =
    notification?.metadata && typeof notification.metadata === 'object'
      ? notification.metadata
      : {}
  const actionType = String(metadata.action_type || '').trim()

  if (actionType !== 'open-step-conversation') {
    return null
  }

  const costingId = String(metadata.costing_id || '').trim()
  const subElementKey = String(metadata.sub_element_key || '').trim()

  if (!costingId || !subElementKey) {
    return null
  }

  return {
    type: actionType,
    sectionId: String(metadata.section_id || 'costing').trim() || 'costing',
    costingId,
    costingReference: String(metadata.costing_reference || '').trim(),
    stageLabel: String(metadata.stage_label || metadata.costing_type || 'Initial Costing').trim(),
    subElementKey,
    subElementTitle: String(metadata.sub_element_title || '').trim(),
    projectTitle: String(metadata.project_display_name || '').trim(),
  }
}

export default function WorkspacePage({ routeParams = {} }) {
  const [session] = useState(() => getSession())
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false)
  const [workspaceNotifications, setWorkspaceNotifications] = useState([])
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [isNotificationPanelLoading, setIsNotificationPanelLoading] = useState(false)
  const [isMarkingNotificationsAsRead, setIsMarkingNotificationsAsRead] = useState(false)
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false)
  const [isChangePasswordSubmitting, setIsChangePasswordSubmitting] = useState(false)
  const [changePasswordFeedback, setChangePasswordFeedback] = useState('')
  const [changePasswordFeedbackType, setChangePasswordFeedbackType] =
    useState('success')
  const [workspaceFeedback, setWorkspaceFeedback] = useState('')
  const [workspaceFeedbackType, setWorkspaceFeedbackType] = useState('success')
  const [workspaceAction, setWorkspaceAction] = useState(null)
  const { navigate } = useRouter()
  const accountMenuRef = useRef(null)
  const notificationPanelRef = useRef(null)
  const changePasswordFormRef = useRef(null)
  const currentPasswordInputRef = useRef(null)
  const requestedSectionId = String(routeParams.sectionId || '').trim()
  const activeSectionId = isWorkspaceSectionId(requestedSectionId)
    ? requestedSectionId
    : workspaceSections[0].id
  const ActiveWorkspacePage = workspacePageComponents[activeSectionId]

  const loadNotifications = useCallback(async ({ silent = false } = {}) => {
    const currentSession = getSession()

    if (!currentSession?.token) {
      setWorkspaceNotifications([])
      setUnreadNotificationCount(0)
      return
    }

    if (!silent) {
      setIsNotificationPanelLoading(true)
    }

    try {
      const response = await getNotifications(currentSession.token, 20)
      const normalizedResponse = normalizeNotificationsResponse(response)
      setWorkspaceNotifications(normalizedResponse.items)
      setUnreadNotificationCount(normalizedResponse.unreadCount)
    } catch (error) {
      console.error('[WorkspacePage] Unable to load notifications:', error)
    } finally {
      if (!silent) {
        setIsNotificationPanelLoading(false)
      }
    }
  }, [])

  const markNotificationsAsRead = useCallback(async () => {
    const currentSession = getSession()

    if (!currentSession?.token) {
      return
    }

    setIsMarkingNotificationsAsRead(true)
    setUnreadNotificationCount(0)
    setWorkspaceNotifications((currentNotifications) =>
      currentNotifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    )

    try {
      await markAllNotificationsAsRead(currentSession.token)
    } catch (error) {
      console.error('[WorkspacePage] Unable to mark notifications as read:', error)
      await loadNotifications({ silent: true })
    } finally {
      setIsMarkingNotificationsAsRead(false)
    }
  }, [loadNotifications])

  useEffect(() => {
    if (!session?.token) {
      navigate(routes.signIn)
    }
  }, [navigate, session?.token])

  useEffect(() => {
    if (!session?.token) {
      setWorkspaceNotifications([])
      setUnreadNotificationCount(0)
      return undefined
    }

    loadNotifications()

    const intervalId = window.setInterval(() => {
      loadNotifications({ silent: true })
    }, 30000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [loadNotifications, session?.token])

  useEffect(() => {
    if (!session?.token) {
      return undefined
    }

    function refreshNotificationsOnVisibility() {
      if (document.visibilityState === 'visible') {
        loadNotifications({ silent: true })
      }
    }

    function refreshNotificationsOnFocus() {
      loadNotifications({ silent: true })
    }

    document.addEventListener('visibilitychange', refreshNotificationsOnVisibility)
    window.addEventListener('focus', refreshNotificationsOnFocus)

    return () => {
      document.removeEventListener('visibilitychange', refreshNotificationsOnVisibility)
      window.removeEventListener('focus', refreshNotificationsOnFocus)
    }
  }, [loadNotifications, session?.token])

  useEffect(() => {
    if (!session?.token) {
      return
    }

    if (!requestedSectionId || !isWorkspaceSectionId(requestedSectionId)) {
      navigate(routes.workspaceDashboard)
    }
  }, [navigate, requestedSectionId, session?.token])

  useEffect(() => {
    function handlePointerDown(event) {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false)
      }

      if (!notificationPanelRef.current?.contains(event.target)) {
        setIsNotificationPanelOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    if (!workspaceFeedback) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setWorkspaceFeedback('')
    }, 6000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [workspaceFeedback])

  useEffect(() => {
    if (!isChangePasswordModalOpen) {
      return undefined
    }

    const previousBodyOverflow = document.body.style.overflow
    const focusTimeoutId = window.setTimeout(() => {
      currentPasswordInputRef.current?.focus()
    }, 0)

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isChangePasswordSubmitting) {
        setIsChangePasswordModalOpen(false)
        setChangePasswordFeedback('')
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimeoutId)
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isChangePasswordModalOpen, isChangePasswordSubmitting])

  useEffect(() => {
    setIsAccountMenuOpen(false)
    setIsNotificationPanelOpen(false)
  }, [activeSectionId])

  useEffect(() => {
    if (!isNotificationPanelOpen) {
      return undefined
    }

    if (workspaceNotifications.every((notification) => notification.read)) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      markNotificationsAsRead()
    }, 700)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isNotificationPanelOpen, markNotificationsAsRead, workspaceNotifications])

  if (!session?.token) {
    return null
  }

  const user = session.user || {}
  const displayName = getDisplayName(user)
  const userInitials = getUserInitials(user)
  const userEmail = String(user.email || 'No email')
  const userRole = String(user.role || 'Connected user')
  const currentUserId =
    Number.isInteger(Number(user.id)) && Number(user.id) > 0
      ? Number(user.id)
      : decodeAccessTokenSubject(session.token)
  const hasNotifications = workspaceNotifications.length > 0
  const isNotificationPanelShowingLoadingState =
    isNotificationPanelLoading && !hasNotifications
  const notificationPanelStatusLabel = isNotificationPanelShowingLoadingState
    ? 'Loading notifications'
    : unreadNotificationCount > 0
    ? `${unreadNotificationCount} unread`
    : hasNotifications
    ? 'Recent notifications'
    : 'No notifications yet'

  const handleSignOut = () => {
    setIsAccountMenuOpen(false)
    clearSession()
    navigate(routes.signIn)
  }

  const handleOpenChangePasswordModal = () => {
    setIsAccountMenuOpen(false)
    setIsNotificationPanelOpen(false)
    setChangePasswordFeedback('')
    setChangePasswordFeedbackType('success')
    changePasswordFormRef.current?.reset()
    setIsChangePasswordModalOpen(true)
  }

  const handleNotificationAction = (notification) => {
    const internalAction = getNotificationInternalAction(notification)

    if (!internalAction) {
      return
    }

    setIsAccountMenuOpen(false)
    setIsNotificationPanelOpen(false)
    setWorkspaceAction({
      ...internalAction,
      requestId: `${Date.now()}-${notification?.id || 'notification'}`,
    })
    navigate(routes.getWorkspaceSection(internalAction.sectionId))
  }

  const handleCloseChangePasswordModal = () => {
    if (isChangePasswordSubmitting) {
      return
    }

    setIsChangePasswordModalOpen(false)
    setChangePasswordFeedback('')
    setChangePasswordFeedbackType('success')
    changePasswordFormRef.current?.reset()
  }

  const handleChangePasswordSubmit = async (event) => {
    event.preventDefault()
    setChangePasswordFeedback('')

    if (!currentUserId) {
      setChangePasswordFeedbackType('error')
      setChangePasswordFeedback(
        'Unable to identify the current user. Please sign in again and retry.',
      )
      return
    }

    const form = event.currentTarget
    const formData = new FormData(form)
    const currentPassword = String(formData.get('current-password') || '')
    const newPassword = String(formData.get('new-password') || '')
    const confirmPassword = String(formData.get('confirm-password') || '')

    if (newPassword !== confirmPassword) {
      setChangePasswordFeedbackType('error')
      setChangePasswordFeedback('The new password confirmation does not match.')
      return
    }

    if (newPassword.length < 6) {
      setChangePasswordFeedbackType('error')
      setChangePasswordFeedback('Your new password must contain at least 6 characters.')
      return
    }

    if (currentPassword === newPassword) {
      setChangePasswordFeedbackType('error')
      setChangePasswordFeedback('Please choose a different password from the current one.')
      return
    }

    try {
      setIsChangePasswordSubmitting(true)

      const response = await changePassword(
        currentUserId,
        {
          currentPassword,
          newPassword,
        },
        session.token,
      )

      form.reset()
      setIsChangePasswordModalOpen(false)
      setChangePasswordFeedback('')
      setWorkspaceFeedbackType('success')
      setWorkspaceFeedback(
        response.message || 'Your password has been updated successfully.',
      )
    } catch (error) {
      setChangePasswordFeedbackType('error')
      setChangePasswordFeedback(error.message || 'Something went wrong.')
    } finally {
      setIsChangePasswordSubmitting(false)
    }
  }

  return (
    <main className="workspace-page">
      {workspaceFeedback ? (
        <div
          className={`workspace-toast workspace-toast--${workspaceFeedbackType}`}
          role={workspaceFeedbackType === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          <div className="workspace-toast__content">
            <strong>{workspaceFeedbackType === 'success' ? 'Success' : 'Error'}</strong>
            <p>{workspaceFeedback}</p>
          </div>
          <button
            type="button"
            className="workspace-toast__close"
            aria-label="Close notification"
            onClick={() => setWorkspaceFeedback('')}
          >
            x
          </button>
        </div>
      ) : null}

      <div className="workspace-page__accent workspace-page__accent--blue" aria-hidden="true" />
      <div className="workspace-page__accent workspace-page__accent--orange" aria-hidden="true" />

      <header className="workspace-navbar">
        <div className="workspace-navbar__inner">
          <div className="workspace-brand">
            <div className="workspace-brand__logo">
              <img src="/img/logo-avocarbon-1.png" alt="AVO Carbon" />
            </div>

            <div className="workspace-brand__copy">
              <strong>PL Assembly</strong>
              <span>Costing and Product Development</span>
            </div>
          </div>

          <div className="workspace-navbar__actions">
            <div className="workspace-notification-menu" ref={notificationPanelRef}>
              <button
                type="button"
                className={`workspace-notification-button${
                  isNotificationPanelOpen ? ' workspace-notification-button--open' : ''
                }`}
                aria-label="Open notifications"
                aria-haspopup="dialog"
                aria-expanded={isNotificationPanelOpen}
                title="Notifications"
                onClick={() => {
                  const nextPanelState = !isNotificationPanelOpen
                  setIsAccountMenuOpen(false)
                  setIsNotificationPanelOpen(nextPanelState)

                  if (nextPanelState) {
                    loadNotifications({ silent: true })
                  }
                }}
              >
                <span className="workspace-notification-button__icon">
                  <NotificationIcon />
                </span>
                {unreadNotificationCount > 0 ? (
                  <span className="workspace-notification-button__badge" aria-hidden="true" />
                ) : null}
              </button>

              {isNotificationPanelOpen ? (
                <div
                  className="workspace-notification-panel"
                  role="dialog"
                  aria-label="Notifications"
                  aria-busy={isNotificationPanelShowingLoadingState}
                >
                  <div className="workspace-notification-panel__header">
                    <div className="workspace-notification-panel__copy">
                      <strong>Notifications</strong>
                      <span>{notificationPanelStatusLabel}</span>
                    </div>
                  </div>

                  <div className="workspace-notification-panel__content">
                    {isNotificationPanelShowingLoadingState ? (
                      <div className="workspace-notification-panel__state workspace-notification-panel__state--loading">
                        <strong>Loading notifications</strong>
                        <p>Please wait while your latest notifications are fetched.</p>
                      </div>
                    ) : hasNotifications ? (
                      <div className="workspace-notification-panel__list">
                        {workspaceNotifications.map((notification) => (
                          <article
                            key={notification.id}
                            className={`workspace-notification-card${
                              notification.read ? '' : ' workspace-notification-card--unread'
                            }`}
                          >
                            <strong>{notification.title}</strong>
                            <p>{notification.message}</p>
                            <div className="workspace-notification-card__footer">
                              <span>
                                {isMarkingNotificationsAsRead && !notification.read
                                  ? 'Marking as read...'
                                  : notification.timeLabel}
                              </span>
                              {getNotificationInternalAction(notification) ? (
                                <button
                                  type="button"
                                  className="workspace-notification-card__action"
                                  onClick={() => handleNotificationAction(notification)}
                                >
                                  {notification.action_label || 'Open'}
                                </button>
                              ) : notification.action_url ? (
                                <a
                                  className="workspace-notification-card__action"
                                  href={notification.action_url}
                                  target={getNotificationActionTarget(notification.action_url)}
                                  rel="noreferrer"
                                >
                                  {notification.action_label || 'Open'}
                                </a>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="workspace-notification-panel__state workspace-notification-panel__state--empty">
                        <strong>No notifications yet</strong>
                        <p>Your email-triggered notifications will appear here.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="workspace-account-menu" ref={accountMenuRef}>
              <button
                type="button"
                className={`workspace-account-trigger${
                  isAccountMenuOpen ? ' workspace-account-trigger--open' : ''
                }`}
                onClick={() => {
                  setIsNotificationPanelOpen(false)
                  setIsAccountMenuOpen((currentValue) => !currentValue)
                }}
                aria-haspopup="menu"
                aria-expanded={isAccountMenuOpen}
              >
                <div className="workspace-account-trigger__avatar" aria-hidden="true">
                  {userInitials}
                </div>

                <div className="workspace-account-trigger__meta">
                  <strong>{displayName}</strong>
                  <span>{userEmail}</span>
                </div>

                <span className="workspace-account-trigger__role">{userRole}</span>
              </button>

              {isAccountMenuOpen ? (
                <div className="workspace-account-dropdown" role="menu">
                  <button
                    type="button"
                    className="workspace-account-dropdown__action"
                    onClick={handleOpenChangePasswordModal}
                  >
                    <span
                      className="workspace-account-dropdown__icon"
                      aria-hidden="true"
                    >
                      <AccountActionIcon action="change-password" />
                    </span>
                    <span>Change password</span>
                  </button>

                  <button
                    type="button"
                    className="workspace-account-dropdown__action workspace-account-dropdown__action--signout"
                    onClick={handleSignOut}
                  >
                    <span
                      className="workspace-account-dropdown__icon"
                      aria-hidden="true"
                    >
                      <AccountActionIcon action="sign-out" />
                    </span>
                    <span>Sign out</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="workspace-page__shell">
        <div className="workspace-layout">
          <WorkspaceSidebar sections={workspaceSections} activeSectionId={activeSectionId} />

          <div className="workspace-content">
            <div className="workspace-content__inner">
              <ActiveWorkspacePage
                currentUser={user}
                workspaceAction={activeSectionId === 'costing' ? workspaceAction : null}
              />
            </div>
          </div>
        </div>
      </div>

      {isChangePasswordModalOpen ? (
        <div
          className="workspace-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseChangePasswordModal()
            }
          }}
        >
          <section
            className="workspace-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-change-password-title"
          >
            <div className="workspace-modal__header">
              <span className="eyebrow">Account security</span>
              <button
                type="button"
                className="workspace-modal__close"
                aria-label="Close change password dialog"
                onClick={handleCloseChangePasswordModal}
                disabled={isChangePasswordSubmitting}
              >
                x
              </button>
            </div>

            <div className="workspace-modal__copy">
              <h2 id="workspace-change-password-title">Change password</h2>
              <p>Update your password without leaving the workspace.</p>
            </div>

            <form
              ref={changePasswordFormRef}
              className="workspace-modal__form"
              onSubmit={handleChangePasswordSubmit}
            >
              <div className="workspace-modal__grid">
                <label className="workspace-modal__field" htmlFor="current-password">
                  <span>Current password</span>
                  <input
                    ref={currentPasswordInputRef}
                    id="current-password"
                    name="current-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    disabled={isChangePasswordSubmitting}
                  />
                </label>

                <label className="workspace-modal__field" htmlFor="new-password">
                  <span>New password</span>
                  <input
                    id="new-password"
                    name="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    disabled={isChangePasswordSubmitting}
                  />
                </label>

                <label className="workspace-modal__field" htmlFor="confirm-password">
                  <span>Confirm new password</span>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    disabled={isChangePasswordSubmitting}
                  />
                </label>
              </div>

              {changePasswordFeedback ? (
                <p
                  className={`workspace-modal__feedback workspace-modal__feedback--${changePasswordFeedbackType}`}
                >
                  {changePasswordFeedback}
                </p>
              ) : null}

              <p className="workspace-modal__hint">
                Your new password must contain at least 6 characters.
              </p>

              <div className="workspace-modal__actions">
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={handleCloseChangePasswordModal}
                  disabled={isChangePasswordSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isChangePasswordSubmitting}
                >
                  {isChangePasswordSubmitting
                    ? 'Updating password...'
                    : 'Update password'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}
