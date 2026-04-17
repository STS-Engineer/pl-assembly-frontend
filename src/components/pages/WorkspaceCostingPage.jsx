import CostingBoardProfessional from '../workspace/CostingBoardProfessional'
import { getWorkspaceSection } from '../workspace/workspaceSections'

export default function WorkspaceCostingPage() {
  const activeSection = getWorkspaceSection('costing')

  return (
    <section className={`workspace-panel workspace-panel--${activeSection.tone}`}>
      <CostingBoardProfessional />
    </section>
  )
}
