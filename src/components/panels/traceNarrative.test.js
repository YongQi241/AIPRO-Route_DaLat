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
    currentValues: { gCost: 0.02, hCost: 0.03, fCost: 0.05 },
    selectionRule: 'lowest_f_cost',
    candidateEdgeIds: ['E1'],
  }, [], { algorithm: 'A*', locationNames: names })

  assert.match(event.title, /A/)
  assert.match(event.detail, /f\(n\)=5 nhỏ nhất/)
  assert.match(event.detail, /g=2, h=3/)
})

test('explains Dijkstra and UCS expansion with only the smallest g(n)', () => {
  for (const algorithm of ['Dijkstra', 'UCS', 'Uniform-Cost Search']) {
    const event = describeTraceAction({
      type: 'expand',
      currentNodeId: 'A',
      currentValues: { gCost: 0.02, hCost: 0.03, fCost: 0.05 },
      selectionRule: 'lowest_g_cost',
      candidateEdgeIds: ['E1'],
    }, [], { algorithm, locationNames: names })

    assert.match(event.detail, /Chọn vì g\(n\)=2 nhỏ nhất trên biên/)
    assert.doesNotMatch(event.detail, /h\(n\)|f\(n\)/)
  }
})

test('distinguishes a local scenario edge cost from cumulative search cost', () => {
  const action = {
    type: 'consider-edge', frameIndex: 0, actionIndex: 1,
    activeEdgeId: 'E1', currentNodeId: 'A', activeNeighborId: 'B',
    outcome: 'add', newValues: { gCost: 0.07 },
    selectionRule: 'lowest_g_cost',
  }
  const event = describeTraceAction(action, [action], {
    algorithm: 'Dijkstra',
    locationNames: names,
    edgeCostDetails: { E1: { route_cost: 2.5 } },
  })

  assert.match(event.title, /A → B/)
  assert.match(event.detail, /Chi phí cạnh: 250/)
  assert.match(event.detail, /g\(n\) là chi phí tích lũy/)
  assert.doesNotMatch(event.detail, /f\(n\)/)
})

test('summarizes frontier state with readable location names', () => {
  const event = describeTraceAction({
    type: 'frame-complete', currentNodeId: 'A', selectionRule: 'fifo_queue',
    frontierNodeIds: ['B', 'C'], visitedNodeIds: ['A'],
  }, [], { algorithm: 'BFS', locationNames: names })

  assert.match(event.detail, /B, C/)
  assert.match(event.detail, /Đã thăm 1 nút/)
})

test('explains the complete nearest-neighbor comparison', () => {
  const event = describeTraceAction({
    type: 'frame-complete', currentNodeId: 'A',
    selectionRule: 'lowest_candidate_score', selectedNodeId: 'B',
    selectedScore: 4, frontierNodeIds: ['B', 'C'], visitedNodeIds: [],
  }, [], { algorithm: 'Nearest Neighbor', locationNames: names })

  assert.match(event.title, /B/)
  assert.match(event.detail, /điểm thấp nhất 4/)
})
