import assert from 'node:assert/strict'
import test from 'node:test'

import { formatEdgeCostCalculation } from './edgeCostDetails.js'

test('substitutes scenario-normalized edge values into the weighted formula', () => {
  const calculation = formatEdgeCostCalculation(
    {
      normalized: { distance: 0.2, time: 0.3, congestion: 0.4, risk: 0.5 },
      contributions: { distance: 0.04, time: 0.15, congestion: 0.06, risk: 0.075 },
      route_cost: 0.325,
    },
    {
      expression: 'cost formula',
      weights: { distance: 0.2, time: 0.5, congestion: 0.15, risk: 0.15 },
    },
  )

  assert.equal(calculation.expression, 'Chi phí')
  assert.match(calculation.substitution, /α 0\.2 × 0\.2/)
  assert.match(calculation.substitution, /δ 0\.15 × 0\.5/)
  assert.equal(calculation.result, '0.325')
})

test('does not calculate a cost for a scenario-closed edge', () => {
  assert.match(
    formatEdgeCostCalculation({ closed: true }, {}).substitution,
    /cạnh này bị đóng/,
  )
})
