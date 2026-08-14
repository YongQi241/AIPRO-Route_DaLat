import assert from 'node:assert/strict'
import test from 'node:test'

import {
  describeCandidateEdgeDecision,
  getEvaluatedCandidateEdgeIds,
  getTraceEdgeState,
  sortTraceEdgesByPaintPriority,
} from './edgeDecision.js'

const action = (
  edgeId,
  outcome,
  newValues,
  oldValues = null,
  retainedEdgeId = null,
  selectionRule = 'lowest_g_cost',
) => ({
  type: 'consider-edge',
  activeEdgeId: edgeId,
  outcome,
  newValues,
  oldValues,
  retainedEdgeId,
  selectionRule,
})

const describe = (edgeId, actions, algorithm = 'Dijkstra', context = {}) =>
  describeCandidateEdgeDecision(edgeId, actions, { algorithm, ...context })

test('Dijkstra explains add, update, and keep with cumulative g(n)', () => {
  assert.equal(
    describe('E_ADD', [action('E_ADD', 'add', { gCost: 0.05 })]),
    'Thêm vào biên: g(n)=5',
  )
  assert.equal(
    describe('E_UPDATE', [action(
      'E_UPDATE',
      'update',
      { gCost: 0.02 },
      { gCost: 0.05 },
      'E_AB',
    )]),
    'Cập nhật biên: 2 < 5 thuộc về đường E_AB',
  )
  assert.equal(
    describe('E_KEEP', [action(
      'E_KEEP',
      'keep',
      { gCost: 0.07 },
      { gCost: 0.03 },
      'E_BD',
    )]),
    'Không cập nhật: 7 ≥ 3 thuộc về đường E_BD',
  )
})

test('UCS uses the same g(n) semantics and ignores h(n) and f(n)', () => {
  const reason = describe('E1', [action(
    'E1',
    'add',
    { gCost: 0.05, hCost: 0.9, fCost: 0.95 },
  )], 'Uniform-Cost Search')

  assert.equal(reason, 'Thêm vào biên: g(n)=5')
  assert.doesNotMatch(reason, /h\(n\)|f\(n\)/)
})

test('Dijkstra and UCS preserve distance and time magnitudes with units', () => {
  assert.equal(
    describe(
      'E_DISTANCE',
      [action('E_DISTANCE', 'add', { gCost: 2.75 })],
      'Dijkstra',
      { weightUsed: 'distance_km' },
    ),
    'Thêm vào biên: g(n)=2.75 km',
  )
  assert.equal(
    describe(
      'E_TIME',
      [action('E_TIME', 'update', { gCost: 8.5 }, { gCost: 10 })],
      'UCS',
      { weightUsed: 'adjusted_time_min' },
    ),
    'Cập nhật biên: 8.5 phút < 10 phút',
  )
})

test('search cost formatting falls back from optimization to the correct unit', () => {
  assert.equal(
    describe(
      'E_DISTANCE',
      [action('E_DISTANCE', 'add', { gCost: 1.25 })],
      'Dijkstra',
      { optimization: 'shortest' },
    ),
    'Thêm vào biên: g(n)=1.25 km',
  )
  assert.equal(
    describe(
      'E_TIME',
      [action('E_TIME', 'add', { gCost: 6 })],
      'UCS',
      { optimization: 'fastest' },
    ),
    'Thêm vào biên: g(n)=6 phút',
  )
})

test('Dijkstra and UCS recognize their request IDs and display names', () => {
  const actions = [action('E1', 'add', { gCost: 0.01, fCost: 0.99 })]

  for (const algorithm of ['dijkstra', 'Dijkstra', 'ucs', 'UCS', 'Uniform-Cost Search']) {
    assert.equal(describe('E1', actions, algorithm), 'Thêm vào biên: g(n)=1')
  }
})

test('A* keeps the complete g(n), h(n), and f(n) explanation', () => {
  const actions = [action(
    'E1',
    'add',
    { gCost: 0.02, hCost: 0.03, fCost: 0.05 },
    null,
    null,
    'lowest_f_cost',
  )]

  for (const algorithm of ['astar', 'a*', 'A*', 'A* Search']) {
    assert.equal(
      describe('E1', actions, algorithm),
      'Thêm vào biên: g(n)=2, h(n)=3, f(n)=g(n)+h(n)=5',
    )
  }
})

test('does not invent a retained edge when previous_edge_id is absent', () => {
  const reason = describe('E1', [action(
    'E1',
    'update',
    { gCost: 0.02 },
    { gCost: 0.05 },
  )])

  assert.equal(reason, 'Cập nhật biên: 2 < 5')
  assert.doesNotMatch(reason, /thuộc về đường/)
})

test('falls back to priority for cumulative g(n) when g_cost is missing', () => {
  assert.equal(
    describe('E1', [action('E1', 'add', { priority: 0.025 })], 'UCS'),
    'Thêm vào biên: g(n)=2.5',
  )
})

test('preserves zero, decimals, and equality in cumulative comparisons', () => {
  assert.equal(
    describe('E_ZERO', [action('E_ZERO', 'add', { gCost: 0 })]),
    'Thêm vào biên: g(n)=0',
  )
  assert.equal(
    describe('E_EQUAL', [action(
      'E_EQUAL',
      'keep',
      { gCost: 0.0125 },
      { gCost: 0.0125 },
      'E_OLD',
    )]),
    'Không cập nhật: 1.25 ≥ 1.25 thuộc về đường E_OLD',
  )
})

test('marks an unevaluated candidate edge as pending', () => {
  assert.match(describe('E2', []), /^Chờ xét/)
})

test('describes traversal-order traces without inventing a cost decision', () => {
  const reason = describeCandidateEdgeDecision(
    'E1',
    [action('E1', 'considered', null, null, null, null)],
  )

  assert.match(reason, /thứ tự duyệt/)
  assert.match(reason, /không dùng chi phí/)
})

test('preserves unique candidate edge ids after playback', () => {
  assert.deepEqual(
    getEvaluatedCandidateEdgeIds([
      action('E1', 'add', { gCost: 1 }),
      { type: 'frame-complete' },
      action('E2', 'keep', { gCost: 2 }),
      action('E1', 'update', { gCost: 0.5 }),
    ]),
    ['E1', 'E2'],
  )
})

test('classifies trace edges as pending, checked, or finally chosen', () => {
  const actions = [action('checked-edge', 'keep', { gCost: 3 })]

  assert.equal(getTraceEdgeState('pending-edge', actions, []), 'pending')
  assert.equal(getTraceEdgeState('checked-edge', actions, []), 'checked')
  assert.equal(
    getTraceEdgeState('chosen-edge', actions, ['chosen-edge']),
    'chosen',
  )
})

test('paints chosen edges after checked edges regardless of trace order', () => {
  const edges = [
    { edgeId: 'chosen-first', kind: 'chosen' },
    { edgeId: 'pending-last', kind: 'pending' },
    { edgeId: 'checked-last', kind: 'checked' },
    { edgeId: 'chosen-second', kind: 'chosen' },
  ]

  assert.deepEqual(
    sortTraceEdgesByPaintPriority(edges).map(({ edgeId }) => edgeId),
    ['pending-last', 'checked-last', 'chosen-first', 'chosen-second'],
  )
})
