import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSearchActionTimeline,
  getCompletedVisitedNodeIds,
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
  assert.equal(bActions[0].retainedEdgeId, 'E_AC')
  assert.ok(!bActions.some((action) => action.activeEdgeId === 'E_CB'))
})

test('keeps string-only frontier entries without emitting UNKNOWN', () => {
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

  assert.equal(bToC.outcome, 'keep')
  assert.ok(
    !timeline.some((action) => action.outcome === 'unknown'),
  )
})

test('lets exhaustive Dijkstra expand outgoing edges after reaching its goal', () => {
  const timeline = buildSearchActionTimeline(
    {
      status: 'success',
      start_node: 'A',
      goal_node: 'B',
      path_nodes: ['A', 'B'],
      path_edges: ['E_AB'],
      frontier_steps: [
        {
          current: 'A',
          frontier: [{ node: 'B', g_cost: 1 }],
          visited: ['A'],
          selection_rule: 'lowest_g_cost',
        },
        {
          current: 'B',
          expands_goal: true,
          frontier: [{ node: 'C', g_cost: 2 }],
          visited: ['A', 'B'],
          selection_rule: 'lowest_g_cost',
          relaxations: [
            {
              edge_id: 'E_BC',
              node: 'C',
              outcome: 'add',
              previous_values: null,
              candidate_values: { g_cost: 2, priority: 2 },
            },
          ],
        },
      ],
    },
    edges,
  )

  assert.ok(
    timeline.some(
      (action) =>
        action.type === 'consider-edge' && action.activeEdgeId === 'E_BC',
    ),
  )
})

test('uses exact A* relaxation g, h, and f costs when provided', () => {
  const timeline = buildSearchActionTimeline(
    {
      status: 'success',
      start_node: 'A',
      goal_node: 'D',
      frontier_steps: [
        {
          current: 'A',
          current_values: { g_cost: 0, h_cost: 4, f_cost: 4 },
          selection_rule: 'lowest_f_cost',
          frontier: [{ node: 'B', g_cost: 2, h_cost: 1, f_cost: 3 }],
          visited: ['A'],
          relaxations: [
            {
              edge_id: 'E_AB',
              node: 'B',
              outcome: 'add',
              previous_values: null,
              candidate_values: { g_cost: 2, h_cost: 1, f_cost: 3 },
            },
          ],
        },
      ],
    },
    edges,
  )

  const expand = timeline.find((action) => action.type === 'expand')
  const relaxation = timeline.find(
    (action) => action.type === 'consider-edge' && action.activeEdgeId === 'E_AB',
  )

  assert.equal(expand.selectionRule, 'lowest_f_cost')
  assert.deepEqual(expand.currentValues, {
    nodeId: 'A',
    gCost: 0,
    hCost: 4,
    fCost: 4,
    priority: null,
  })
  assert.deepEqual(relaxation.newValues, {
    nodeId: 'B',
    gCost: 2,
    hCost: 1,
    fCost: 3,
    priority: null,
  })
})

test('normalizes legacy Greedy current_h for readable explanations', () => {
  const timeline = buildSearchActionTimeline({
    status: 'success',
    frontier_steps: [{
      current: 'A', current_h: 3.25, frontier: [], visited: ['A'],
    }],
  }, edges)

  assert.deepEqual(timeline[0].currentValues, {
    nodeId: 'A', gCost: null, hCost: 3.25, fCost: null, priority: 3.25,
  })
})

test('uses CONSIDERED for visited-order-only traces', () => {
  const timeline = buildSearchActionTimeline(
    {
      status: 'success',
      start_node: 'A',
      goal_node: 'D',
      visited_order: ['A', 'B', 'D'],
    },
    edges,
  )

  assert.ok(
    timeline
      .filter((action) => action.type === 'consider-edge')
      .every((action) => action.outcome === 'considered'),
  )
})

test('turns Nearest Neighbor candidate scores into comparison actions', () => {
  const timeline = buildSearchActionTimeline({
    status: 'success',
    algorithm: 'Nearest Neighbor',
    frontier_steps: [
      {
        current: 'A',
        candidates: [
          { node: 'B', reachable: true, score: 2 },
          { node: 'C', reachable: true, score: 5 },
          { node: 'D', reachable: false, score: null },
        ],
        selected: 'B',
        selected_score: 2,
      },
    ],
  })

  assert.equal(timeline[0].type, 'select-next-location')
  assert.deepEqual(
    timeline
      .filter(({ type }) => type === 'consider-location')
      .map(({ activeNeighborId, outcome, newValues }) => [
        activeNeighborId,
        outcome,
        newValues.priority,
      ]),
    [
      ['B', 'selected', 2],
      ['C', 'rejected', 5],
      ['D', 'unreachable', null],
    ],
  )
  assert.equal(timeline.at(-1).selectedNodeId, 'B')
  assert.equal(timeline.at(-1).selectedScore, 2)
})

test('preserves every visited node when playback completes', () => {
  assert.deepEqual(
    getCompletedVisitedNodeIds(
      { visited_order: ['A', 'B', 'D'] },
      { visitedNodeIds: ['A', 'B'] },
    ),
    ['A', 'B', 'D'],
  )
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
