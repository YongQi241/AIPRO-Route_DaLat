import { useEffect, useMemo, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import './SearchLogPanel.css'

function createSearchLogs(result) {
  const frontierSteps = result?.frontier_steps ?? []

  if (frontierSteps.length > 0) {
    return frontierSteps.map((frame, index) => {
      const isSelectionStep =
        Array.isArray(frame.candidates) || frame.selected != null

      return {
        step: index + 1,
        current: formatNodeId(frame.current) || '—',
        frontier: isSelectionStep
          ? (frame.candidates ?? []).map(formatCandidate)
          : (frame.frontier ?? []).map(formatFrontierEntry),
        visitedCount: (frame.visited ?? []).length,
        selected: formatNodeId(frame.selected),
        isSelectionStep,
      }
    })
  }

  return (result?.visited_order ?? []).map((nodeId, index) => ({
    step: index + 1,
    current: nodeId,
    frontier: [],
    visitedCount: index + 1,
  }))
}

function formatNodeId(value) {
  if (value == null) return ''
  if (typeof value === 'object') {
    return String(value.node ?? value.node_id ?? value.id ?? '')
  }
  return String(value)
}

function formatScore(value) {
  const score = Number(value)
  return Number.isFinite(score) ? score.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  }) : null
}

function formatFrontierEntry(entry) {
  const nodeId = formatNodeId(entry)
  if (!nodeId || typeof entry !== 'object') return nodeId

  const score = formatScore(
    entry.priority ?? entry.f_cost ?? entry.distance ?? entry.h_cost,
  )
  return score == null ? nodeId : `${nodeId} (${score})`
}

function formatCandidate(candidate) {
  const nodeId = formatNodeId(candidate)
  if (!nodeId || typeof candidate !== 'object') return nodeId
  if (candidate.reachable === false) return `${nodeId} (unreachable)`

  const score = formatScore(candidate.score ?? candidate.priority)
  return score == null ? nodeId : `${nodeId} (${score})`
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
                    {log.isSelectionStep ? 'Choose from' : 'Expand'}{' '}
                    <code>{log.current}</code>
                  </strong>
                  <small>
                    {log.isSelectionStep
                      ? log.selected && `Selected: ${log.selected}`
                      : `Visited: ${log.visitedCount}`}
                    {log.frontier.length > 0 &&
                      ` · ${log.isSelectionStep ? 'Candidates' : 'Frontier'}: ${log.frontier.join(', ')}`}
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
