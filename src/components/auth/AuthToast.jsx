export default function AuthToast({
  feedback,
  feedbackType = 'success',
  onClose,
}) {
  if (!feedback) {
    return null
  }

  return (
    <div
      className={`auth-toast auth-toast--${feedbackType}`}
      role={feedbackType === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className="auth-toast__content">
        <strong>{feedbackType === 'success' ? 'Success' : 'Error'}</strong>
        <p>{feedback}</p>
      </div>
      <button
        type="button"
        className="auth-toast__close"
        aria-label="Close notification"
        onClick={onClose}
      >
        x
      </button>
    </div>
  )
}
