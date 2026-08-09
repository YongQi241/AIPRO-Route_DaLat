import { useEffect, useMemo, useRef } from 'react'
import { buildSearchActionTimeline } from '../graph/searchTimeline'
import { SIMULATION_STATUS, useAppStore } from '../../store/useAppStore'
import { describeTraceAction } from './traceNarrative'
import './SearchLogPanel.css'

export default function SearchLogPanel({ className = '' }) {
  const result = useAppStore((state) => state.routeResult)
  const graphNodes = useAppStore((state) => state.graphData.nodes)
  const graphEdges = useAppStore((state) => state.graphData.edges)
  const edgeFeatures = graphEdges?.features ?? []
  const simulation = useAppStore((state) => state.simulation)
  const activeLogRef = useRef(null)

  const actions = useMemo(
    () => buildSearchActionTimeline(result, edgeFeatures),
    [edgeFeatures, result],
  )
  const locationNames = useMemo(
    () => new Map(
      (graphNodes?.features ?? []).map(({ properties = {} }) => [
        String(properties.node_id),
        properties.name_vi ?? properties.name_en ?? properties.node_id,
      ]),
    ),
    [graphNodes],
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
            const event = describeTraceAction(action, actions, {
              algorithm: result?.algorithm,
              edgeCostDetails: result?.edge_cost_details,
              locationNames,
            })

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
                  <p>{event.detail}</p>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
