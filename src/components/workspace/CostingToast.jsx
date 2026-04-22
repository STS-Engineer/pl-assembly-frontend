export default function CostingToast({
  feedback,
  feedbackType = 'success',
  onClose,
}) {
  if (!feedback) {
    return null
  }

  return (
    <div
      className={`costing-toast costing-toast--${feedbackType}`}
      role={feedbackType === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className="costing-toast__content">
        <strong>{feedbackType === 'success' ? 'Success' : 'Error'}</strong>
        <p>{feedback}</p>
      </div>
      <button
        type="button"
        className="costing-toast__close"
        aria-label="Close notification"
        onClick={onClose}
      >
        x
      </button>
    </div>
  )
}
