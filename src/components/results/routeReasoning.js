import { buildSearchActionTimeline } from '../graph/searchTimeline.js'

const OBJECTIVES = {
  distance_km: ['Distance', 'total_distance_km', 'km'],
  adjusted_time_min: ['Travel time', 'total_time_min', 'min'],
  route_cost: ['Scenario cost', 'total_cost', ''],
  risk: ['Risk', 'total_risk', ''],
  edge_count: ['Road count', 'path_edge_count', 'roads'],
  heuristic_only: ['Heuristic guidance', null, ''],
}

function finite(value) {
  const number = Number(value)
  return value == null || value === '' || !Number.isFinite(number)
    ? null
    : number
}

function nodeLabel(nodeId, names) {
  const id = String(nodeId ?? '')
  const name = names?.get?.(id)
  return name && name !== id ? `${name} (${id})` : id
}

function algorithmMethod(result) {
  const algorithm = String(result?.algorithm ?? '').toLowerCase()
  if (algorithm.includes('a*')) {
    return 'A* ranked frontier nodes by f(n)=g(n)+h(n): accumulated route cost plus the estimated remaining cost. The lowest f(n) was expanded first, while a better g(n) could update an already discovered node.'
  }
  if (algorithm.includes('dijkstra') || algorithm === 'ucs') {
    return 'The search ranked frontier nodes by cumulative g(n). It settled the smallest known value first and retained a new route to a node only when that route lowered its recorded cumulative cost.'
  }
  if (algorithm.includes('breadth') || algorithm === 'bfs') {
    return 'Breadth-First Search used a FIFO queue and compared routes by number of roads. It guarantees the fewest-edge route, but distance, time, risk, and scenario cost do not control its expansion order.'
  }
  if (algorithm.includes('depth') || algorithm === 'dfs') {
    return 'Depth-First Search used a LIFO stack and followed the newest branch until it reached a dead end or the destination. The first feasible route depends on directed neighbor order, not on route cost.'
  }
  if (algorithm.includes('greedy')) {
    return 'Greedy Best-First ranked nodes only by h(n), the estimated cost remaining to the destination. Cost already travelled was deliberately excluded, which can reduce exploration but can miss a cheaper complete route.'
  }
  if (algorithm.includes('hill')) {
    return 'Hill Climbing chose the unvisited outgoing neighbor with the smallest h(n). This variant can accept an uphill escape and backtrack at dead ends, but its decisions remain local rather than globally optimal.'
  }
  if (algorithm.includes('nearest')) {
    return 'Nearest Neighbor ran a directed Dijkstra search to every remaining requested stop, chose the lowest reachable score, moved there, and repeated. Each choice is locally best from the current stop; the combined visiting order is approximate.'
  }
  if (algorithm.includes('brute')) {
    return 'Brute Force TSP enumerated every feasible order of the requested stops, summed the selected objective over every connecting leg, and retained the complete order with the smallest total.'
  }
  return 'The route was produced according to the selected algorithm’s frontier and traversal rules.'
}

function objective(result) {
  const definition = OBJECTIVES[result?.weight_used] ?? [
    result?.optimization ?? 'Selected criterion',
    'total_cost',
    '',
  ]
  const [label, metricKey, unit] = definition
  const recorded = finite(result?.objective_value)
  const metric = metricKey ? finite(result?.metrics?.[metricKey]) : null
  return { label, value: recorded ?? metric, unit }
}

function traceStatistics(result, edgeFeatures) {
  const actions = buildSearchActionTimeline(result, edgeFeatures)
  const count = (type, outcome = null) => actions.filter(
    (action) => action.type === type && (!outcome || action.outcome === outcome),
  ).length
  const frontierSizes = actions
    .filter(({ type }) => type === 'frame-complete')
    .map(({ frontierNodeIds }) => frontierNodeIds.length)

  return {
    recordedActions: actions.length,
    expansions: count('expand'),
    edgeChecks: count('consider-edge'),
    added: count('consider-edge', 'add'),
    improved: count('consider-edge', 'update'),
    retainedExisting: count('consider-edge', 'keep'),
    locationComparisons: count('consider-location'),
    unreachableLocations: count('consider-location', 'unreachable'),
    peakFrontier: frontierSizes.length ? Math.max(...frontierSizes) : 0,
  }
}

function selectedSegments(result, names) {
  return (result?.segments ?? []).map((segment, index) => ({
    index: index + 1,
    edgeId: String(segment.edge_id),
    from: nodeLabel(segment.from_node, names),
    to: nodeLabel(segment.to_node, names),
    distance: finite(segment.distance_km),
    time: finite(segment.adjusted_time_min),
    cost: finite(segment.route_cost),
    congestion: finite(segment.congestion_level),
    risk: finite(segment.risk),
    detail: result?.edge_cost_details?.[String(segment.edge_id)] ?? null,
  }))
}

function formulaContributions(result) {
  const totals = { distance: 0, time: 0, congestion: 0, risk: 0 }
  let available = false
  for (const edgeId of result?.path_edges ?? []) {
    const contributions = result?.edge_cost_details?.[String(edgeId)]?.contributions
    if (!contributions) continue
    available = true
    Object.keys(totals).forEach((key) => {
      totals[key] += finite(contributions[key]) ?? 0
    })
  }
  return available ? totals : null
}

function selectionRounds(result, names) {
  return (result?.selection_steps ?? result?.frontier_steps ?? [])
    .filter((step) => Array.isArray(step?.candidates))
    .map((step, index) => ({
      index: index + 1,
      from: nodeLabel(step.current, names),
      selected: nodeLabel(step.selected, names),
      selectedScore: finite(step.selected_score),
      candidates: step.candidates.map((candidate) => ({
        node: nodeLabel(candidate.node, names),
        reachable: candidate.reachable !== false,
        score: finite(candidate.score),
        selected: String(candidate.node) === String(step.selected),
      })),
    }))
}

export function buildRouteReasoning(result, names, edgeFeatures = []) {
  if (!result) return null
  const path = (result.path_nodes ?? []).map((node) => nodeLabel(node, names))
  const metrics = result.metrics ?? {}
  const permutationsEvaluated = finite(metrics.permutations_evaluated)
  const permutationsPossible = finite(metrics.permutations_possible)

  return {
    status: result.status,
    path,
    method: algorithmMethod(result),
    objective: objective(result),
    figures: [
      { label: 'Distance', value: finite(metrics.total_distance_km), unit: 'km' },
      { label: 'Travel time', value: finite(metrics.total_time_min), unit: 'min' },
      { label: 'Scenario cost', value: finite(metrics.total_cost), unit: '' },
      { label: 'Total risk', value: finite(metrics.total_risk), unit: '' },
      { label: 'Roads selected', value: finite(metrics.path_edge_count), unit: '' },
      { label: 'Nodes explored', value: finite(metrics.explored_nodes), unit: '' },
      { label: 'Processing time', value: finite(metrics.processing_time_ms), unit: 'ms' },
    ].filter(({ value }) => value != null),
    trace: traceStatistics(result, edgeFeatures),
    segments: selectedSegments(result, names),
    formula: result.edge_cost_formula ?? null,
    contributions: formulaContributions(result),
    selectionRounds: selectionRounds(result, names),
    permutations: permutationsEvaluated == null && permutationsPossible == null
      ? null
      : { evaluated: permutationsEvaluated, possible: permutationsPossible },
  }
}
