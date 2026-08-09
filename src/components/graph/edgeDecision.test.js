import assert from 'node:assert/strict'
import test from 'node:test'

import {
  describeCandidateEdgeDecision,
  getEvaluatedCandidateEdgeIds,
  getTraceEdgeState,
} from './edgeDecision.js'

const action = (edgeId, outcome, newValues, oldValues = null) => ({
  type: 'consider-edge',
  activeEdgeId: edgeId,
  outcome,
  newValues,
  oldValues,
})

test('explains a retained edge with g, h, total cost, and comparison', () => {
  const actions = [
    action('e1', 'add', { gCost: 2, hCost: 3, fCost: 5 }),
    action('e2', 'add', { gCost: 4, hCost: 4, fCost: 8 }),
  ]

  const reason = describeCandidateEdgeDecision('e1', actions)

  assert.match(reason, /Checked and retained as a new frontier option/)
  assert.match(reason, /g\(n\)=2, h\(n\)=3, f\(n\)=g\(n\)\+h\(n\)=5/)
  assert.match(reason, /lowest cost among 2 evaluated options/)
})

test('explains why an edge was rejected against its retained route', () => {
  const actions = [
    action(
      'e1',
      'keep',
      { gCost: 4, hCost: 1, fCost: 5 },
      { gCost: 2, hCost: 1, fCost: 3 },
    ),
    action('e2', 'add', { gCost: 2, hCost: 2, fCost: 4 }),
  ]

  const reason = describeCandidateEdgeDecision('e1', actions)

  assert.match(reason, /Not chosen as an improvement/)
  assert.match(reason, /candidate total 5 is not lower than the retained 3/)
  assert.match(reason, /1 of 2 evaluated options cost less/)
  assert.match(reason, /edge e2 has the lowest cost, 4/)
})

test('marks an unevaluated candidate edge as pending', () => {
  assert.match(describeCandidateEdgeDecision('e2', []), /^Pending:/)
})

test('describes traversal-order traces without inventing a cost decision', () => {
  const reason = describeCandidateEdgeDecision(
    'e1',
    [action('e1', 'considered', null)],
  )

  assert.match(reason, /traversal order/)
  assert.match(reason, /does not use cost to select/)
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
  assert.match(reason, /lowest cost among 2 evaluated options/)
  assert.doesNotMatch(reason, /edge old/)
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
