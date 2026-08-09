import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSearchActionTimeline,
  normalizeTraceEntry,
  shouldShowFinalPath,
} from './searchTimeline.js'

function edge(edgeId, fromNode, toNode) {
  return {
    type: 'Feature',
    properties: {
      edge_id: edgeId,
      from_node: fromNode,
      to_node: toNode,
    },
    geometry: { type: 'LineString', coordinates: [] },
  }
}

const edges = [
  edge('E_AB', 'A', 'B'),
  edge('E_AC', 'A', 'C'),
  edge('E_CB', 'C', 'B'),
  edge('E_BC', 'B', 'C'),
  edge('E_BD', 'B', 'D'),
]

const numericResult = {
  status: 'success',
  start_node: 'A',
  goal_node: 'D',
  path_nodes: ['A', 'B', 'D'],
  path_edges: ['E_AB', 'E_BD'],
  frontier_steps: [
    {
      current: 'A',
      frontier: [
        { node: 'B', g_cost: 1, f_cost: 1 },
        { node: 'C', g_cost: 5, f_cost: 5 },
        { node: 'D', g_cost: 2, f_cost: 2 },
      ],
      visited: ['A'],
    },
    {
      current: 'B',
      frontier: [
        { node: 'C', g_cost: 3, f_cost: 3 },
        { node: 'D', g_cost: 2, f_cost: 2 },
      ],
      visited: ['A', 'B'],
    },
  ],
}

test('normalizes string and object frontier entries without inventing scores', () => {
  assert.deepEqual(normalizeTraceEntry('DL23'), {
    nodeId: 'DL23',
    gCost: null,
    hCost: null,
    fCost: null,
    priority: null,
  })
  assert.deepEqual(normalizeTraceEntry({ node: 'DL23', g_cost: '1.25' }), {
    nodeId: 'DL23',
    gCost: 1.25,
    hCost: null,
    fCost: null,
    priority: null,
  })
})

test('keeps directed candidate order and produces ADD, UPDATE, and KEEP', () => {
  const timeline = buildSearchActionTimeline(numericResult, edges)
  const aActions = timeline.filter(
    (action) => action.type === 'consider-edge' && action.currentNodeId === 'A',
  )
  const bActions = timeline.filter(
    (action) => action.type === 'consider-edge' && action.currentNodeId === 'B',
  )

  assert.deepEqual(
    aActions.map((action) => action.activeEdgeId),
    ['E_AB', 'E_AC'],
  )
  assert.deepEqual(
    aActions.map((action) => action.outcome),
    ['add', 'add'],
  )
  assert.deepEqual(
    bActions.map((action) => [action.activeEdgeId, action.outcome]),
    [
      ['E_BC', 'update'],
      ['E_BD', 'keep'],
    ],
  )
  assert.ok(!bActions.some((action) => action.activeEdgeId === 'E_CB'))
})

test('uses UNKNOWN when string-only snapshots cannot prove a comparison', () => {
  const result = {
    status: 'success',
    start_node: 'A',
    goal_node: 'D',
    frontier_steps: [
      { current: 'A', frontier: ['B', 'C'], visited: ['A'] },
      { current: 'B', frontier: ['C', 'D'], visited: ['A', 'B'] },
    ],
  }
  const timeline = buildSearchActionTimeline(result, edges)
  const bToC = timeline.find(
    (action) => action.type === 'consider-edge' && action.activeEdgeId === 'E_BC',
  )

  assert.equal(bToC.outcome, 'unknown')
})

test('shows final route only after completion, except results without a timeline', () => {
  const timeline = buildSearchActionTimeline(numericResult, edges)
  assert.equal(shouldShowFinalPath(numericResult, 'paused', timeline.length), false)
  assert.equal(
    shouldShowFinalPath(numericResult, 'completed', timeline.length),
    true,
  )
  assert.equal(shouldShowFinalPath(numericResult, 'idle', 0), true)
  assert.deepEqual(buildSearchActionTimeline({ status: 'success' }, edges), [])
})
