import { useEffect } from 'react'

export default function CostingDeleteConfirmationModal({
  modal,
  isSubmitting = false,
  onRequestClose,
  onSubmit,
}) {
  useEffect(() => {
    if (!modal) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onRequestClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [modal, onRequestClose])

  if (!modal) {
    return null
  }

  return (
    <div className="workspace-modal-backdrop" role="presentation" onClick={onRequestClose}>
      <div
        className="workspace-modal costing-simple__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="costing-delete-confirmation-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="workspace-modal__header">
          <span className="eyebrow">Delete costing</span>
          <button
            type="button"
            className="workspace-modal__close"
            aria-label="Close delete confirmation dialog"
            onClick={onRequestClose}
            disabled={isSubmitting}
          >
            x
          </button>
        </div>

        <div className="workspace-modal__copy">
          <h2 id="costing-delete-confirmation-title">Delete this costing?</h2>
          <p>
            {`${modal.stageLabel || 'Costing'} ${modal.reference || ''}`.trim()}
          </p>
          <p>{modal.projectTitle || 'This action cannot be undone.'}</p>
        </div>

        <div className="workspace-modal__feedback workspace-modal__feedback--error">
          This action permanently deletes the selected costing entry.
        </div>

        <div className="workspace-modal__actions">
          <button
            type="button"
            className="button button-ghost"
            onClick={onRequestClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
