import { useEffect, useMemo, useRef } from 'react'
import {
  buildSearchActionTimeline,
} from '../graph/searchTimeline'
import { SIMULATION_STATUS, useAppStore } from '../../store/useAppStore'
import './SearchLogPanel.css'

function formatNumber(value) {
  return value == null
    ? null
    : Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 })
}

function formatTraceValues(entry) {
  if (!entry) return null

  const values = [
    ['g', entry.gCost],
    ['h', entry.hCost],
    ['f', entry.fCost],
    ['priority', entry.priority],
  ]
    .filter(([, value]) => value != null)
    .map(([label, value]) => `${label}=${formatNumber(value)}`)

  return values.length > 0 ? values.join(', ') : null
}

function describeAction(action) {
  if (action.type === 'expand') {
    return {
      title: `Expand ${action.currentNodeId}`,
      detail:
        action.candidateEdgeIds.length > 0
          ? `Outgoing candidates: ${action.candidateEdgeIds.join(', ')}`
          : 'No outgoing candidates in this trace',
    }
  }

  if (action.type === 'consider-edge') {
    const oldValues = formatTraceValues(action.oldValues)
    const newValues = formatTraceValues(action.newValues)
    const valueChange =
      oldValues || newValues
        ? `Before: ${oldValues ?? 'not in frontier'} · After: ${newValues ?? 'not provided'}`
        : 'The trace does not provide enough values to compare'

    return {
      title: `Consider ${action.activeEdgeId}: ${action.currentNodeId} → ${action.activeNeighborId}`,
      detail: `${action.outcome.toUpperCase()} · ${valueChange}`,
    }
  }

  if (action.type === 'frame-complete') {
    return {
      title: `Finish expanding ${action.currentNodeId}`,
      detail:
        action.frontierNodeIds.length > 0
          ? `Frontier: ${action.frontierNodeIds.join(', ')}`
          : 'Frontier is empty',
    }
  }

  return {
    title: 'Search playback complete',
    detail: 'The final route can now be displayed',
  }
}

export default function SearchLogPanel({ className = '' }) {
  const result = useAppStore((state) => state.routeResult)
  const graphEdges = useAppStore((state) => state.graphData.edges)
  const edgeFeatures = graphEdges?.features ?? []
  const simulation = useAppStore((state) => state.simulation)
  const activeLogRef = useRef(null)

  const actions = useMemo(
    () => buildSearchActionTimeline(result, edgeFeatures),
    [edgeFeatures, result],
  )
  const visibleActions =
    simulation.status === SIMULATION_STATUS.IDLE
      ? []
      : actions.slice(0, Math.min(simulation.currentStep + 1, actions.length))

  useEffect(() => {
    activeLogRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [simulation.currentStep])

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
          {visibleActions.length} / {actions.length} actions
        </output>
      </header>

      {actions.length === 0 ? (
        <div className="search-log-panel__empty">
          <strong>No search trace yet</strong>
          <span>
            The log consumes frontier_steps or visited_order from the result.
          </span>
        </div>
      ) : visibleActions.length === 0 ? (
        <div className="search-log-panel__empty">
          <strong>Playback is ready</strong>
          <span>Press Play or Next action to inspect the first action.</span>
        </div>
      ) : (
        <ol className="search-log-panel__list">
          {visibleActions.map((action, index) => {
            const isActive = index === visibleActions.length - 1
            const event = describeAction(action)

            return (
              <li
                key={action.actionIndex}
                className={isActive ? 'search-log-panel__item--active' : ''}
                ref={isActive ? activeLogRef : null}
              >
                <span className="search-log-panel__step">
                  {action.actionIndex + 1}
                </span>
                <span className="search-log-panel__event">
                  <strong>{event.title}</strong>
                  <small>{event.detail}</small>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
