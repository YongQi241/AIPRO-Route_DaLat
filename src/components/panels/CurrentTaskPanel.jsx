import { useMemo } from 'react'
import {
  buildSearchActionTimeline,
  getSearchAction,
} from '../graph/searchTimeline'
import { MULTI_LOCATION_ALGORITHMS } from '../../services/routeRequest'
import { SIMULATION_STATUS, useAppStore } from '../../store/useAppStore'
import './CurrentTaskPanel.css'

const STATUS_LABELS = {
  idle: 'Ready',
  playing: 'Searching',
  paused: 'Paused',
  completed: 'Completed',
}

const OUTCOME_LABELS = {
  add: 'Added to frontier',
  update: 'Frontier value updated',
  keep: 'Existing value kept',
  unknown: 'Result not provided',
}

function createLocationLookup(nodes) {
  return new Map(
    (nodes?.features ?? []).map(({ properties = {} }) => [
      String(properties.node_id),
      properties.name_vi ?? properties.name_en ?? properties.node_id,
    ]),
  )
}

export default function CurrentTaskPanel({ className = '' }) {
  const graphNodes = useAppStore((state) => state.graphData.nodes)
  const graphEdges = useAppStore((state) => state.graphData.edges)
  const edgeFeatures = graphEdges?.features ?? []
  const selectedAlgorithm = useAppStore((state) => state.selectedAlgorithm)
  const routeSelection = useAppStore((state) => state.routeSelection)
  const result = useAppStore((state) => state.routeResult)
  const simulation = useAppStore((state) => state.simulation)

  const locationLookup = useMemo(
    () => createLocationLookup(graphNodes),
    [graphNodes],
  )
  const timeline = useMemo(
    () => buildSearchActionTimeline(result, edgeFeatures),
    [edgeFeatures, result],
  )
  const action =
    simulation.status === SIMULATION_STATUS.IDLE
      ? null
      : getSearchAction(timeline, simulation.currentStep)
  const visibleActionCount =
    timeline.length === 0 || simulation.status === SIMULATION_STATUS.IDLE
      ? 0
      : Math.min(simulation.currentStep + 1, timeline.length)
  const progress =
    timeline.length > 0
      ? Math.round((visibleActionCount / timeline.length) * 100)
      : 0

  const displayName = (nodeId) =>
    nodeId ? (locationLookup.get(String(nodeId)) ?? nodeId) : 'Not selected'
  const currentNodeName = action?.currentNodeId
    ? displayName(action.currentNodeId)
    : 'Waiting'
  const usesIntermediateLocations = MULTI_LOCATION_ALGORITHMS.has(
    selectedAlgorithm,
  )
  const requestedStops =
    result?.visit_nodes ??
    (usesIntermediateLocations
      ? [...routeSelection.visitNodes, routeSelection.goalNode].filter(Boolean)
      : [])
  const requestedStopLabels = [...new Set(requestedStops)]
    .map((nodeId) => displayName(nodeId))
    .join(' → ')
  const rootClassName = ['current-task-panel', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={rootClassName} aria-labelledby="current-task-title">
      <header className="current-task-panel__header">
        <div>
          <span>Simulation</span>
          <h2 id="current-task-title">Current task</h2>
        </div>
        <output
          className={`current-task-panel__status current-task-panel__status--${simulation.status}`}
          aria-live="polite"
        >
          {STATUS_LABELS[simulation.status] ?? simulation.status}
        </output>
      </header>

      <div className="current-task-panel__route">
        <div>
          <span>Start</span>
          <strong>{displayName(routeSelection.startNode)}</strong>
          {routeSelection.startNode && <small>{routeSelection.startNode}</small>}
        </div>
        <span className="current-task-panel__route-arrow" aria-hidden="true">
          →
        </span>
        <div>
          <span>Destination</span>
          <strong>{displayName(routeSelection.goalNode)}</strong>
          {routeSelection.goalNode && <small>{routeSelection.goalNode}</small>}
        </div>
      </div>

      <dl className="current-task-panel__details">
        <div>
          <dt>Algorithm</dt>
          <dd>{result?.algorithm ?? selectedAlgorithm.toUpperCase()}</dd>
        </div>
        <div>
          <dt>Scenario</dt>
          <dd>{result?.scenario_id ?? routeSelection.scenarioId}</dd>
        </div>
        <div>
          <dt>Optimization</dt>
          <dd>{result?.optimization ?? routeSelection.optimization}</dd>
        </div>
        <div>
          <dt>Intermediate route</dt>
          <dd>
            {usesIntermediateLocations || result?.visit_nodes
              ? requestedStopLabels || 'No stops selected'
              : 'Not used by this algorithm'}
          </dd>
        </div>
        <div>
          <dt>Current node</dt>
          <dd>{currentNodeName}</dd>
        </div>
        <div>
          <dt>Active edge</dt>
          <dd>{action?.activeEdgeId ?? '—'}</dd>
        </div>
        <div>
          <dt>Evaluating node</dt>
          <dd>
            {action?.activeNeighborId
              ? `${displayName(action.activeNeighborId)} (${action.activeNeighborId})`
              : '—'}
          </dd>
        </div>
        <div>
          <dt>Relaxation result</dt>
          <dd>{OUTCOME_LABELS[action?.outcome] ?? '—'}</dd>
        </div>
      </dl>

      <div
        className="current-task-panel__progress"
        aria-label={`Simulation progress ${progress}%`}
      >
        <div>
          <span>Search actions</span>
          <strong>
            {visibleActionCount} / {timeline.length}
          </strong>
        </div>
        <div
          className="current-task-panel__progress-track"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      {result?.message && (
        <p
          className={`current-task-panel__message current-task-panel__message--${result.status}`}
          role={result.status === 'success' ? 'status' : 'alert'}
        >
          {result.message}
        </p>
      )}
    </section>
  )
}
