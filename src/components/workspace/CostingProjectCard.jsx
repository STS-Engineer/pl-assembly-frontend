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

export default function CostingProjectCard({
  project,
  isExpanded,
  projectStageEntries,
  onToggle,
  onOpenStage,
  onEditCosting,
  canFillSubElement,
  canAssignPilot,
  onAssignPilot,
  onFillSubElement,
  onViewSubElement,
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

        <div className="costing-simple__project-actions">
          <button
            type="button"
            className="costing-simple__toggle"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={`${project.id}-stages`}
          >
            <span>{isExpanded ? 'Hide stages' : 'Show stages'}</span>
            <CostingChevron expanded={isExpanded} />
          </button>
        </div>
      </div>

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

                return (
                  <article
                    key={`${entry.stageKey}-${entry.id}`}
                    className={`costing-simple__stage-line costing-simple__stage-line--${entry.stageKey}`}
                  >
                    <div className="costing-simple__stage-line-top">
                      <div className="costing-simple__stage-line-main">
                        <strong className="costing-simple__stage-line-title">
                          {entry.stageLabel} {entry.reference}
                        </strong>

                        <p className="costing-simple__stage-line-meta">
                          {`Product family: ${productFamily} | Plant: ${plant} | Created date: ${createdDate}`}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {subElements.length > 0 ? (
                          <button
                            type="button"
                            className="button button-secondary costing-simple__stage-edit"
                            onClick={() => toggleSubElements(entry.stageKey, entry.id)}
                          >
                            {expandedStages[`${entry.stageKey}-${entry.id}`]
                              ? `Hide ${subElements.length} Steps`
                              : `Show ${subElements.length} Steps`}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="button button-secondary costing-simple__stage-edit"
                          onClick={() => onEditCosting(project, entry)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    {expandedStages[`${entry.stageKey}-${entry.id}`] && subElements.length > 0 ? (
                      <div className="costing-simple__sub-elements">
                        {subElements.map((subElement) => (
                          <CostingSubElementCard
                            key={subElement.key}
                            subElement={subElement}
                            canFill={canFillSubElement?.(subElement) ?? false}
                            canAssignPilot={canAssignPilot?.(subElement) ?? false}
                            onAssignPilot={() => onAssignPilot(project, entry, subElement)}
                            onFill={() => onFillSubElement(project, entry, subElement)}
                            onView={() => onViewSubElement(project, entry, subElement)}
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
