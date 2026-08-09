import { describeCandidateEdgeDecision } from '../graph/edgeDecision.js'
import { describeLocationDecision } from '../graph/locationDecision.js'

function toNumber(value) {
  const number = Number(value)
  return value == null || value === '' || !Number.isFinite(number)
    ? null
    : number
}

function number(value) {
  return toNumber(value)?.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  }) ?? 'not recorded'
}

function locationLabel(nodeId, locationNames) {
  if (nodeId == null) return 'an unknown location'
  const id = String(nodeId)
  const name = locationNames?.get?.(id)
  return name && name !== id ? `${name} (${id})` : id
}

function listLocations(nodeIds, locationNames) {
  return nodeIds.map((nodeId) => locationLabel(nodeId, locationNames)).join(', ')
}

function expansionReason(action, algorithm) {
  const values = action.currentValues ?? {}
  const normalizedAlgorithm = String(algorithm ?? '').toLowerCase()
  const rule = action.selectionRule

  if (rule === 'lowest_f_cost' || normalizedAlgorithm.includes('a*')) {
    return `A* selected it from the frontier because it had the lowest estimated total f(n). Its recorded values are g(n)=${number(values.gCost)}, the accumulated cost from the start; h(n)=${number(values.hCost)}, the estimated remaining cost; and f(n)=g(n)+h(n)=${number(values.fCost)}.`
  }
  if (
    rule === 'lowest_g_cost' ||
    normalizedAlgorithm.includes('dijkstra') ||
    normalizedAlgorithm.includes('uniform-cost') ||
    normalizedAlgorithm === 'ucs'
  ) {
    return `The search selected it because its known cumulative cost g(n)=${number(values.gCost ?? values.priority)} was the smallest unsettled value in the frontier. With nonnegative edge costs, no later route can improve this settled value.`
  }
  if (rule === 'lowest_h_cost' || normalizedAlgorithm.includes('greedy')) {
    return `Greedy Best-First selected it because h(n)=${number(values.hCost ?? values.priority)} was the smallest estimated remaining cost in the frontier. It deliberately ignores the cost already travelled, so this choice is promising but not guaranteed to be optimal.`
  }
  if (
    rule === 'lowest_neighbor_h_cost' ||
    normalizedAlgorithm.includes('hill')
  ) {
    return `Hill Climbing is examining the end of its current branch, where h(n)=${number(values.hCost ?? values.priority)}. It will move to the unvisited outgoing neighbor with the smallest heuristic estimate; if none is available, it backtracks.`
  }
  if (rule === 'fifo_queue' || normalizedAlgorithm.includes('breadth') || normalizedAlgorithm === 'bfs') {
    return 'Breadth-First Search removed this node from the front of its FIFO queue. That level-by-level order guarantees the fewest-edge route, but it does not compare distance, time, risk, or scenario cost.'
  }
  if (rule === 'lifo_stack' || normalizedAlgorithm.includes('depth') || normalizedAlgorithm === 'dfs') {
    return 'Depth-First Search removed this node from the top of its LIFO stack. It follows the newest branch as deeply as possible and backtracks only when that branch cannot continue.'
  }
  return 'The algorithm selected this node as the next item in its frontier according to its traversal rule.'
}

function candidateSummary(action) {
  const count = action.candidateEdgeIds?.length ?? 0
  if (count === 0) return 'There are no outgoing candidate roads to evaluate here.'
  return `${count} outgoing road${count === 1 ? '' : 's'} will now be checked: ${action.candidateEdgeIds.join(', ')}.`
}

function localEdgeCost(action, edgeCostDetails) {
  const detail = edgeCostDetails?.[action.activeEdgeId]
  if (!detail) return ''
  if (detail.closed) {
    return ' This road is closed in the active scenario, so it cannot form a usable route.'
  }
  if (toNumber(detail.route_cost) == null) return ''
  return ` Its local scenario-dependent edge cost is ${number(detail.route_cost)}. Any g(n) or f(n) shown above is cumulative for the complete route to the neighboring node, not just this road.`
}

export function describeTraceAction(action, actions = [], context = {}) {
  const { algorithm, edgeCostDetails, locationNames } = context
  const current = locationLabel(action.currentNodeId, locationNames)
  const neighbor = locationLabel(action.activeNeighborId, locationNames)

  if (action.type === 'select-next-location') {
    const count = action.selectionCandidates?.length ?? 0
    return {
      title: `Choose the next stop from ${current}`,
      detail: `Nearest Neighbor compares all ${count} remaining requested location${count === 1 ? '' : 's'}. It calculates a directed route from the current stop to each candidate using the active scenario and optimization, then chooses the lowest reachable total score. Unreachable locations are excluded from this decision.`,
    }
  }

  if (action.type === 'expand') {
    return {
      title: `Expand ${current}`,
      detail: `${expansionReason(action, algorithm)} ${candidateSummary(action)}`,
    }
  }

  if (action.type === 'consider-edge') {
    const evaluatedAtThisPoint = actions.filter(
      (candidate) =>
        candidate.type === 'consider-edge' &&
        candidate.frameIndex === action.frameIndex &&
        candidate.actionIndex <= action.actionIndex,
    )
    const decision = describeCandidateEdgeDecision(
      action.activeEdgeId,
      evaluatedAtThisPoint,
    )
    return {
      title: `Check road ${action.activeEdgeId}: ${current} → ${neighbor}`,
      detail: `${decision}${localEdgeCost(action, edgeCostDetails)}`,
    }
  }

  if (action.type === 'consider-location') {
    return {
      title: `Compare ${neighbor}`,
      detail: describeLocationDecision(action),
    }
  }

  if (action.type === 'frame-complete') {
    if (action.selectionRule === 'lowest_candidate_score') {
      const selected = locationLabel(action.selectedNodeId, locationNames)
      return {
        title: `Choose ${selected} as the next stop`,
        detail: `After every remaining location was compared, ${selected} had the lowest reachable route score (${number(action.selectedScore)}). The other reachable locations remain unvisited and will be reconsidered from this new stop.`,
      }
    }

    const frontier = action.frontierNodeIds ?? []
    const frontierText = frontier.length > 0
      ? `The frontier now holds ${frontier.length} waiting node${frontier.length === 1 ? '' : 's'}: ${listLocations(frontier, locationNames)}.`
      : 'The frontier is now empty.'
    const visitedCount = action.visitedNodeIds?.length ?? 0
    return {
      title: `Finish expanding ${current}`,
      detail: `${frontierText} ${visitedCount} node${visitedCount === 1 ? ' has' : 's have'} been visited so far. Frontier entries are possible next steps; they are not part of the final route unless the completed search selects them.`,
    }
  }

  return {
    title: 'Search playback complete',
    detail: 'All recorded decisions have been replayed. The final route can now be displayed.',
  }
}
