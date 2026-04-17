import { getWorkspaceSection } from '../workspace/workspaceSections'

export default function WorkspaceProductDevelopmentPage() {
  const activeSection = getWorkspaceSection('product-development')

  return (
    <section className={`workspace-panel workspace-panel--${activeSection.tone}`}>
      <span className="workspace-panel__tag">{activeSection.tag}</span>
      <h1>{activeSection.title}</h1>
      <p className="workspace-panel__description">{activeSection.description}</p>

      <div className="workspace-panel__body">
        <div className="workspace-panel__block">
          <strong>Main Actions</strong>

          <ul className="workspace-panel__list">
            {activeSection.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="workspace-panel__block">
          <strong>Workspace Purpose</strong>
          <p>{activeSection.summary}</p>
        </div>
      </div>

      <div className="workspace-panel__body workspace-panel__body--dashboard">
        <div className="workspace-panel__block">
          <strong>Current Focus</strong>
          <p>
            Track product briefs, sample status, and launch preparation in one place while the
            detailed module is being expanded.
          </p>
        </div>

        <div className="workspace-panel__block">
          <strong>Suggested Next Step</strong>
          <p>
            Define the product development fields and workflow states the same way we just started
            structuring the costing workspace.
          </p>
        </div>
      </div>
    </section>
  )
}
