import { useState } from 'react'
import './AppShell.css'

function CollapseButton({
  isCollapsed,
  controls,
  collapseLabel,
  expandLabel,
  collapseIcon,
  expandIcon,
  onToggle,
  className = '',
}) {
  const label = isCollapsed ? expandLabel : collapseLabel

  return (
    <button
      type="button"
      className={`app-shell__collapse-button ${className}`.trim()}
      onClick={onToggle}
      aria-expanded={!isCollapsed}
      aria-controls={controls}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">
        {isCollapsed ? expandIcon : collapseIcon}
      </span>
    </button>
  )
}

/**
 * AppShell owns layout-only state. Feature components remain mounted while a
 * region is collapsed, preserving form, tab, simulation, scroll, and map state.
 */
export default function AppShell({
  topBar,
  workspace,
  sidebar,
  bottomPanel,
}) {
  const [isTopPanelCollapsed, setIsTopPanelCollapsed] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(false)

  const rootClassName = [
    'app-shell',
    isTopPanelCollapsed && 'app-shell--top-collapsed',
    isSidebarCollapsed && 'app-shell--sidebar-collapsed',
    isBottomPanelCollapsed && 'app-shell--bottom-collapsed',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClassName}>
      <header className="app-shell__top-bar">
        <div
          id="app-shell-top-controls"
          className="app-shell__top-content"
          aria-hidden={isTopPanelCollapsed}
        >
          {topBar}
        </div>
        <div className="app-shell__top-handle">
          <span>Route controls</span>
          <CollapseButton
            isCollapsed={isTopPanelCollapsed}
            controls="app-shell-top-controls"
            collapseLabel="Collapse route controls"
            expandLabel="Expand route controls"
            collapseIcon={'\u25b2'}
            expandIcon={'\u25bc'}
            onToggle={() => setIsTopPanelCollapsed((value) => !value)}
          />
        </div>
      </header>

      <main className="app-shell__main">
        <section
          className="app-shell__workspace"
          aria-label="Graph simulation workspace"
        >
          {workspace}
        </section>

        <aside
          className="app-shell__sidebar"
          aria-label="Algorithm list"
        >
          <div className="app-shell__sidebar-handle">
            <CollapseButton
              isCollapsed={isSidebarCollapsed}
              controls="app-shell-sidebar-content"
              collapseLabel="Collapse search strategy"
              expandLabel="Expand search strategy"
              collapseIcon={'\u25b6'}
              expandIcon={'\u25c0'}
              onToggle={() => setIsSidebarCollapsed((value) => !value)}
            />
          </div>
          <div
            id="app-shell-sidebar-content"
            className="app-shell__sidebar-content"
            aria-hidden={isSidebarCollapsed}
          >
            {sidebar}
          </div>
        </aside>
      </main>

      <section
        className="app-shell__bottom-panel"
        aria-label="Search trace and route results"
      >
        <div className="app-shell__bottom-handle">
          <span>Search details</span>
          <CollapseButton
            isCollapsed={isBottomPanelCollapsed}
            controls="app-shell-bottom-content"
            collapseLabel="Collapse search details"
            expandLabel="Expand search details"
            collapseIcon={'\u25bc'}
            expandIcon={'\u25b2'}
            onToggle={() => setIsBottomPanelCollapsed((value) => !value)}
          />
        </div>
        <div
          id="app-shell-bottom-content"
          className="app-shell__bottom-content"
          aria-hidden={isBottomPanelCollapsed}
        >
          {bottomPanel}
        </div>
      </section>
    </div>
  )
}
