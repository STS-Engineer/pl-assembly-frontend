import { useState } from 'react'
import CostingSubElementCard from './CostingSubElementCard'

function CostingPill({ children, tone = 'neutral' }) {
  return <span className={`costing-simple__pill costing-simple__pill--${tone}`}>{children}</span>
}

function CostingChevron({ expanded }) {
  return (
    <svg
      className={`costing-simple__chevron${expanded ? ' costing-simple__chevron--expanded' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7.5 10.25L12 14.75L16.5 10.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CostingCurrencyBadge({ label, theme = 'neutral' }) {
  return <span className={`costing-simple__currency costing-simple__currency--${theme}`}>{label}</span>
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20H8L18.5 9.5C19.3 8.7 19.3 7.4 18.5 6.6L17.4 5.5C16.6 4.7 15.3 4.7 14.5 5.5L4 16V20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.5L17.5 10.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7H19"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M9 7V5.8C9 5.36 9.36 5 9.8 5H14.2C14.64 5 15 5.36 15 5.8V7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 7L8.2 18.2C8.26 19.05 8.96 19.7 9.81 19.7H14.19C15.04 19.7 15.74 19.05 15.8 18.2L16.5 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 11V16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M14 11V16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function CostingProjectCard({
  project,
  isExpanded,
  projectStageEntries,
  onToggle,
  onOpenStage,
  onEditCosting,
  onDeleteCosting,
  deletingCostingId = '',
  canFillSubElement,
  canAssignPilot,
  canAccessConversation,
  onAssignPilot,
  onFillSubElement,
  onViewSubElement,
  onOpenConversation,
}) {
  const [expandedStages, setExpandedStages] = useState({})

  const toggleSubElements = (stageKey, costingId) => {
    const key = `${stageKey}-${costingId}`
    setExpandedStages((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }
  return (
    <article
      className={`costing-simple__project costing-simple__project--${project.currencyTheme}`}
    >
      <button
        type="button"
        className="costing-simple__project-trigger"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`${project.id}-stages`}
      >
        <div className="costing-simple__project-head">
          <div className="costing-simple__project-main">
            <div className="costing-simple__project-title-row">
              <h3>{project.title}</h3>

              <div className="costing-simple__project-tags">
                <CostingCurrencyBadge
                  label={project.currencyLabel}
                  theme={project.currencyTheme}
                />
                <CostingPill tone={project.statusTone}>{project.status}</CostingPill>
              </div>
            </div>
          </div>

          <CostingChevron expanded={isExpanded} />
        </div>
      </button>

      {isExpanded ? (
        <div className="costing-simple__project-body" id={`${project.id}-stages`}>
          <div className="costing-simple__stage-tabs" aria-label={`${project.title} costing stages`}>
            {project.stages.map((stage) => (
              <button
                key={`${project.id}-${stage.key}`}
                type="button"
                className={`costing-simple__stage-tab costing-simple__stage-tab--${stage.key}`}
                onClick={() => onOpenStage(project, stage)}
              >
                <span className="costing-simple__stage-tab-label">{stage.label}</span>
              </button>
            ))}
          </div>

          {projectStageEntries.length > 0 ? (
            <div className="costing-simple__stage-lines">
              {projectStageEntries.map((entry) => {
                const productFamily =
                  entry.productFamily ?? entry.product_family ?? 'TBD'
                const plant = entry.plant ?? entry.delivery_plant ?? 'Not specified'
                const createdDate =
                  entry.createdDate ?? entry.createdAt ?? entry.created_at ?? 'Not dated'
                const subElements = Array.isArray(entry.subElements) ? entry.subElements : []
                const isStageExpanded = Boolean(expandedStages[`${entry.stageKey}-${entry.id}`])
                const stageDetailsId = `${entry.stageKey}-${entry.id}-steps`
                const isInitialCosting = entry.stageKey === 'initial'
                const isDeleting = String(entry.id) === String(deletingCostingId)

                return (
                  <article
                    key={`${entry.stageKey}-${entry.id}`}
                    className={`costing-simple__stage-line costing-simple__stage-line--${entry.stageKey}`}
                  >
                    <div className="costing-simple__stage-line-top">
                      {subElements.length > 0 ? (
                        <button
                          type="button"
                          className="costing-simple__stage-line-trigger"
                          onClick={() => toggleSubElements(entry.stageKey, entry.id)}
                          aria-expanded={isStageExpanded}
                          aria-controls={stageDetailsId}
                        >
                          <div className="costing-simple__stage-line-main">
                            <strong className="costing-simple__stage-line-title">
                              {entry.stageLabel} {entry.reference}
                            </strong>

                            <p className="costing-simple__stage-line-meta">
                              {`Product family: ${productFamily} | Plant: ${plant} | Created date: ${createdDate}`}
                            </p>
                          </div>
                          <CostingChevron expanded={isStageExpanded} />
                        </button>
                      ) : (
                        <div className="costing-simple__stage-line-main">
                          <strong className="costing-simple__stage-line-title">
                            {entry.stageLabel} {entry.reference}
                          </strong>

                          <p className="costing-simple__stage-line-meta">
                            {`Product family: ${productFamily} | Plant: ${plant} | Created date: ${createdDate}`}
                          </p>
                        </div>
                      )}

                      <div className="costing-simple__stage-line-actions">
                        {isInitialCosting ? (
                          <div className="costing-simple__stage-icon-actions">
                            <button
                              type="button"
                              className="costing-simple__stage-icon-button"
                              onClick={() => onEditCosting(project, entry)}
                              aria-label={`Edit ${entry.stageLabel} ${entry.reference}`}
                              title="Edit costing"
                              disabled={isDeleting}
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              className="costing-simple__stage-icon-button costing-simple__stage-icon-button--danger"
                              onClick={() => onDeleteCosting?.(project, entry)}
                              aria-label={`Delete ${entry.stageLabel} ${entry.reference}`}
                              title="Delete costing"
                              disabled={isDeleting}
                            >
                              <DeleteIcon />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="button button-secondary costing-simple__stage-edit"
                            onClick={() => onEditCosting(project, entry)}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {isStageExpanded && subElements.length > 0 ? (
                      <div className="costing-simple__sub-elements" id={stageDetailsId}>
                        {subElements.map((subElement) => (
                          <CostingSubElementCard
                            key={subElement.key}
                            subElement={subElement}
                            canFill={canFillSubElement?.(subElement) ?? false}
                            canAssignPilot={canAssignPilot?.(subElement) ?? false}
                            canOpenConversation={canAccessConversation?.(subElement) ?? false}
                            onAssignPilot={() => onAssignPilot(project, entry, subElement)}
                            onFill={() => onFillSubElement(project, entry, subElement)}
                            onView={() => onViewSubElement(project, entry, subElement)}
                            onOpenConversation={() => onOpenConversation(project, entry, subElement)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
