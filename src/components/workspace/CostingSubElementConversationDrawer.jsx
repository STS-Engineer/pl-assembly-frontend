import { useEffect, useRef, useState } from 'react'

const MAX_ATTACHMENTS = 4
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024
const MAX_TOTAL_ATTACHMENT_BYTES = 10 * 1024 * 1024

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
  '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋',
  '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
  '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌',
  '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
  '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓',
  '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺',
  '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
  '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏',
  '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦵', '🦶', '👂',
  '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅',
  '👄', '💋', '🩸', '🏻', '🏼', '🏽', '🏾', '🏿',
]

const MESSAGE_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function getTrimmedText(value) {
  return String(value ?? '').trim()
}

function getUniqueUsersFromMessages(items = []) {
  const usersMap = new Map()

  items.forEach((item) => {
    const author = item?.author
    if (!author) return

    const userId = author.id || author.email || author.full_name
    if (!userId) return

    if (!usersMap.has(userId)) {
      usersMap.set(userId, {
        id: userId,
        name: author.full_name || author.name || author.email || `User ${author.id}`,
        email: author.email || '',
        mentionValue: author.full_name || author.name || author.email || `User ${author.id}`,
      })
    }
  })

  return Array.from(usersMap.values())
}

function getMentionDisplayName(user = {}) {
  return (
    getTrimmedText(user?.full_name) ||
    getTrimmedText(user?.fullName) ||
    getTrimmedText(user?.name) ||
    getTrimmedText(user?.email) ||
    `User ${user?.id ?? ''}`
  )
}

function getMentionInsertValue(user = {}) {
  return getMentionDisplayName(user)
}

function getMentionLookupKey(user = {}) {
  const id = getTrimmedText(user?.id)

  if (id) {
    return `id:${id}`
  }

  const email = getTrimmedText(user?.email).toLowerCase()

  if (email) {
    return `email:${email}`
  }

  const fullName = getMentionDisplayName(user).toLowerCase()

  if (fullName) {
    return `name:${fullName}`
  }

  return ''
}

function buildMentionInsertToken(user = {}) {
  const mentionValue = getMentionInsertValue(user)
  return mentionValue ? `@${mentionValue}` : ''
}

function messageContainsMentionToken(message, user = {}) {
  const mentionToken = buildMentionInsertToken(user)

  if (!mentionToken) {
    return false
  }

  return new RegExp(
    `(^|[^\\w])${escapeRegExp(mentionToken)}(?=$|[^\\w])`,
    'i',
  ).test(String(message ?? ''))
}

function serializeMentionUser(user = {}) {
  const fullName = getMentionDisplayName(user)
  const email = getTrimmedText(user?.email)
  const id = getTrimmedText(user?.id)

  return {
    id: id || null,
    full_name: fullName || null,
    email: email || null,
  }
}

function getDisplayNameKey(user = {}) {
  const displayName = getMentionDisplayName(user).toLowerCase()
  return displayName || ''
}

function resolveMentionsFromDraftMessage(
  message,
  mentionableUsers = [],
  selectedMentions = [],
) {
  const normalizedSelectedMentions = Array.isArray(selectedMentions) ? selectedMentions : []
  const normalizedMentionableUsers = Array.isArray(mentionableUsers) ? mentionableUsers : []
  const mentionsByLookupKey = new Map()
  const mentionableUsersByDisplayName = normalizedMentionableUsers.reduce((lookup, user) => {
    const displayNameKey = getDisplayNameKey(user)

    if (!displayNameKey) {
      return lookup
    }

    const currentUsers = lookup.get(displayNameKey) || []
    currentUsers.push(user)
    lookup.set(displayNameKey, currentUsers)
    return lookup
  }, new Map())

  normalizedSelectedMentions.forEach((selectedMention) => {
    if (!messageContainsMentionToken(message, selectedMention)) {
      return
    }

    const mentionLookupKey = getMentionLookupKey(selectedMention)

    if (!mentionLookupKey || mentionsByLookupKey.has(mentionLookupKey)) {
      return
    }

    mentionsByLookupKey.set(mentionLookupKey, serializeMentionUser(selectedMention))
  })

  normalizedMentionableUsers.forEach((mentionableUser) => {
    if (!messageContainsMentionToken(message, mentionableUser)) {
      return
    }

    const displayNameKey = getDisplayNameKey(mentionableUser)
    const usersWithSameDisplayName = mentionableUsersByDisplayName.get(displayNameKey) || []

    if (usersWithSameDisplayName.length !== 1) {
      return
    }

    const mentionLookupKey = getMentionLookupKey(mentionableUser)

    if (!mentionLookupKey || mentionsByLookupKey.has(mentionLookupKey)) {
      return
    }

    mentionsByLookupKey.set(mentionLookupKey, serializeMentionUser(mentionableUser))
  })

  return Array.from(mentionsByLookupKey.values())
}

function getMessageMentionUsers(item = {}, mentionableUsers = []) {
  const storedMentions = Array.isArray(item?.mentions) ? item.mentions : []
  const seenMentionKeys = new Set()
  const messageMentionUsers = []

  storedMentions.forEach((mention) => {
    const mentionKey = getMentionLookupKey(mention)

    if (!mentionKey || seenMentionKeys.has(mentionKey)) {
      return
    }

    seenMentionKeys.add(mentionKey)
    messageMentionUsers.push(mention)
  })

  ;(Array.isArray(mentionableUsers) ? mentionableUsers : []).forEach((mentionableUser) => {
    const mentionKey = getMentionLookupKey(mentionableUser)

    if (!mentionKey || seenMentionKeys.has(mentionKey)) {
      return
    }

    seenMentionKeys.add(mentionKey)
    messageMentionUsers.push(mentionableUser)
  })

  return messageMentionUsers
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function renderMessageBodyWithMentions(message, mentionableUsers = []) {
  const normalizedMessage = String(message ?? '')
  const mentionTokens = Array.from(
    new Set(
      (Array.isArray(mentionableUsers) ? mentionableUsers : [])
        .map((user) => `@${getMentionInsertValue(user)}`)
        .map((token) => token.trim())
        .filter(Boolean),
    ),
  )

  if (!normalizedMessage || mentionTokens.length === 0) {
    return normalizedMessage
  }

  const matcher = new RegExp(
    `(${mentionTokens
      .sort((leftToken, rightToken) => rightToken.length - leftToken.length)
      .map((token) => escapeRegExp(token))
      .join('|')})(?=$|[\\s.,!?;:()[\\]{}])`,
    'gi',
  )
  const parts = []
  let lastIndex = 0
  let match = matcher.exec(normalizedMessage)

  while (match) {
    if (match.index > lastIndex) {
      parts.push(normalizedMessage.slice(lastIndex, match.index))
    }

    parts.push(
      <span
        key={`mention-${match.index}-${match[0]}`}
        className="costing-conversation__mention-token"
      >
        {match[0]}
      </span>,
    )

    lastIndex = match.index + match[0].length
    match = matcher.exec(normalizedMessage)
  }

  if (lastIndex === 0) {
    return normalizedMessage
  }

  if (lastIndex < normalizedMessage.length) {
    parts.push(normalizedMessage.slice(lastIndex))
  }

  return parts
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
        .map((value) => getTrimmedText(value).toLowerCase())
        .filter(Boolean),
    ),
  )
}

function isOwnMessage(item, currentUser) {
  const currentUserLookupValues = getIdentityLookupValues(currentUser)
  const authorLookupValues = getIdentityLookupValues(item?.author)

  if (currentUserLookupValues.length === 0 || authorLookupValues.length === 0) {
    return false
  }

  return currentUserLookupValues.some((lookupValue) => authorLookupValues.includes(lookupValue))
}

function formatMessageDate(value) {
  const normalizedValue = getTrimmedText(value)

  if (!normalizedValue) {
    return 'Just now'
  }

  const parsedDate = new Date(normalizedValue)

  if (Number.isNaN(parsedDate.getTime())) {
    return normalizedValue
  }

  return MESSAGE_DATE_FORMATTER.format(parsedDate)
}

function formatFileSize(value) {
  const bytes = Number.parseInt(String(value ?? 0).trim(), 10)

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  return `${bytes} B`
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error(`Unable to read "${file.name}".`))
    reader.readAsDataURL(file)
  })
}

export default function CostingSubElementConversationDrawer({
  drawer,
  conversation,
  currentUser,
  isLoading = false,
  isSubmitting = false,
  isLoadingMentionableUsers = false,
  mentionableUsersError = '',
  errorMessage = '',
  onRequestClose,
  onReload,
  onSubmit,
  mentionableUsers: propMentionableUsers = null,
}) {
  const [draftMessage, setDraftMessage] = useState('')
  const [selectedMentions, setSelectedMentions] = useState([])
  const [selectedAttachments, setSelectedAttachments] = useState([])
  const [composerError, setComposerError] = useState('')
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [isMentionPickerOpen, setIsMentionPickerOpen] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const mentionPickerRef = useRef(null)
  const selectedMentionsRef = useRef([])

  const metadata = conversation?.conversation || {}
  const items = Array.isArray(conversation?.items) ? conversation.items : []
  const hasContent = getTrimmedText(draftMessage) || selectedAttachments.length > 0
  const mentionableUsers = Array.isArray(propMentionableUsers)
    ? propMentionableUsers
    : getUniqueUsersFromMessages(items)

  const filteredUsers = mentionableUsers.filter((user) => {
    const search = mentionSearch.toLowerCase()
    const displayName = getMentionDisplayName(user).toLowerCase()
    const email = getTrimmedText(user?.email).toLowerCase()
    const mentionValue = getMentionInsertValue(user).toLowerCase()

    return (
      displayName.includes(search) || email.includes(search) || mentionValue.includes(search)
    )
  })

  useEffect(() => {
    if (!drawer) {
      return undefined
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSubmitting) {
        onRequestClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [drawer, isSubmitting, onRequestClose])

  useEffect(() => {
    setDraftMessage('')
    selectedMentionsRef.current = []
    setSelectedMentions([])
    setSelectedAttachments([])
    setComposerError('')
    setIsEmojiPickerOpen(false)
    setIsMentionPickerOpen(false)
    setMentionSearch('')
  }, [drawer?.costingId, drawer?.subElementKey])

  useEffect(() => {
    if (!isEmojiPickerOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setIsEmojiPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isEmojiPickerOpen])

  useEffect(() => {
    if (!isMentionPickerOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (
        mentionPickerRef.current &&
        !mentionPickerRef.current.contains(event.target)
      ) {
        setIsMentionPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isMentionPickerOpen])

  async function handleAttachmentChange(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (files.length === 0) {
      return
    }

    setComposerError('')

    try {
      if (selectedAttachments.length + files.length > MAX_ATTACHMENTS) {
        throw new Error(`You can upload up to ${MAX_ATTACHMENTS} attachments per message.`)
      }

      const nextAttachments = [...selectedAttachments]

      for (const file of files) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          throw new Error(`"${file.name}" is larger than 4 MB.`)
        }

        const dataUrl = await readFileAsDataUrl(file)

        nextAttachments.push({
          id: `${file.name}-${file.lastModified}-${file.size}-${nextAttachments.length}`,
          name: file.name,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
          kind: String(file.type || '').toLowerCase().startsWith('image/') ? 'image' : 'file',
          data_url: dataUrl,
        })
      }

      const totalAttachmentBytes = nextAttachments.reduce(
        (totalSize, attachment) => totalSize + Number(attachment?.size_bytes || 0),
        0,
      )

      if (totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
        throw new Error('Total attachment size must stay below 10 MB.')
      }

      setSelectedAttachments(nextAttachments)
    } catch (error) {
      setComposerError(error.message || 'Unable to add the selected files.')
    }
  }

  function handleAttachmentRemoval(attachmentId) {
    setSelectedAttachments((currentAttachments) =>
      currentAttachments.filter((attachment) => attachment.id !== attachmentId),
    )
  }

  function handleMentionSelection(user) {
    const mentionToken = buildMentionInsertToken(user)

    if (!mentionToken) {
      return
    }

    insertDraftToken(`${mentionToken} `)
    setSelectedMentions((currentMentions) => {
      const mentionKey = getMentionLookupKey(user)

      if (!mentionKey) {
        selectedMentionsRef.current = currentMentions
        return currentMentions
      }

      if (currentMentions.some((mention) => getMentionLookupKey(mention) === mentionKey)) {
        selectedMentionsRef.current = currentMentions
        return currentMentions
      }

      const nextMentions = [...currentMentions, serializeMentionUser(user)]
      selectedMentionsRef.current = nextMentions
      return nextMentions
    })
    setIsMentionPickerOpen(false)
    setMentionSearch('')
  }

  function insertDraftToken(token) {
    const textarea = textareaRef.current
    const normalizedToken = String(token || '')

    if (!normalizedToken) {
      return
    }

    setComposerError('')

    if (!textarea) {
      setDraftMessage((currentDraft) => `${currentDraft}${normalizedToken}`)
      return
    }

    const selectionStart = textarea.selectionStart ?? draftMessage.length
    const selectionEnd = textarea.selectionEnd ?? draftMessage.length
    const nextDraftMessage = [
      draftMessage.slice(0, selectionStart),
      normalizedToken,
      draftMessage.slice(selectionEnd),
    ].join('')

    setDraftMessage(nextDraftMessage)

    window.requestAnimationFrame(() => {
      textarea.focus()
      const nextCursorPosition = selectionStart + normalizedToken.length
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition)
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!hasContent || isSubmitting) {
      return
    }

    setComposerError('')

    try {
      const normalizedMessage = getTrimmedText(textareaRef.current?.value ?? draftMessage)
      const mentions = resolveMentionsFromDraftMessage(
        normalizedMessage,
        mentionableUsers,
        selectedMentionsRef.current,
      )

      await onSubmit?.({
        message: normalizedMessage,
        mentions,
        attachments: selectedAttachments,
      })

      setDraftMessage('')
      selectedMentionsRef.current = []
      setSelectedMentions([])
      setSelectedAttachments([])
    } catch (error) {
      setComposerError(error.message || 'Unable to send the message.')
    }
  }

  if (!drawer) {
    return null
  }

  return (
    <div
      className="costing-conversation"
      role="dialog"
      aria-modal="true"
      aria-label={`Conversation for ${metadata.sub_element_title || drawer.subElementTitle}`}
      onClick={() => {
        if (!isSubmitting) {
          onRequestClose?.()
        }
      }}
    >
      <aside
        className="costing-conversation__panel"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="costing-conversation__header">
          <div className="costing-conversation__copy">
            <span className="costing-conversation__eyebrow">Step conversation</span>
            <h2>{metadata.sub_element_title || drawer.subElementTitle}</h2>
            <p>{metadata.project_display_name || drawer.projectTitle || 'Project'}</p>
          </div>

          <button
            type="button"
            className="costing-conversation__close"
            onClick={onRequestClose}
            disabled={isSubmitting}
            aria-label="Close conversation"
          >
            x
          </button>
        </header>

        <section className="costing-conversation__messages" aria-label="Conversation messages">
          <div className="costing-conversation__section-head">
            <strong>Messages</strong>
            <span>{items.length} message{items.length === 1 ? '' : 's'}</span>
          </div>

          {isLoading ? (
            <div className="costing-conversation__state costing-conversation__state--loading">
              <strong>Loading conversation</strong>
              <p>The latest exchanges for this step are being fetched.</p>
            </div>
          ) : null}

          {!isLoading && errorMessage ? (
            <div className="costing-conversation__state" role="alert">
              <strong>Unable to load the conversation</strong>
              <p>{errorMessage}</p>
              <div className="costing-conversation__state-actions">
                <button type="button" className="button button-secondary" onClick={onReload}>
                  Retry
                </button>
              </div>
            </div>
          ) : null}

          {!isLoading && !errorMessage && items.length === 0 ? (
            <div className="costing-conversation__state">
              <strong>No message yet</strong>
              <p>Start the discussion here to keep the step context in one place.</p>
            </div>
          ) : null}

          {!isLoading && !errorMessage && items.length > 0 ? (
            <div className="costing-conversation__message-list">
              {items.map((item) => {
                const ownMessage = isOwnMessage(item, currentUser)
                const attachments = Array.isArray(item?.attachments) ? item.attachments : []
                const messageMentionUsers = getMessageMentionUsers(item, mentionableUsers)

                return (
                  <article
                    key={item.id}
                    className={`costing-conversation__message${
                      ownMessage ? ' costing-conversation__message--own' : ''
                    }`}
                  >
                    <div className="costing-conversation__message-head">
                      <strong>
                        {item?.author?.full_name ||
                          item?.author?.email ||
                          `User ${item?.author?.id || ''}`}
                      </strong>
                      <span>{formatMessageDate(item?.created_at)}</span>
                    </div>

                    {getTrimmedText(item?.message) ? (
                      <p className="costing-conversation__message-body">
                        {renderMessageBodyWithMentions(item.message, messageMentionUsers)}
                      </p>
                    ) : null}

                    {attachments.length > 0 ? (
                      <div className="costing-conversation__attachment-list">
                        {attachments.map((attachment) => {
                          const attachmentKey = attachment.id || `${item.id}-${attachment.name}`
                          const isImage =
                            String(attachment.kind || '')
                              .toLowerCase()
                              .trim() === 'image'

                          return (
                            <a
                              key={attachmentKey}
                              className={`costing-conversation__attachment${
                                isImage ? ' costing-conversation__attachment--image' : ''
                              }`}
                              href={attachment.data_url}
                              download={attachment.name}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {isImage ? (
                                <img src={attachment.data_url} alt={attachment.name} loading="lazy" />
                              ) : (
                                <div className="costing-conversation__attachment-icon" aria-hidden="true">
                                  <svg viewBox="0 0 24 24" fill="none">
                                    <path
                                      d="M8 7.75C8 5.67893 9.67893 4 11.75 4C13.8211 4 15.5 5.67893 15.5 7.75V13.25C15.5 15.3211 13.8211 17 11.75 17C9.67893 17 8 15.3211 8 13.25V8.5"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M5.5 13V8.25C5.5 4.79822 8.29822 2 11.75 2C15.2018 2 18 4.79822 18 8.25V14C18 17.866 14.866 21 11 21C7.13401 21 4 17.866 4 14V10.5"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </div>
                              )}

                              <span>
                                <strong>{attachment.name}</strong>
                                <small>{formatFileSize(attachment.size_bytes)}</small>
                              </span>
                            </a>
                          )
                        })}
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>

        <form className="costing-conversation__composer" onSubmit={handleSubmit}>
          <div className="costing-conversation__section-head">
            <strong>New message</strong>
            <span>Text, emoji, mention or file</span>
          </div>

          <div className="costing-conversation__composer-shell">
            <input
              ref={fileInputRef}
              className="costing-conversation__upload-input"
              type="file"
              multiple
              onChange={handleAttachmentChange}
              disabled={isSubmitting}
              tabIndex={-1}
            />

            <textarea
              ref={textareaRef}
              className="costing-conversation__textarea"
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              placeholder="Write what the team needs to know for this step..."
              maxLength={2000}
            />

            <div className="costing-conversation__toolbar">
              <div className="costing-conversation__tools">
                <button
                  type="button"
                  className="costing-conversation__tool-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  aria-label="Add file or image"
                  title="Add file or image"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 16.25V7.75"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.75 11L12 7.75L15.25 11"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6 15.75V16.25C6 17.7688 7.23122 19 8.75 19H15.25C16.7688 19 18 17.7688 18 16.25V15.75"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div ref={emojiPickerRef} className="costing-conversation__emoji-picker-container">
                <button
                  type="button"
                  className="costing-conversation__tool-button"
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                  disabled={isSubmitting}
                  aria-label="Insert emoji"
                  title="Insert emoji"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
                    <path
                      d="M9.25 14C9.85 15.1 10.88 15.75 12 15.75C13.12 15.75 14.15 15.1 14.75 14"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.5 10H9.51"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M14.5 10H14.51"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                {isEmojiPickerOpen ? (
                  <div className="costing-conversation__emoji-picker">
                    <div className="costing-conversation__emoji-grid">
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="costing-conversation__emoji-button"
                          onClick={() => {
                            insertDraftToken(emoji + ' ')
                            setIsEmojiPickerOpen(false)
                          }}
                          aria-label={`Insert ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div ref={mentionPickerRef} className="costing-conversation__mention-picker-container">
                <button
                  type="button"
                  className="costing-conversation__tool-button"
                  onClick={() => setIsMentionPickerOpen(!isMentionPickerOpen)}
                  disabled={isSubmitting}
                  aria-label="Mention someone"
                  title="Mention someone"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M16.75 11.75C16.75 14.3734 14.6234 16.5 12 16.5C9.37665 16.5 7.25 14.3734 7.25 11.75C7.25 9.12665 9.37665 7 12 7C14.6234 7 16.75 9.12665 16.75 11.75Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M16.75 10.75V12.25C16.75 13.4926 17.7574 14.5 19 14.5C20.2426 14.5 21.25 13.4926 21.25 12.25V11.75C21.25 6.64137 17.1086 2.5 12 2.5C6.89137 2.5 2.75 6.64137 2.75 11.75C2.75 16.8586 6.89137 21 12 21H15"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {isMentionPickerOpen ? (
                  <div className="costing-conversation__mention-picker">
                    <div className="costing-conversation__mention-search">
                      <input
                        type="text"
                        className="costing-conversation__mention-search-input"
                        placeholder="Search a user..."
                        value={mentionSearch}
                        onChange={(e) => setMentionSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="costing-conversation__mention-list">
                      {isLoadingMentionableUsers ? (
                        <div className="costing-conversation__mention-empty">
                          <span>Loading users...</span>
                        </div>
                      ) : mentionableUsersError ? (
                        <div className="costing-conversation__mention-empty">
                          <span>{mentionableUsersError}</span>
                        </div>
                      ) : filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <button
                            key={user.id || user.email || user.name}
                            type="button"
                            className="costing-conversation__mention-button"
                            onClick={() => handleMentionSelection(user)}
                            aria-label={`Mention ${getMentionDisplayName(user)}`}
                          >
                            <span className="costing-conversation__mention-name">
                              {getMentionDisplayName(user)}
                            </span>
                            {user.email ? (
                              <span className="costing-conversation__mention-email">{user.email}</span>
                            ) : null}
                          </button>
                        ))
                      ) : (
                        <div className="costing-conversation__mention-empty">
                          <span>
                            {mentionSearch.trim()
                              ? 'No users found in the database.'
                              : 'No users available to mention.'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              </div>

              <button
                type="submit"
                className="costing-conversation__send-button"
                disabled={!hasContent || isSubmitting}
                aria-label={isSubmitting ? 'Sending message' : 'Send message'}
                title={isSubmitting ? 'Sending message' : 'Send message'}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4.75 11.75L19.25 4.75L14.25 19.25L11.5 13.5L4.75 11.75Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11.25 13.25L19.25 4.75"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {selectedAttachments.length > 0 ? (
            <div className="costing-conversation__selected-list">
              {selectedAttachments.map((attachment) => (
                <article key={attachment.id} className="costing-conversation__selected-item">
                  <div>
                    <strong>{attachment.name}</strong>
                    <span>{formatFileSize(attachment.size_bytes)}</span>
                  </div>

                  <button
                    type="button"
                    className="costing-conversation__selected-remove"
                    onClick={() => handleAttachmentRemoval(attachment.id)}
                    disabled={isSubmitting}
                    aria-label={`Remove ${attachment.name}`}
                  >
                    x
                  </button>
                </article>
              ))}
            </div>
          ) : null}

          {composerError ? (
            <div className="costing-conversation__feedback costing-conversation__feedback--error" role="alert">
              {composerError}
            </div>
          ) : null}
        </form>
      </aside>
    </div>
  )
}
