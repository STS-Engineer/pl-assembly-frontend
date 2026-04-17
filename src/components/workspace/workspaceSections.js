import { routes } from '../router/routes'

export const workspaceSections = [
  {
    id: 'dashboard',
    tone: 'dashboard',
    path: routes.workspaceDashboard,
    navLabel: 'Dashboard',
    navHint: 'Overview and shortcuts',
    tag: 'Overview',
    title: 'PL Assembly Dashboard',
    description:
      'Start from one clear view, then move into costing or product development when you are ready.',
    highlights: [
      'See the two main workspace streams at a glance',
      'Open the right area in one click',
      'Keep navigation clean as the platform grows',
    ],
    summary:
      'Use the dashboard as your central entry point before moving into a specific workflow.',
  },
  {
    id: 'costing',
    tone: 'costing',
    path: routes.workspaceCosting,
    navLabel: 'Costing',
    navHint: 'Quotations and margins',
    tag: 'Costing',
    title: 'PL Assembly Costing',
    description:
      'This section is dedicated to quotations, pricing analysis, cost breakdowns, and validation steps before approval.',
    highlights: [
      'Prepare and review quotations',
      'Follow costing approvals',
      'Track pricing and margin checks',
    ],
    summary: 'Use this workspace when you need to manage pricing and costing decisions.',
  },
  {
    id: 'product-development',
    tone: 'development',
    path: routes.workspaceProductDevelopment,
    navLabel: 'Product Development',
    navHint: 'Samples and launches',
    tag: 'Product Development',
    title: 'PL Assembly Product Development',
    description:
      'This section is dedicated to product briefs, sample tracking, technical follow-up, and launch preparation.',
    highlights: [
      'Manage briefs and specifications',
      'Track samples and testing',
      'Follow launch preparation',
    ],
    summary:
      'Use this workspace when you need to coordinate development and sample progress.',
  },
]

export function isWorkspaceSectionId(sectionId) {
  return workspaceSections.some((section) => section.id === sectionId)
}

export function getWorkspaceSection(sectionId) {
  return (
    workspaceSections.find((section) => section.id === sectionId) || workspaceSections[0]
  )
}

export function getWorkflowSections() {
  return workspaceSections.filter((section) => section.id !== 'dashboard')
}
