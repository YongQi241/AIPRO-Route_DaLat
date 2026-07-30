import './AppShell.css'

/**
 * AppShell owns layout only. Feature components are passed through slots so
 * data flow remains in the Zustand store instead of being coupled to layout.
 */
export default function AppShell({
  topBar,
  workspace,
  sidebar,
  bottomPanel,
}) {
  return (
    <div className="app-shell">
      <header className="app-shell__top-bar">{topBar}</header>

      <main className="app-shell__main">
        <section
          className="app-shell__workspace"
          aria-label="Không gian mô phỏng đồ thị"
        >
          {workspace}
        </section>

        <aside
          className="app-shell__sidebar"
          aria-label="Danh sách thuật toán"
        >
          {sidebar}
        </aside>
      </main>

      <section
        className="app-shell__bottom-panel"
        aria-label="Nhật ký và kết quả"
      >
        {bottomPanel}
      </section>
    </div>
  )
}
