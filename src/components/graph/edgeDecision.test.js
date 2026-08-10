import assert from 'node:assert/strict'
import test from 'node:test'

import {
  describeCandidateEdgeDecision,
  getEvaluatedCandidateEdgeIds,
  getTraceEdgeState,
} from './edgeDecision.js'

const action = (
  edgeId,
  outcome,
  newValues,
  oldValues = null,
  retainedEdgeId = null,
) => ({
  type: 'consider-edge',
  activeEdgeId: edgeId,
  outcome,
  newValues,
  oldValues,
  retainedEdgeId,
})

test('explains a retained edge with g, h, total cost, and comparison', () => {
  const actions = [
    action('e1', 'add', { gCost: 2, hCost: 3, fCost: 5 }),
    action('e2', 'add', { gCost: 4, hCost: 4, fCost: 8 }),
  ]

  const reason = describeCandidateEdgeDecision('e1', actions)

  assert.match(reason, /Thêm vào biên/)
  assert.match(reason, /g\(n\)=2, h\(n\)=3, f\(n\)=g\(n\)\+h\(n\)=5/)
  assert.match(reason, /Thấp nhất trong 2 phương án/)
})

test('explains why an edge was rejected against its retained route', () => {
  const actions = [
    action(
      'e1',
      'keep',
      { gCost: 4, hCost: 1, fCost: 5 },
      { gCost: 2, hCost: 1, fCost: 3 },
      'e0',
    ),
    action('e2', 'add', { gCost: 2, hCost: 2, fCost: 4 }),
  ]

  const reason = describeCandidateEdgeDecision('e1', actions)

  assert.match(reason, /Không cập nhật/)
  assert.match(
    reason,
    /5 ≥ 3 thuộc về đường e0/,
  )
  assert.match(reason, /1\/2 phương án thấp hơn/)
  assert.match(reason, /tốt nhất: e2=4/)
})

test('marks an unevaluated candidate edge as pending', () => {
  assert.match(describeCandidateEdgeDecision('e2', []), /^Chờ xét/)
})

test('describes traversal-order traces without inventing a cost decision', () => {
  const reason = describeCandidateEdgeDecision(
    'e1',
    [action('e1', 'considered', null)],
  )

  assert.match(reason, /thứ tự duyệt/)
  assert.match(reason, /không dùng chi phí/)
})

test('preserves unique candidate edge ids after playback', () => {
  assert.deepEqual(
    getEvaluatedCandidateEdgeIds([
      action('e1', 'add', { gCost: 1 }),
      { type: 'frame-complete' },
      action('e2', 'keep', { gCost: 2 }),
      action('e1', 'update', { gCost: 0.5 }),
    ]),
    ['e1', 'e2'],
  )
})

test('compares repeated edges only with options from the same expansion', () => {
  const actions = [
    { ...action('old', 'add', { fCost: 1 }), frameIndex: 0, actionIndex: 1 },
    { ...action('e1', 'add', { fCost: 5 }), frameIndex: 1, actionIndex: 3 },
    { ...action('e2', 'add', { fCost: 6 }), frameIndex: 1, actionIndex: 4 },
  ]

  const reason = describeCandidateEdgeDecision('e1', actions)
  assert.match(reason, /Thấp nhất trong 2 phương án/)
  assert.doesNotMatch(reason, /cạnh old/)
})

test('classifies trace edges as pending, checked, or finally chosen', () => {
  const actions = [action('checked-edge', 'keep', { fCost: 3 })]

  assert.equal(getTraceEdgeState('pending-edge', actions, []), 'pending')
  assert.equal(getTraceEdgeState('checked-edge', actions, []), 'checked')
  assert.equal(
    getTraceEdgeState('chosen-edge', actions, ['chosen-edge']),
    'chosen',
  )
})
