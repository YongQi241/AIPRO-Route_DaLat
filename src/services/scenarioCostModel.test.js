import assert from 'node:assert/strict'
import test from 'node:test'

import {
  scenarioCostDataMatches,
  selectActiveScenarioCostData,
} from './scenarioCostModel.js'

const selection = { scenarioId: 'S2', optimization: 'balanced' }

test('rejects scenario cost data for a stale route selection', () => {
  assert.equal(
    scenarioCostDataMatches(
      { scenario_id: 'S1', optimization: 'balanced' },
      selection,
    ),
    false,
  )
})

test('prefers current live costs and safely falls back to a matching result', () => {
  const live = { scenario_id: 'S2', optimization: 'balanced', source: 'live' }
  const result = { scenario_id: 'S2', optimization: 'balanced', source: 'result' }

  assert.equal(selectActiveScenarioCostData(live, result, selection), live)
  assert.equal(selectActiveScenarioCostData(null, result, selection), result)
  assert.equal(
    selectActiveScenarioCostData(
      { scenario_id: 'S0', optimization: 'balanced' },
      { scenario_id: 'S2', optimization: 'time' },
      selection,
    ),
    null,
  )
})
