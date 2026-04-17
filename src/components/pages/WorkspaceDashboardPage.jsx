import { RouterLink } from '../router/AppRouter'
import { WorkspaceSectionIcon } from '../workspace/WorkspaceSidebar'
import {
  getWorkflowSections,
  getWorkspaceSection,
} from '../workspace/workspaceSections'

export default function WorkspaceDashboardPage() {
  const activeSection = getWorkspaceSection('dashboard')
  const workflowSections = getWorkflowSections()

  return (
    <section className={`workspace-panel workspace-panel--${activeSection.tone}`}>
      <span className="workspace-panel__tag">{activeSection.tag}</span>
      <h1>{activeSection.title}</h1>
      <p className="workspace-panel__description">{activeSection.description}</p>

      <div className="workspace-panel__body workspace-panel__body--dashboard">
        <div className="workspace-panel__block">
          <strong>What You Can Do Here</strong>

          <ul className="workspace-panel__list">
            {activeSection.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="workspace-panel__block">
          <strong>Dashboard Purpose</strong>
          <p>{activeSection.summary}</p>
        </div>
      </div>

      <div className="workspace-overview-grid">
        {workflowSections.map((section) => (
          <article
            key={section.id}
            className={`workspace-overview-card workspace-overview-card--${section.tone}`}
          >
            <div className="workspace-overview-card__header">
              <span className="workspace-overview-card__tag">{section.tag}</span>
              <span className="workspace-overview-card__icon" aria-hidden="true">
                <WorkspaceSectionIcon sectionId={section.id} />
              </span>
            </div>

            <h2>{section.title}</h2>
            <p>{section.summary}</p>

            <RouterLink to={section.path} className="workspace-overview-card__action">
              Open workspace
            </RouterLink>
          </article>
        ))}
      </div>
    </section>
  )
}
