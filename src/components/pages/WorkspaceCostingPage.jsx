import CostingBoardProfessional from '../workspace/CostingBoardProfessional'
import { getWorkspaceSection } from '../workspace/workspaceSections'

export default function WorkspaceCostingPage({ currentUser, workspaceAction = null }) {
  const activeSection = getWorkspaceSection('costing')

  return (
    <section className={`workspace-panel workspace-panel--${activeSection.tone}`}>
      <CostingBoardProfessional currentUser={currentUser} workspaceAction={workspaceAction} />
    </section>
  )
}
