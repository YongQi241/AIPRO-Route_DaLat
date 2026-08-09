import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateScenarioEdgeCosts,
  parseCsv,
} from './scenarioCostService.js'

test('parses quoted CSV fields and escaped quotes', () => {
  assert.deepEqual(
    parseCsv('id,name\r\nE1,"Road, North"\r\nE2,"A ""quoted"" road"'),
    [
      { id: 'E1', name: 'Road, North' },
      { id: 'E2', name: 'A "quoted" road' },
    ],
  )
})

test('calculates local scenario costs with backend-equivalent normalization', () => {
  const edges = [
    {
      edge_id: 'E1', distance_km: '1', base_time_min: '2',
      congestion_level: '1', risk_score: '0', closed: 'False',
    },
    {
      edge_id: 'E2', distance_km: '3', base_time_min: '4',
      congestion_level: '2', risk_score: '1', closed: 'False',
    },
    {
      edge_id: 'E3', distance_km: '5', base_time_min: '6',
      congestion_level: '3', risk_score: '0', closed: 'False',
    },
  ]
  const conditions = [
    {
      scenario_id: 'S1', scenario_name: 'test', edge_id: 'E1',
      congestion_level: '1', time_multiplier: '1', rain_risk: '0',
      fog_risk: '0', construction_penalty: '0', closed: 'False',
    },
    {
      scenario_id: 'S1', scenario_name: 'test', edge_id: 'E2',
      congestion_level: '2', time_multiplier: '1', rain_risk: '1',
      fog_risk: '0', construction_penalty: '0', closed: 'False',
    },
    {
      scenario_id: 'S1', scenario_name: 'test', edge_id: 'E3',
      congestion_level: '3', time_multiplier: '1', rain_risk: '0',
      fog_risk: '0', construction_penalty: '0', closed: 'True',
    },
  ]

  const result = calculateScenarioEdgeCosts(
    edges,
    conditions,
    'S1',
    'balanced',
  )

  assert.deepEqual(result.closed_edge_ids, ['E3'])
  assert.equal(result.edge_costs.E1, 0.03)
  assert.equal(result.edge_costs.E2, 0.91)
  assert.equal(result.edge_cost_details.E2.normalized.risk, 1)
  assert.equal(result.source, 'local_csv')
})
