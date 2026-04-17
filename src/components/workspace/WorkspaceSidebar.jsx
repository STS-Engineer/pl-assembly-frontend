import { RouterLink } from '../router/AppRouter'

function WorkspaceSectionIcon({ sectionId }) {
  if (sectionId === 'dashboard') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5.75 5.75H10.25V10.25H5.75V5.75Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.75 5.75H18.25V8.75H13.75V5.75Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.75 12.25H18.25V18.25H13.75V12.25Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.75 13.75H10.25V18.25H5.75V13.75Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (sectionId === 'costing') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 6.75H17"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M7 11.25H14.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M7 15.75H12"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M5.75 4.75H18.25V19.25H5.75V4.75Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 7.25H17"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M7 11.75H17"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M7 16.25H12.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M5.75 4.75H18.25V19.25H5.75V4.75Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function WorkspaceSidebar({
  sections,
  activeSectionId,
}) {
  return (
    <aside className="workspace-sidebar" aria-label="Workspace navigation">
      <nav className="workspace-sidebar__nav">
        {sections.map((section) => (
          <RouterLink
            key={section.id}
            to={section.path}
            className={`workspace-sidebar__link workspace-sidebar__link--${section.tone}${
              activeSectionId === section.id ? ' workspace-sidebar__link--active' : ''
            }`}
          >
            <span className="workspace-sidebar__link-icon" aria-hidden="true">
              <WorkspaceSectionIcon sectionId={section.id} />
            </span>

            <span className="workspace-sidebar__link-copy">
              <strong>{section.navLabel}</strong>
              <span>{section.navHint}</span>
            </span>
          </RouterLink>
        ))}
      </nav>
    </aside>
  )
}

export { WorkspaceSectionIcon }
