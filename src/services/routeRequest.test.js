import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createRouteRequest,
  isMultiLocationAlgorithm,
} from './routeRequest.js'

const selection = {
  startNode: 'DL01',
  goalNode: 'DL09',
  visitNodes: ['DL03', 'DL08'],
  scenarioId: 'S0',
  optimization: 'balanced',
}

test('only Nearest Neighbor and Brute Force TSP support multiple locations', () => {
  assert.equal(isMultiLocationAlgorithm('nearest_neighbor'), true)
  assert.equal(isMultiLocationAlgorithm('brute_force_tsp'), true)

  for (const algorithm of [
    'bfs',
    'dfs',
    'ucs',
    'dijkstra',
    'astar',
    'greedy',
    'hill_climbing',
  ]) {
    assert.equal(isMultiLocationAlgorithm(algorithm), false)
  }
})

test('single-destination requests cannot submit intermediate locations', () => {
  const request = createRouteRequest(selection, 'astar')
  assert.deepEqual(request.visit_nodes, [])
})

test('multi-location requests include intermediate locations and destination', () => {
  const request = createRouteRequest(selection, 'nearest_neighbor')
  assert.deepEqual(request.visit_nodes, ['DL03', 'DL08', 'DL09'])
})
