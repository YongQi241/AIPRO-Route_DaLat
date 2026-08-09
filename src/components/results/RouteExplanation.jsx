import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { createNodeNameLookup, formatNumber } from './resultFormatting'
import { buildRouteReasoning } from './routeReasoning'
import './RouteExplanation.css'

function Figure({ label, value, unit = '' }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{formatNumber(value, 3)}{unit ? ` ${unit}` : ''}</dd>
    </div>
  )
}

function TraceStatistics({ trace }) {
  const figures = [
    ['Recorded actions', trace.recordedActions],
    ['Nodes expanded', trace.expansions],
    ['Roads checked', trace.edgeChecks],
    ['New frontier entries', trace.added],
    ['Improved entries', trace.improved],
    ['Existing routes retained', trace.retainedExisting],
    ['Location comparisons', trace.locationComparisons],
    ['Unreachable locations', trace.unreachableLocations],
    ['Peak frontier size', trace.peakFrontier],
  ].filter(([, value]) => value > 0)

  return <dl className="route-explanation__stats">
    {figures.map(([label, value]) => <Figure key={label} label={label} value={value} />)}
  </dl>
}

function ScenarioFormula({ formula, contributions }) {
  if (!formula || !contributions) return null
  const weights = formula.weights ?? {}
  return (
    <section className="route-explanation__section">
      <h3>Scenario-cost calculation across the selected route</h3>
      <p>{formula.expression}</p>
      <code>
        α={formatNumber(weights.distance, 3)}, β={formatNumber(weights.time, 3)},{' '}
        γ={formatNumber(weights.congestion, 3)}, δ={formatNumber(weights.risk, 3)}
      </code>
      <dl className="route-explanation__contributions">
        <Figure label="Distance contribution" value={contributions.distance} />
        <Figure label="Time contribution" value={contributions.time} />
        <Figure label="Congestion contribution" value={contributions.congestion} />
        <Figure label="Risk contribution" value={contributions.risk} />
      </dl>
      <small>Contributions are summed once for every occurrence of an edge in the final route.</small>
    </section>
  )
}

function SelectionRounds({ rounds }) {
  if (rounds.length === 0) return null
  return (
    <section className="route-explanation__section">
      <h3>Stop-by-stop considerations</h3>
      <ol className="route-explanation__rounds">
        {rounds.map((round) => <li key={round.index}>
          <strong>Round {round.index}: from {round.from}, choose {round.selected}</strong>
          <span>Winning score: {formatNumber(round.selectedScore, 6)}</span>
          <ul>
            {round.candidates.map((candidate) => <li
              className={candidate.selected ? 'is-selected' : ''}
              key={candidate.node}
            >
              <span>{candidate.node}</span>
              <b>{candidate.reachable ? formatNumber(candidate.score, 6) : 'Unreachable'}</b>
              <small>{candidate.selected ? 'Lowest reachable score' : candidate.reachable ? 'Higher score; deferred' : 'No directed route'}</small>
            </li>)}
          </ul>
        </li>)}
      </ol>
    </section>
  )
}

function SegmentConsiderations({ segments }) {
  if (segments.length === 0) return null
  return (
    <section className="route-explanation__section">
      <h3>Selected-road figures and conditions</h3>
      <ol className="route-explanation__segments">
        {segments.map((segment) => {
          const detail = segment.detail
          return <li key={`${segment.edgeId}-${segment.index}`}>
            <header>
              <span>{segment.index}</span>
              <div><strong>{segment.from} → {segment.to}</strong><small>Edge {segment.edgeId}</small></div>
            </header>
            <dl>
              <Figure label="Distance" value={segment.distance} unit="km" />
              <Figure label="Adjusted time" value={segment.time} unit="min" />
              <Figure label="Scenario cost" value={segment.cost} />
              <Figure label="Congestion" value={segment.congestion} unit="/ 5" />
              <Figure label="Risk" value={segment.risk} />
              {detail?.time_multiplier != null && <Figure label="Time factor" value={detail.time_multiplier} unit="×" />}
            </dl>
            <p>
              This road contributes the figures above to the complete route.
              {detail?.construction_penalty > 0 ? ` Construction adds ${formatNumber(detail.construction_penalty, 3)} to risk.` : ''}
              {detail?.rain_risk > 0 || detail?.fog_risk > 0 ? ` Weather risk: rain ${formatNumber(detail.rain_risk, 3)}, fog ${formatNumber(detail.fog_risk, 3)}.` : ''}
            </p>
          </li>
        })}
      </ol>
    </section>
  )
}

export default function RouteExplanation({ className = '' }) {
  const result = useAppStore((state) => state.routeResult)
  const nodes = useAppStore((state) => state.graphData.nodes)
  const edges = useAppStore((state) => state.graphData.edges)
  const names = useMemo(() => createNodeNameLookup(nodes), [nodes])
  const reasoning = useMemo(
    () => buildRouteReasoning(result, names, edges?.features ?? []),
    [edges, names, result],
  )
  const rootClassName = ['route-explanation', className].filter(Boolean).join(' ')

  return (
    <section className={rootClassName} aria-labelledby="route-explanation-title">
      <header className="route-explanation__header">
        <div><span>Human-readable reasoning</span><h2 id="route-explanation-title">Why this route was chosen</h2></div>
        {result && <dl className="route-explanation__context">
          <div><dt>Algorithm</dt><dd>{result.algorithm ?? '—'}</dd></div>
          <div><dt>Scenario</dt><dd>{result.scenario_id ?? '—'}</dd></div>
          <div><dt>Criterion</dt><dd>{result.optimization ?? '—'}</dd></div>
        </dl>}
      </header>

      {!reasoning ? <div className="route-explanation__empty"><strong>No explanation available</strong><span>Complete a search to see the decision evidence.</span></div> : (
        <div className="route-explanation__body">
          <section className="route-explanation__summary">
            <span>Selected route</span>
            <strong>{reasoning.path.join(' → ') || 'No complete route'}</strong>
            <p>{reasoning.method}</p>
            {result.explanation && <p>{result.explanation}</p>}
          </section>

          <section className="route-explanation__section">
            <h3>Recorded result figures</h3>
            <p className="route-explanation__objective">
              Decision objective: <strong>{reasoning.objective.label}</strong>
              {reasoning.objective.value != null && <> · recorded value <strong>{formatNumber(reasoning.objective.value, 6)} {reasoning.objective.unit}</strong></>}
            </p>
            <dl className="route-explanation__figures">
              {reasoning.figures.map((figure) => <Figure key={figure.label} {...figure} />)}
            </dl>
          </section>

          <section className="route-explanation__section">
            <h3>Considerations recorded during search</h3>
            <TraceStatistics trace={reasoning.trace} />
            <p>“Added” means a destination first entered the frontier; “improved” means a cheaper route replaced its previous value; “retained” means the new candidate did not beat the existing value.</p>
            {reasoning.permutations && <p><strong>Brute-force coverage:</strong> {formatNumber(reasoning.permutations.evaluated, 0)} feasible orders evaluated out of {formatNumber(reasoning.permutations.possible, 0)} possible permutations.</p>}
          </section>

          <SelectionRounds rounds={reasoning.selectionRounds} />
          <ScenarioFormula formula={reasoning.formula} contributions={reasoning.contributions} />
          <SegmentConsiderations segments={reasoning.segments} />

          {result.optimality_note && <aside><strong>What this result guarantees</strong><span>{result.optimality_note}</span></aside>}
        </div>
      )}
    </section>
  )
}
