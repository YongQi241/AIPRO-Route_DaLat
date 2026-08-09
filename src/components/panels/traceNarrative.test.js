import assert from 'node:assert/strict'
import test from 'node:test'
import { describeTraceAction } from './traceNarrative.js'

const names = new Map([
  ['A', 'Market'],
  ['B', 'Lake'],
  ['C', 'Station'],
])

test('explains A* expansion values in human terms', () => {
  const event = describeTraceAction({
    type: 'expand',
    currentNodeId: 'A',
    currentValues: { gCost: 2, hCost: 3, fCost: 5 },
    selectionRule: 'lowest_f_cost',
    candidateEdgeIds: ['E1'],
  }, [], { algorithm: 'A*', locationNames: names })

  assert.match(event.title, /Market \(A\)/)
  assert.match(event.detail, /lowest estimated total f\(n\)/)
  assert.match(event.detail, /g\(n\)=2, the accumulated cost/)
  assert.match(event.detail, /h\(n\)=3, the estimated remaining cost/)
})

test('distinguishes a local scenario edge cost from cumulative search cost', () => {
  const action = {
    type: 'consider-edge', frameIndex: 0, actionIndex: 1,
    activeEdgeId: 'E1', currentNodeId: 'A', activeNeighborId: 'B',
    outcome: 'add', newValues: { gCost: 7 },
  }
  const event = describeTraceAction(action, [action], {
    locationNames: names,
    edgeCostDetails: { E1: { route_cost: 2.5 } },
  })

  assert.match(event.title, /Market \(A\) → Lake \(B\)/)
  assert.match(event.detail, /local scenario-dependent edge cost is 2.5/)
  assert.match(event.detail, /g\(n\).*cumulative/)
})

test('summarizes frontier state with readable location names', () => {
  const event = describeTraceAction({
    type: 'frame-complete', currentNodeId: 'A', selectionRule: 'fifo_queue',
    frontierNodeIds: ['B', 'C'], visitedNodeIds: ['A'],
  }, [], { algorithm: 'BFS', locationNames: names })

  assert.match(event.detail, /Lake \(B\), Station \(C\)/)
  assert.match(event.detail, /not part of the final route/)
})

test('explains the complete nearest-neighbor comparison', () => {
  const event = describeTraceAction({
    type: 'frame-complete', currentNodeId: 'A',
    selectionRule: 'lowest_candidate_score', selectedNodeId: 'B',
    selectedScore: 4, frontierNodeIds: ['B', 'C'], visitedNodeIds: [],
  }, [], { algorithm: 'Nearest Neighbor', locationNames: names })

  assert.match(event.title, /Lake \(B\)/)
  assert.match(event.detail, /lowest reachable route score \(4\)/)
  assert.match(event.detail, /reconsidered from this new stop/)
})
