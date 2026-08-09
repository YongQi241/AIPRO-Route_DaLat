import {
  formatOptimizationFormula,
  getOptimizationFormula,
} from '../../services/scenarioCostFormula'
import { scenarioCostDataMatches } from '../../services/scenarioCostModel'

export default function ScenarioFormulaPanel({ selection, costModel }) {
  const loadedData = costModel?.data
  const isCurrent = scenarioCostDataMatches(loadedData, selection)
  const formula =
    (isCurrent ? loadedData.edge_cost_formula : null) ??
    getOptimizationFormula(selection.optimization)

  let status = 'Loading scenario-adjusted edge conditions…'
  if (costModel?.error) status = `Cost data unavailable: ${costModel.error}`
  if (isCurrent) {
    const edgeCount = Object.keys(loadedData.edge_costs ?? {}).length
    status = `${edgeCount} open-edge costs loaded; scenario conditions supply the normalized inputs.`
  }

  return (
    <section
      className="route-selection__formula"
      aria-label="Active scenario cost formula"
    >
      <div>
        <strong>Active edge-cost formula</strong>
        <span>
          Scenario {selection.scenarioId} · {formula.optimization}{' '}
          optimization
        </span>
      </div>
      <code>{formatOptimizationFormula(formula)}</code>
      <small>{status}</small>
    </section>
  )
}
