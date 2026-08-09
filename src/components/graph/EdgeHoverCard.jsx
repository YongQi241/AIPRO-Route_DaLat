import {
  formatEdgeCostCalculation,
  formatEdgeDetailNumber as number,
} from './edgeCostDetails'
import './EdgeHoverCard.css'

function Condition({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export default function EdgeHoverCard({
  edge,
  detail,
  formula,
  scenarioId,
  optimization,
}) {
  if (!edge) return null

  const calculation = formatEdgeCostCalculation(detail, formula)
  const scenarioName = detail?.scenario_name ?? scenarioId ?? 'not calculated'

  return (
    <aside className="edge-hover-card" role="tooltip">
      <header>
        <div>
          <span>Edge {edge.edgeId}</span>
          <strong>{edge.fromNode} → {edge.toNode}</strong>
        </div>
        <b className={detail?.closed ? 'is-closed' : ''}>
          {detail?.closed
            ? 'Closed'
            : detail?.route_cost == null
              ? 'No calculated cost'
              : `Cost ${number(detail.route_cost)}`}
        </b>
      </header>

      {edge.reason && <p className="edge-hover-card__reason">{edge.reason}</p>}

      {!detail ? (
        <p className="edge-hover-card__unavailable">
          Calculate a route to load exact conditions and costs for the selected
          scenario and optimization.
        </p>
      ) : (
        <section>
          <h3>
            Scenario conditions · {scenarioId ?? '—'} ({scenarioName})
          </h3>
          <dl>
            <Condition label="Distance">
              {number(detail.distance_km, 3)} km → norm{' '}
              {number(detail.normalized?.distance)}
            </Condition>
            <Condition label="Base time">
              {number(detail.base_time_min, 3)} min
            </Condition>
            <Condition label="Time factor">
              × {number(detail.time_multiplier, 3)}
            </Condition>
            <Condition label="Adjusted time">
              {number(detail.adjusted_time_min, 3)} min → norm{' '}
              {number(detail.normalized?.time)}
            </Condition>
            <Condition label="Congestion">
              {number(detail.scenario_congestion, 3)} / 5 → norm{' '}
              {number(detail.normalized?.congestion)}
            </Condition>
            <Condition label="Base risk">
              {number(detail.base_risk, 3)}
            </Condition>
            <Condition label="Rain / fog risk">
              {number(detail.rain_risk, 3)} / {number(detail.fog_risk, 3)}
            </Condition>
            <Condition label="Construction">
              + {number(detail.construction_penalty, 3)}
            </Condition>
            <Condition label="Total risk">
              {number(detail.total_risk, 3)} → norm{' '}
              {number(detail.normalized?.risk)}
            </Condition>
          </dl>
        </section>
      )}

      {detail && (
        <footer>
          <h3>
            Cost formula · {formula?.optimization ?? optimization ?? '—'}
          </h3>
          <code>{calculation.expression}</code>
          <code>{calculation.substitution}</code>
          {calculation.contributions && (
            <small>Terms: {calculation.contributions}</small>
          )}
          {calculation.result && <strong>= {calculation.result}</strong>}
        </footer>
      )}
    </aside>
  )
}
