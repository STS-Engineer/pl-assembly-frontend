import { useEffect, useState } from 'react'

function getSearchValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

export default function CostingPilotAssignmentModal({
  modal,
  pilotOptions = [],
  selectedPilotValue = '',
  isLoading = false,
  isSubmitting = false,
  errorMessage = '',
  onRequestClose,
  onPilotChange,
  onSubmit,
}) {
  const [searchValue, setSearchValue] = useState('')

  useEffect(() => {
    if (!modal) {
      return
    }

    setSearchValue('')
  }, [modal])

  if (!modal) {
    return null
  }

  const normalizedSearchValue = getSearchValue(searchValue)
  const filteredPilotOptions = pilotOptions.filter((pilotOption) => {
    if (!normalizedSearchValue) {
      return true
    }

    return [
      pilotOption.fullName,
      pilotOption.email,
      pilotOption.label,
    ].some((value) => getSearchValue(value).includes(normalizedSearchValue))
  })
  const selectedPilot =
    pilotOptions.find((pilotOption) => pilotOption.selectionValue === selectedPilotValue) || null

  return (
    <div className="workspace-modal-backdrop" role="presentation" onClick={onRequestClose}>
      <div
        className="workspace-modal costing-simple__modal costing-simple__modal--sub-element costing-simple__modal--pilot-assignment"
        role="dialog"
        aria-modal="true"
        aria-labelledby="costing-pilot-assignment-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="workspace-modal__header">
          <span className="eyebrow">Pilot assignment</span>
          <button
            type="button"
            className="workspace-modal__close"
            aria-label="Close pilot assignment dialog"
            onClick={onRequestClose}
            disabled={isSubmitting}
          >
            x
          </button>
        </div>

        <div className="workspace-modal__copy">
          <h2 id="costing-pilot-assignment-title">{modal.subElementTitle}</h2>
          <p>{`${modal.stageLabel} ${modal.costingReference}`}</p>
        </div>

        <form className="workspace-modal__form" onSubmit={onSubmit}>
          <div className="workspace-modal__grid">
            <label className="workspace-modal__field">
              <span>Current pilot</span>
              <div className="workspace-modal__value">{modal.currentPilot || 'Not assigned'}</div>
            </label>

            <label className="workspace-modal__field">
              <span>Manager</span>
              <div className="workspace-modal__value">{modal.managerName || 'Not assigned'}</div>
            </label>
          </div>

          <div className="workspace-modal__field">
            <span>Search pilot</span>
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by name or email"
              disabled={isLoading || isSubmitting || pilotOptions.length === 0}
            />
          </div>

          <div className="costing-simple__pilot-selected">
            <span>Selected pilot</span>
            <strong>{selectedPilot?.fullName || selectedPilot?.email || 'No pilot selected'}</strong>
          </div>

          <div className="costing-simple__pilot-picker">
            <div className="costing-simple__pilot-picker-list" role="listbox" aria-label="Pilot list">
              {isLoading ? (
                <div className="costing-simple__pilot-picker-empty">
                  Loading users...
                </div>
              ) : null}

              {!isLoading && pilotOptions.length === 0 ? (
                <div className="costing-simple__pilot-picker-empty">
                  No user available.
                </div>
              ) : null}

              {!isLoading && pilotOptions.length > 0 && filteredPilotOptions.length === 0 ? (
                <div className="costing-simple__pilot-picker-empty">
                  No user matches your search.
                </div>
              ) : null}

              {!isLoading && filteredPilotOptions.length > 0
                ? filteredPilotOptions.map((pilotOption) => {
                    const isSelected = pilotOption.selectionValue === selectedPilotValue

                    return (
                      <button
                        key={pilotOption.selectionValue}
                        type="button"
                        className={`costing-simple__pilot-option${
                          isSelected ? ' costing-simple__pilot-option--selected' : ''
                        }`}
                        onClick={() => onPilotChange(pilotOption.selectionValue)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <strong>
                          {pilotOption.fullName || pilotOption.email || pilotOption.selectionValue}
                        </strong>
                      </button>
                    )
                  })
                : null}
            </div>
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

            <button
              type="submit"
              className="button button-primary"
              disabled={isLoading || isSubmitting || !selectedPilotValue || pilotOptions.length === 0}
            >
              {isSubmitting ? 'Assigning...' : 'Assign pilot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
