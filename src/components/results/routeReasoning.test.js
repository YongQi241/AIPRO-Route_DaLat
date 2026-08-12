import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRouteReasoning } from './routeReasoning.js'

const names = new Map([['A', 'Market'], ['B', 'Lake'], ['C', 'Station']])
const edgeFeatures = [{ properties: { edge_id: 'E1', from_node: 'A', to_node: 'B' } }]

test('builds exact route, trace, formula, and segment figures', () => {
  const reasoning = buildRouteReasoning({
    status: 'success', algorithm: 'A*', weight_used: 'route_cost',
    path_nodes: ['A', 'B'], path_edges: ['E1'], visited_order: ['A', 'B'],
    metrics: { total_distance_km: 2, total_time_min: 4, total_cost: 0.6,
      total_risk: 1, path_edge_count: 1, explored_nodes: 2 },
    segments: [{ edge_id: 'E1', from_node: 'A', to_node: 'B',
      distance_km: 2, adjusted_time_min: 4, route_cost: 0.6,
      congestion_level: 3, risk: 1 }],
    frontier_steps: [{ current: 'A', frontier: ['B'], visited: ['A'] }],
    edge_cost_formula: { expression: 'cost = weighted terms' },
    edge_cost_details: { E1: { contributions: {
      distance: 0.1, time: 0.2, congestion: 0.2, risk: 0.1,
    } } },
  }, names, edgeFeatures)

  assert.deepEqual(reasoning.path, ['A', 'B'])
  assert.equal(reasoning.objective.value, 60)
  assert.equal(reasoning.trace.expansions, 1)
  assert.equal(reasoning.trace.edgeChecks, 1)
  assert.deepEqual(reasoning.contributions, {
    distance: 10, time: 20, congestion: 20, risk: 10,
  })
  assert.equal(reasoning.segments[0].congestion, 3)
})

test('preserves every nearest-neighbor candidate and selection score', () => {
  const reasoning = buildRouteReasoning({
    status: 'success', algorithm: 'Nearest Neighbor', weight_used: 'route_cost',
    metrics: {}, segments: [], path_nodes: [], path_edges: [],
    selection_steps: [{ current: 'A', selected: 'B', selected_score: 2,
      candidates: [
        { node: 'B', reachable: true, score: 2 },
        { node: 'C', reachable: true, score: 5 },
      ] }],
    frontier_steps: [],
  }, names)

  assert.equal(reasoning.selectionRounds[0].selected, 'B')
  assert.deepEqual(
    reasoning.selectionRounds[0].candidates.map(({ score, selected }) => [score, selected]),
    [[2, true], [5, false]],
  )
})

test('reports brute-force permutation coverage', () => {
  const reasoning = buildRouteReasoning({
    status: 'success', algorithm: 'Brute Force TSP', objective_value: 7,
    metrics: { permutations_evaluated: 6, permutations_possible: 6 },
  }, names)

  assert.deepEqual(reasoning.permutations, { evaluated: 6, possible: 6 })
  assert.match(reasoning.method, /mọi thứ tự khả thi/)
})
