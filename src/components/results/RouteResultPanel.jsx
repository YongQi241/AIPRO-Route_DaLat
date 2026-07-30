import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import {
  createNodeNameLookup,
  formatMetric,
  formatNumber,
} from './resultFormatting'
import './RouteResultPanel.css'

const STATUS_LABELS = {
  success: 'Route found',
  no_path: 'No route',
  invalid_input: 'Invalid input',
  error: 'Error',
}

export default function RouteResultPanel({ className = '' }) {
  const nodes = useAppStore((state) => state.graphData.nodes)
  const result = useAppStore((state) => state.routeResult)

  const nodeNameLookup = useMemo(
    () => createNodeNameLookup(nodes),
    [nodes],
  )
  const path = result?.path_nodes ?? []
  const metrics = result?.metrics ?? {}
  const pathLabels = path.map(
    (nodeId) => nodeNameLookup.get(String(nodeId)) ?? nodeId,
  )
  const warningSegments = (result?.segments ?? []).filter(
    (segment) =>
      Number(segment.congestion_level ?? 0) >= 4 ||
      Number(segment.risk ?? 0) > 0,
  ).length
  const rootClassName = ['route-result-panel', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={rootClassName} aria-labelledby="route-result-title">
      <header className="route-result-panel__header">
        <div>
          <span>Output</span>
          <h2 id="route-result-title">Route result</h2>
        </div>
        {result && (
          <output
            className={`route-result-panel__status route-result-panel__status--${result.status}`}
            aria-live="polite"
          >
            {STATUS_LABELS[result.status] ?? result.status}
          </output>
        )}
      </header>

      {!result ? (
        <div className="route-result-panel__empty">
          <strong>No result available</strong>
          <span>Route metrics will appear after the service responds.</span>
        </div>
      ) : result.status !== 'success' ? (
        <div className="route-result-panel__failure" role="alert">
          <strong>{STATUS_LABELS[result.status] ?? 'Route unavailable'}</strong>
          <span>{result.message ?? result.explanation ?? 'No details provided.'}</span>
        </div>
      ) : (
        <>
          <div className="route-result-panel__path">
            <span>Selected path</span>
            <ol>
              {pathLabels.map((label, index) => (
                <li key={`${path[index]}-${index}`}>
                  <span>{index + 1}</span>
                  <strong>{label}</strong>
                  <small>{path[index]}</small>
                </li>
              ))}
            </ol>
          </div>

          <dl className="route-result-panel__metrics">
            <div>
              <dt>Total distance</dt>
              <dd>{formatMetric(metrics.total_distance_km, 'km')}</dd>
            </div>
            <div>
              <dt>Estimated time</dt>
              <dd>{formatMetric(metrics.total_time_min, 'min')}</dd>
            </div>
            <div>
              <dt>Total cost</dt>
              <dd>{formatNumber(metrics.total_cost, 3)}</dd>
            </div>
            <div>
              <dt>Explored nodes</dt>
              <dd>{formatNumber(metrics.explored_nodes, 0)}</dd>
            </div>
            <div>
              <dt>Processing time</dt>
              <dd>{formatMetric(metrics.processing_time_ms, 'ms')}</dd>
            </div>
            <div>
              <dt>Warning segments</dt>
              <dd>{warningSegments}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  )
}
