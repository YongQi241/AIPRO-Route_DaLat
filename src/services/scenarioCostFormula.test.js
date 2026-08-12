import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatOptimizationFormula,
  getOptimizationFormula,
} from './scenarioCostFormula.js'

test('formats the backend-equivalent balanced formula', () => {
  const formula = getOptimizationFormula('balanced')

  assert.deepEqual(formula.weights, {
    distance: 0.2,
    time: 0.5,
    congestion: 0.15,
    risk: 0.15,
  })
  assert.equal(
    formatOptimizationFormula(formula),
    'cost × 100 = 100 × (0.2·distance_norm + 0.5·time_norm + 0.15·congestion_norm + 0.15·risk_norm)',
  )
})

test('normalizes UI aliases to their backend profile names', () => {
  assert.equal(getOptimizationFormula('distance').optimization, 'shortest')
  assert.equal(getOptimizationFormula('time').optimization, 'fastest')
  assert.equal(getOptimizationFormula('cost').optimization, 'balanced')
})
