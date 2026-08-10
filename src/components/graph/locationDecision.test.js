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
    /điểm 2 thấp nhất trong 2 phương án/,
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
    'Loại: 5 > 2 của nút B (chênh 3).',
  )
})

test('explains an unreachable location', () => {
  assert.match(
    describeLocationDecision({ outcome: 'unreachable' }),
    /không có tuyến có hướng/,
  )
})
