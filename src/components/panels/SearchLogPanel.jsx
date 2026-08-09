import { useEffect, useMemo, useRef } from 'react'
import {
  buildSearchActionTimeline,
} from '../graph/searchTimeline'
import { describeCandidateEdgeDecision } from '../graph/edgeDecision'
import { describeLocationDecision } from '../graph/locationDecision'
import { SIMULATION_STATUS, useAppStore } from '../../store/useAppStore'
import './SearchLogPanel.css'

function describeAction(action, actions) {
  if (action.type === 'select-next-location') {
    return {
      title: `Choose the next stop from ${action.currentNodeId}`,
      detail: `Compare ${action.selectionCandidates.length} remaining locations; the lowest reachable Dijkstra score wins.`,
    }
  }

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
    const evaluatedAtThisPoint = actions.filter(
      (candidateAction) =>
        candidateAction.type === 'consider-edge' &&
        candidateAction.frameIndex === action.frameIndex &&
        candidateAction.actionIndex <= action.actionIndex,
    )
    const reason = describeCandidateEdgeDecision(
      action.activeEdgeId,
      evaluatedAtThisPoint,
    )

    return {
      title: `Consider ${action.activeEdgeId}: ${action.currentNodeId} → ${action.activeNeighborId}`,
      detail: `${action.outcome.toUpperCase()} · ${reason}`,
    }
  }

  if (action.type === 'consider-location') {
    return {
      title: `Compare location ${action.activeNeighborId}`,
      detail: `${action.outcome.toUpperCase()} · ${describeLocationDecision(action)}`,
    }
  }

  if (action.type === 'frame-complete') {
    if (action.selectionRule === 'lowest_candidate_score') {
      return {
        title: `Selected ${action.selectedNodeId} after comparing all locations`,
        detail: `Lowest reachable score: ${action.selectedScore ?? 'not recorded'}`,
      }
    }
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
            const event = describeAction(action, actions)

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
