import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSearchActionTimeline,
  getSearchAction,
} from '../components/graph/searchTimeline.js'
import { SIMULATION_STATUS, useAppStore } from './useAppStore.js'

const edges = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { edge_id: 'E_AB', from_node: 'A', to_node: 'B' },
      geometry: { type: 'LineString', coordinates: [] },
    },
    {
      type: 'Feature',
      properties: { edge_id: 'E_AC', from_node: 'A', to_node: 'C' },
      geometry: { type: 'LineString', coordinates: [] },
    },
  ],
}

const result = {
  status: 'success',
  start_node: 'A',
  goal_node: 'B',
  frontier_steps: [
    {
      current: 'A',
      frontier: [
        { node: 'B', g_cost: 1 },
        { node: 'C', g_cost: 2 },
      ],
      visited: ['A'],
    },
    { current: 'B', frontier: [], visited: ['A', 'B'] },
  ],
}

test('Next and Previous move one micro-action and Reset clears playback state', () => {
  const store = useAppStore.getState()
  store.setGraphData({ nodes: { type: 'FeatureCollection', features: [] }, edges })
  store.setRouteResult(result)

  useAppStore.getState().nextAction()
  assert.equal(useAppStore.getState().simulation.currentStep, 1)
  let timeline = buildSearchActionTimeline(result, edges.features)
  assert.equal(getSearchAction(timeline, 1).activeEdgeId, 'E_AB')
  assert.equal(
    useAppStore.getState().simulation.status,
    SIMULATION_STATUS.PAUSED,
  )

  useAppStore.getState().nextAction()
  assert.equal(useAppStore.getState().simulation.currentStep, 2)
  assert.equal(getSearchAction(timeline, 2).activeEdgeId, 'E_AC')

  useAppStore.getState().previousAction()
  assert.equal(useAppStore.getState().simulation.currentStep, 1)
  assert.equal(getSearchAction(timeline, 1).activeEdgeId, 'E_AB')

  useAppStore.getState().previousAction()
  assert.equal(useAppStore.getState().simulation.currentStep, 0)

  useAppStore.getState().play()
  assert.equal(
    useAppStore.getState().simulation.status,
    SIMULATION_STATUS.PLAYING,
  )
  useAppStore.getState().resetSimulation()
  timeline = buildSearchActionTimeline(result, edges.features)
  assert.deepEqual(useAppStore.getState().simulation, {
    status: SIMULATION_STATUS.IDLE,
    speed: 1,
    currentStep: 0,
  })
  assert.equal(
    useAppStore.getState().simulation.status === SIMULATION_STATUS.IDLE
      ? null
      : getSearchAction(timeline, 0).activeEdgeId,
    null,
  )
})

test('Last reveals the result while Previous, First, and Reset preserve it', () => {
  useAppStore.getState().setRouteResult(result)
  const lastStep = buildSearchActionTimeline(result, edges.features).length - 1

  useAppStore.getState().lastAction()
  assert.equal(useAppStore.getState().simulation.currentStep, lastStep)
  assert.equal(
    useAppStore.getState().simulation.status,
    SIMULATION_STATUS.COMPLETED,
  )
  assert.equal(useAppStore.getState().hasRevealedFinalResult, true)

  useAppStore.getState().previousAction()
  assert.equal(useAppStore.getState().simulation.currentStep, lastStep - 1)
  assert.equal(useAppStore.getState().hasRevealedFinalResult, true)

  useAppStore.getState().firstAction()
  assert.equal(useAppStore.getState().simulation.currentStep, 0)
  assert.equal(
    useAppStore.getState().simulation.status,
    SIMULATION_STATUS.PAUSED,
  )
  assert.equal(useAppStore.getState().hasRevealedFinalResult, true)

  useAppStore.getState().resetSimulation()
  assert.equal(useAppStore.getState().simulation.currentStep, 0)
  assert.equal(useAppStore.getState().hasRevealedFinalResult, true)
})

test('Next and completeSimulation reveal results at completion', () => {
  useAppStore.getState().setRouteResult(result)
  const lastStep = buildSearchActionTimeline(result, edges.features).length - 1

  for (let index = 0; index < lastStep; index += 1) {
    useAppStore.getState().nextAction()
  }
  assert.equal(useAppStore.getState().simulation.currentStep, lastStep)
  assert.equal(useAppStore.getState().hasRevealedFinalResult, true)

  useAppStore.getState().setRouteResult(result)
  assert.equal(useAppStore.getState().hasRevealedFinalResult, false)
  useAppStore.getState().completeSimulation()
  assert.equal(useAppStore.getState().hasRevealedFinalResult, true)
})

test('A new request clears reveal and a successful result without trace reveals', () => {
  useAppStore.getState().setRouteResult(result)
  useAppStore.getState().lastAction()
  assert.equal(useAppStore.getState().hasRevealedFinalResult, true)

  useAppStore.getState().setRouteRequestLoading()
  assert.equal(useAppStore.getState().hasRevealedFinalResult, false)
  assert.equal(useAppStore.getState().routeResult, null)

  useAppStore.getState().setRouteResult({
    ...result,
    frontier_steps: [],
    visited_order: [],
    path_nodes: ['A', 'B'],
    path_edges: ['E_AB'],
  })
  assert.equal(useAppStore.getState().hasRevealedFinalResult, true)
})

test('clearVisitNodes removes selections when multi-location mode is unavailable', () => {
  const store = useAppStore.getState()
  store.resetRouteSelection()
  store.setRouteField('startNode', 'DL01')
  store.setRouteField('goalNode', 'DL09')
  store.addVisitNode('DL03')
  store.addVisitNode('DL08')

  assert.deepEqual(useAppStore.getState().routeSelection.visitNodes, [
    'DL03',
    'DL08',
  ])

  useAppStore.getState().clearVisitNodes()
  assert.deepEqual(useAppStore.getState().routeSelection.visitNodes, [])
})

test('comparison state never overwrites the primary route result', () => {
  const requestId = useAppStore.getState().setRouteRequestLoading()
  useAppStore.getState().setRouteResult(result, requestId)
  const primary = useAppStore.getState().routeResult
  const candidate = { ...result, optimization: 'distance', path_nodes: ['A', 'C', 'B'] }

  useAppStore.getState().setRouteComparisonResults(requestId, [
    { optimization: 'distance', result: candidate },
  ])

  assert.equal(useAppStore.getState().routeResult, primary)
  assert.equal(useAppStore.getState().routeComparison.candidates[0].result, candidate)
})

test('a new request clears comparison data and rejects a late old comparison', () => {
  const oldRequestId = useAppStore.getState().setRouteRequestLoading()
  useAppStore.getState().setRouteResult(result, oldRequestId)
  useAppStore.getState().setRouteComparisonResults(oldRequestId, [
    { optimization: 'distance', result },
  ])

  const newRequestId = useAppStore.getState().setRouteRequestLoading()
  assert.equal(useAppStore.getState().routeComparison.status, 'loading')
  assert.deepEqual(useAppStore.getState().routeComparison.candidates, [])

  useAppStore.getState().setRouteComparisonResults(oldRequestId, [
    { optimization: 'time', result },
  ])
  assert.equal(useAppStore.getState().activeRouteRequestId, newRequestId)
  assert.deepEqual(useAppStore.getState().routeComparison.candidates, [])
})

test('a comparison error preserves the successful primary result', () => {
  const requestId = useAppStore.getState().setRouteRequestLoading()
  useAppStore.getState().setRouteResult(result, requestId)
  const primary = useAppStore.getState().routeResult

  useAppStore.getState().setRouteComparisonError(requestId, 'API unavailable')

  assert.equal(useAppStore.getState().routeResult, primary)
  assert.equal(useAppStore.getState().requestState.status, 'success')
  assert.equal(useAppStore.getState().routeComparison.status, 'error')
})
