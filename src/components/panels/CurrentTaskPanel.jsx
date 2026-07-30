import { useMemo } from 'react'
import { getSearchAnimationFrame } from '../graph/SearchAnimationLayer'
import { useAppStore } from '../../store/useAppStore'
import './CurrentTaskPanel.css'

const STATUS_LABELS = {
  idle: 'Ready',
  playing: 'Searching',
  paused: 'Paused',
  completed: 'Completed',
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
  const selectedAlgorithm = useAppStore((state) => state.selectedAlgorithm)
  const routeSelection = useAppStore((state) => state.routeSelection)
  const result = useAppStore((state) => state.routeResult)
  const simulation = useAppStore((state) => state.simulation)

  const locationLookup = useMemo(
    () => createLocationLookup(graphNodes),
    [graphNodes],
  )
  const frame = useMemo(
    () => getSearchAnimationFrame(result, simulation.currentStep),
    [result, simulation.currentStep],
  )
  const progress =
    frame.totalSteps > 0
      ? Math.min(
          100,
          Math.round(((simulation.currentStep + 1) / frame.totalSteps) * 100),
        )
      : 0

  const displayName = (nodeId) =>
    nodeId ? (locationLookup.get(String(nodeId)) ?? nodeId) : 'Not selected'
  const currentNodeName = frame.currentNodeId
    ? displayName(frame.currentNodeId)
    : 'Waiting'
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
          <dt>Current node</dt>
          <dd>{currentNodeName}</dd>
        </div>
      </dl>

      <div
        className="current-task-panel__progress"
        aria-label={`Tiến trình mô phỏng ${progress}%`}
      >
        <div>
          <span>Search progress</span>
          <strong>
            {Math.min(simulation.currentStep + 1, frame.totalSteps || 0)} /{' '}
            {frame.totalSteps}
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
