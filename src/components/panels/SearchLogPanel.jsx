import { useEffect, useMemo, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import './SearchLogPanel.css'

function createSearchLogs(result) {
  const frontierSteps = result?.frontier_steps ?? []

  if (frontierSteps.length > 0) {
    return frontierSteps.map((frame, index) => ({
      step: index + 1,
      current: frame.current ?? '—',
      frontier: frame.frontier ?? [],
      visitedCount: (frame.visited ?? []).length,
    }))
  }

  return (result?.visited_order ?? []).map((nodeId, index) => ({
    step: index + 1,
    current: nodeId,
    frontier: [],
    visitedCount: index + 1,
  }))
}

export default function SearchLogPanel({ className = '' }) {
  const result = useAppStore((state) => state.routeResult)
  const currentStep = useAppStore((state) => state.simulation.currentStep)
  const activeLogRef = useRef(null)

  const logs = useMemo(() => createSearchLogs(result), [result])
  const visibleLogs = logs.slice(0, Math.min(currentStep + 1, logs.length))

  useEffect(() => {
    activeLogRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [currentStep])

  const rootClassName = ['search-log-panel', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={rootClassName} aria-labelledby="search-log-title">
      <header className="search-log-panel__header">
        <div>
          <span>Algorithm trace</span>
          <h2 id="search-log-title">Search log</h2>
        </div>
        <output aria-live="polite">
          {visibleLogs.length} / {logs.length} steps
        </output>
      </header>

      {logs.length === 0 ? (
        <div className="search-log-panel__empty">
          <strong>No search trace yet</strong>
          <span>
            The log will consume frontier_steps or visited_order from the
            result.
          </span>
        </div>
      ) : (
        <ol className="search-log-panel__list">
          {visibleLogs.map((log, index) => {
            const isActive = index === visibleLogs.length - 1

            return (
              <li
                key={`${log.step}-${log.current}`}
                className={isActive ? 'search-log-panel__item--active' : ''}
                ref={isActive ? activeLogRef : null}
              >
                <span className="search-log-panel__step">{log.step}</span>
                <span className="search-log-panel__event">
                  <strong>
                    Expand <code>{log.current}</code>
                  </strong>
                  <small>
                    Visited: {log.visitedCount}
                    {log.frontier.length > 0 &&
                      ` · Frontier: ${log.frontier.join(', ')}`}
                  </small>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
