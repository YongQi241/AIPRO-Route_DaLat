import { useEffect, useState } from 'react'
import {
  formatOptimizationFormula,
  getOptimizationFormula,
} from '../../services/scenarioCostFormula'
import { scenarioCostDataMatches } from '../../services/scenarioCostModel'
import { formatOptimizationLabel } from '../results/resultFormatting'

export default function ScenarioFormulaPanel({ selection, costModel }) {
  const [isVisible, setIsVisible] = useState(true)
  const loadedData = costModel?.data
  const isCurrent = scenarioCostDataMatches(loadedData, selection)
  const formula =
    (isCurrent ? loadedData.edge_cost_formula : null) ??
    getOptimizationFormula(selection.optimization)

  useEffect(() => {
    setIsVisible(true)
    const timeoutId = window.setTimeout(() => setIsVisible(false), 3200)
    return () => window.clearTimeout(timeoutId)
  }, [selection.optimization, selection.scenarioId])

  if (!isVisible) return null

  return (
    <section
      className="route-selection__formula"
      aria-label="Công thức chi phí hiện hành của kịch bản"
    >
      <strong>
        Scenario {selection.scenarioId}: optimize for{' '}
        {formatOptimizationLabel(selection.optimization)}
      </strong>
      <code>{formatOptimizationFormula(formula)}</code>
    </section>
  )
}
