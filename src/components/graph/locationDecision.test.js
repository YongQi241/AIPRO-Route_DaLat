import assert from 'node:assert/strict'
import test from 'node:test'

import { describeLocationDecision } from './locationDecision.js'

const candidates = [
  { nodeId: 'B', reachable: true, score: 2 },
  { nodeId: 'C', reachable: true, score: 5 },
  { nodeId: 'D', reachable: false, score: null },
]

test('explains why Nearest Neighbor selected the lowest score', () => {
  assert.match(
    describeLocationDecision({
      outcome: 'selected',
      newValues: { priority: 2 },
      selectionCandidates: candidates,
    }),
    /lowest reachable score among 2 options/,
  )
})

test('compares a rejected location with the selected option', () => {
  assert.equal(
    describeLocationDecision({
      outcome: 'rejected',
      newValues: { priority: 5 },
      selectedNodeId: 'B',
      selectedScore: 2,
      selectionCandidates: candidates,
    }),
    'Not selected because its score 5 is higher than B at 2 by 3.',
  )
})

test('explains an unreachable location', () => {
  assert.match(
    describeLocationDecision({ outcome: 'unreachable' }),
    /no directed route/,
  )
})
