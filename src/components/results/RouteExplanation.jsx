import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import './RouteExplanation.css'

function collectWarnings(segments) {
  return segments
    .filter(
      (segment) =>
        Number(segment.congestion_level ?? 0) >= 4 ||
        Number(segment.risk ?? 0) > 0,
    )
    .map((segment) => ({
      edgeId: String(segment.edge_id),
      congestion: Number(segment.congestion_level ?? 0),
      risk: Number(segment.risk ?? 0),
    }))
}

export default function RouteExplanation({ className = '' }) {
  const result = useAppStore((state) => state.routeResult)
  const warnings = useMemo(
    () => collectWarnings(result?.segments ?? []),
    [result],
  )
  const rootClassName = ['route-explanation', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={rootClassName} aria-labelledby="route-explanation-title">
      <header className="route-explanation__header">
        <div>
          <span>Human-readable reasoning</span>
          <h2 id="route-explanation-title">Route explanation</h2>
        </div>
        {result && (
          <dl className="route-explanation__context">
            <div>
              <dt>Algorithm</dt>
              <dd>{result.algorithm ?? '—'}</dd>
            </div>
            <div>
              <dt>Scenario</dt>
              <dd>{result.scenario_id ?? '—'}</dd>
            </div>
            <div>
              <dt>Criterion</dt>
              <dd>{result.optimization ?? '—'}</dd>
            </div>
          </dl>
        )}
      </header>

      {!result ? (
        <div className="route-explanation__empty">
          <strong>No explanation available</strong>
          <span>The Backend explanation will be displayed without modification.</span>
        </div>
      ) : (
        <div className="route-explanation__body">
          <span className="route-explanation__quote" aria-hidden="true">
            “
          </span>
          <p>
            {result.explanation ||
              'The route service did not provide an explanation.'}
          </p>

          {warnings.length > 0 && (
            <div className="route-explanation__warnings">
              <strong>Reported warning segments</strong>
              <ul>
                {warnings.map((warning) => (
                  <li key={warning.edgeId}>
                    <code>{warning.edgeId}</code>
                    {warning.congestion >= 4 && (
                      <span>Congestion {warning.congestion}/5</span>
                    )}
                    {warning.risk > 0 && <span>Risk {warning.risk}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.optimality_note && (
            <aside>
              <strong>Optimality note</strong>
              <span>{result.optimality_note}</span>
            </aside>
          )}
        </div>
      )}
    </section>
  )
}
