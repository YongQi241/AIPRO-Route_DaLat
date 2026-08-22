import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildOptimizationComparisonNarrative,
  createComparisonRequests,
  getComparisonRecommendation,
  getComparisonOptimizations,
  getOptimalRouteAlgorithm,
  selectComparisonCandidate,
} from './routeComparison.js'

function result({
  optimization = 'balanced',
  path = ['A', 'B'],
  edges = ['E_AB'],
  distance = 10,
  time = 10,
  cost = 1,
  risk = 2,
  status = 'success',
  algorithm = 'Dijkstra',
  segments = [],
} = {}) {
  return {
    status,
    algorithm,
    optimization,
    path_nodes: path,
    path_edges: edges,
    segments,
    metrics: {
      total_distance_km: distance,
      total_time_min: time,
      total_cost: cost,
      total_risk: risk,
    },
  }
}

function state(candidates) {
  return { status: 'success', candidates }
}

test('comparison requests use the exact multi-stop oracle and profile priority', () => {
  const request = {
    algorithm: 'nearest_neighbor',
    start_node: 'A',
    goal_node: 'D',
    visit_nodes: ['B', 'C'],
    scenario_id: 'S3',
    return_to_start: true,
    optimization: 'cost',
  }
  const comparisons = createComparisonRequests(request)

  assert.deepEqual(comparisons.map(({ optimization }) => optimization), [
    'cost',
    'time',
    'distance',
    'safest',
  ])
  assert.deepEqual(comparisons[0].visit_nodes, ['B', 'C'])
  assert.equal(comparisons[0].algorithm, 'brute_force_tsp')
  assert.equal(comparisons[0].comparison_role, 'current_optimum')
  assert.equal(comparisons[1].comparison_role, 'alternative_optimum')
  assert.equal(comparisons[0].scenario_id, request.scenario_id)
  assert.equal(comparisons[0].return_to_start, true)
  assert.notEqual(comparisons[0].visit_nodes, request.visit_nodes)
  assert.deepEqual(getComparisonOptimizations('balanced'), [
    'time',
    'distance',
    'safest',
  ])
  assert.equal(getOptimalRouteAlgorithm({ visit_nodes: [] }), 'dijkstra')
})

test('narrative reports when the current route is shorter but slower', () => {
  const primary = result({ optimization: 'distance', distance: 5, time: 20 })
  const candidate = result({
    optimization: 'time',
    path: ['A', 'C', 'B'],
    edges: ['E_AC', 'E_CB'],
    distance: 8,
    time: 14,
  })
  const narrative = buildOptimizationComparisonNarrative(primary, state([
    { optimization: 'time', result: candidate },
  ]))

  assert.match(narrative, /dài hơn 3 km/)
  assert.match(narrative, /nhanh hơn 6 phút/)
  assert.match(narrative, /^Tuyến hiện tại được chọn với độ dài tuyến đường là chính\./)
  assert.match(narrative, /Thuật toán hiện tại là Dijkstra: thuật toán tối ưu tổng trọng số với điều kiện mọi trọng số cạnh không âm\./)
})

test('narrative reports when the current route is faster but longer', () => {
  const primary = result({ optimization: 'time', distance: 9, time: 7 })
  const candidate = result({
    optimization: 'distance',
    path: ['A', 'C', 'B'],
    edges: ['E_AC', 'E_CB'],
    distance: 6,
    time: 11,
  })
  const narrative = buildOptimizationComparisonNarrative(primary, state([
    { optimization: 'distance', result: candidate },
  ]))

  assert.match(narrative, /ngắn hơn 3 km/)
  assert.match(narrative, /chậm hơn 4 phút/)
})

test('same-route narrative explains traversal-order algorithms without inventing a difference', () => {
  const primary = result({ optimization: 'balanced', algorithm: 'BFS' })
  const candidate = result({ optimization: 'distance' })
  const narrative = buildOptimizationComparisonNarrative(primary, state([
    { optimization: 'distance', result: candidate },
  ]))

  assert.match(narrative, /cũng chọn đúng chuỗi đường này/)
  assert.match(narrative, /BFS.*tối ưu về số cạnh/)
})

test('narrative handles no-path, missing metrics, and comparison errors', () => {
  const primary = result()
  const noPath = result({ optimization: 'distance', status: 'no_path', path: [], edges: [] })
  assert.match(
    buildOptimizationComparisonNarrative(primary, state([{ optimization: 'distance', result: noPath }])),
    /không tìm thấy tuyến khả thi/,
  )

  const missingMetrics = result({
    optimization: 'distance',
    path: ['A', 'C', 'B'],
    edges: ['E_AC', 'E_CB'],
    distance: null,
    time: 'not-a-number',
    cost: null,
    risk: null,
  })
  assert.match(
    buildOptimizationComparisonNarrative(primary, state([{ optimization: 'distance', result: missingMetrics }])),
    /không có đủ chỉ số chung/,
  )
  assert.match(
    buildOptimizationComparisonNarrative(primary, { status: 'error', candidates: [] }),
    /Không thể tải tuyến đối chứng/,
  )
})

test('candidate selection follows balanced, fastest, shortest, safest priority', () => {
  const primary = result({ optimization: 'balanced', distance: 10, time: 10 })
  const alias = result({ optimization: 'cost', path: ['A', 'D'], edges: ['E_AD'] })
  const shortest = result({
    optimization: 'distance',
    path: ['A', 'C', 'B'],
    edges: ['E_AC', 'E_CB'],
    distance: 5,
  })
  const fastest = result({
    optimization: 'time',
    path: ['A', 'D', 'B'],
    edges: ['E_AD', 'E_DB'],
    time: 9,
  })
  const selected = selectComparisonCandidate(primary, [
    { optimization: 'cost', result: alias },
    { optimization: 'time', result: fastest },
    { optimization: 'distance', result: shortest },
  ])

  assert.equal(selected.optimization, 'time')
})

test('recommends the current-profile oracle when the selected algorithm is not optimal', () => {
  const primary = result({
    optimization: 'balanced',
    algorithm: 'BFS',
    cost: 10,
  })
  const optimum = result({
    optimization: 'balanced',
    algorithm: 'Dijkstra',
    path: ['A', 'C', 'B'],
    edges: ['E_AC', 'E_CB'],
    cost: 7,
  })
  const recommendation = getComparisonRecommendation(primary, [
    {
      optimization: 'balanced',
      comparisonRole: 'current_optimum',
      result: optimum,
    },
  ])

  assert.equal(recommendation.result, optimum)
  assert.equal(recommendation.currentIsOptimal, false)
  assert.equal(recommendation.recommendationType, 'current_optimum')
})

test('when current is optimal, recommends the first distinct profile by priority', () => {
  const primary = result({ optimization: 'shortest', distance: 5 })
  const currentOptimum = result({ optimization: 'distance', distance: 5 })
  const fastest = result({
    optimization: 'time',
    path: ['A', 'F', 'B'],
    edges: ['E_AF', 'E_FB'],
  })
  const balanced = result({
    optimization: 'balanced',
    path: ['A', 'C', 'B'],
    edges: ['E_AC', 'E_CB'],
  })
  const recommendation = getComparisonRecommendation(primary, [
    { optimization: 'time', result: fastest },
    { optimization: 'distance', comparisonRole: 'current_optimum', result: currentOptimum },
    { optimization: 'balanced', result: balanced },
  ])

  assert.equal(recommendation.result, balanced)
  assert.equal(recommendation.currentIsOptimal, true)
  assert.equal(recommendation.recommendationType, 'alternative_optimum')
})

test('Cheapest is disclosed as a Balanced-profile alias', () => {
  const primary = result({ optimization: 'cost' })
  const candidate = result({
    optimization: 'distance',
    path: ['A', 'C', 'B'],
    edges: ['E_AC', 'E_CB'],
    distance: 8,
  })
  const narrative = buildOptimizationComparisonNarrative(primary, state([
    { optimization: 'distance', result: candidate },
  ]))

  assert.match(narrative, /Cheapest hiện dùng cùng profile trọng số với Balanced/)
})

test('narrative lists highly congested segments from the alternative route', () => {
  const primary = result({ optimization: 'balanced', time: 20 })
  const candidate = result({
    optimization: 'time',
    path: ['A', 'C', 'B'],
    edges: ['E_AC', 'E_CB'],
    time: 14,
    segments: [
      { from_node: 'A', to_node: 'C', congestion_level: 4 },
      { from_node: 'C', to_node: 'B', congestion_level: 2 },
    ],
  })
  const narrative = buildOptimizationComparisonNarrative(primary, state([
    { optimization: 'time', result: candidate },
  ]))

  assert.match(narrative, /Tồn tại một tuyến khác nhanh hơn/)
  assert.match(narrative, /Tắc nghẽn ở: A → C \(mức 4\/5\)/)
})

test('narrative states the correct optimality condition for A*', () => {
  const primary = result({ optimization: 'time', algorithm: 'A*' })
  const candidate = result({
    optimization: 'distance',
    path: ['A', 'C', 'B'],
    edges: ['E_AC', 'E_CB'],
    distance: 8,
  })
  const narrative = buildOptimizationComparisonNarrative(primary, state([
    { optimization: 'distance', result: candidate },
  ]))

  assert.match(narrative, /A\* Search: thuật toán tối ưu với điều kiện trọng số cạnh không âm và heuristic không đánh giá vượt/)
})
