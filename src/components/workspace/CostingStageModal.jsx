import { memo, useEffect } from 'react'

const PRODUCT_FAMILY_OPTIONS = [
  'Brush Holder',
  'Slip Ring',
  'Insert Molding',
  'Wire Harness',
  'Antenna',
  'Simple Injection',
  'Other',
  'TBD',
  'Assy Electronics',
]

const PLANT_OPTIONS = [
  'Monterry',
  'Amiens',
  'Chennai',
  'Daegu',
  'ElFahs',
  'Frankfurt',
  'Poitiers',
  'Tianjin',
]

export function createEmptyCostingForm(values = {}) {
  return {
    reference: '',
    productFamily: 'TBD',
    plant: '',
    ...values,
  }
}

const CostingStageModal = memo(function CostingStageModal({
  modal,
  form,
  errorMessage,
  isSubmitting,
  onRequestClose,
  onSubmit,
  onFieldChange,
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

  const isEditMode = modal.mode === 'edit'
  const modalEyebrow = isEditMode ? 'Edit costing' : 'Add costing'
  const modalTitle = isEditMode ? `Edit ${modal.stageLabel}` : modal.stageLabel
  const submitLabel = isSubmitting ? 'Saving...' : isEditMode ? 'Save changes' : 'Add costing'

  return (
    <div className="workspace-modal-backdrop" role="presentation" onClick={onRequestClose}>
      <div
        className="workspace-modal costing-simple__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="costing-stage-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="workspace-modal__header">
          <span className="eyebrow">{modalEyebrow}</span>
          <button
            type="button"
            className="workspace-modal__close"
            aria-label="Close costing stage dialog"
            onClick={onRequestClose}
            disabled={isSubmitting}
          >
            x
          </button>
        </div>

        <div className="workspace-modal__copy">
          <h2 id="costing-stage-modal-title">{modalTitle}</h2>
          <p>{modal.projectTitle}</p>
        </div>

        <form className="workspace-modal__form" onSubmit={onSubmit}>
          <div className="workspace-modal__grid">
            <label className="workspace-modal__field">
              <span>RFQ reference</span>
              <div className="workspace-modal__value">{modal.elementReference}</div>
            </label>

            <label className="workspace-modal__field" htmlFor="costing-reference">
              <span>Costing reference</span>
              <input
                id="costing-reference"
                type="text"
                value={form.reference}
                onChange={(event) => onFieldChange('reference', event.target.value)}
                placeholder="Enter the costing reference"
                required
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="costing-product-family">
              <span>Product family</span>
              <select
                id="costing-product-family"
                value={form.productFamily}
                onChange={(event) => onFieldChange('productFamily', event.target.value)}
                disabled={isSubmitting}
              >
                {PRODUCT_FAMILY_OPTIONS.map((productFamily) => (
                  <option key={productFamily} value={productFamily}>
                    {productFamily}
                  </option>
                ))}
              </select>
            </label>

            <label className="workspace-modal__field" htmlFor="costing-plant">
              <span>Manufacturing plant</span>
              <select
                id="costing-plant"
                value={form.plant}
                onChange={(event) => onFieldChange('plant', event.target.value)}
                required
                disabled={isSubmitting}
              >
                <option value="">Select a plant</option>
                {PLANT_OPTIONS.map((plant) => (
                  <option key={plant} value={plant}>
                    {plant}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {errorMessage ? (
            <div className="workspace-modal__feedback workspace-modal__feedback--error">
              {errorMessage}
            </div>
          ) : null}

          <div className="workspace-modal__actions">
            <button
              type="button"
              className="button button-ghost"
              onClick={onRequestClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="button button-primary" disabled={isSubmitting}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
})

export default CostingStageModal
