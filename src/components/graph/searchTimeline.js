const EMPTY_ACTION = Object.freeze({
  actionIndex: 0,
  frameIndex: 0,
  type: 'idle',
  currentNodeId: null,
  candidateEdgeIds: [],
  activeEdgeId: null,
  activeNeighborId: null,
  outcome: null,
  oldValues: null,
  newValues: null,
  frontierNodeIds: [],
  visitedNodeIds: [],
})

function toFiniteNumber(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function normalizeTraceEntry(value) {
  if (value == null) return null

  const source = typeof value === 'object' ? value : { node: value }
  const nodeId = String(
    source.node ?? source.node_id ?? source.id ?? '',
  )
  if (!nodeId) return null

  return {
    nodeId,
    gCost: toFiniteNumber(source.g_cost ?? source.distance),
    hCost: toFiniteNumber(source.h_cost),
    fCost: toFiniteNumber(source.f_cost),
    priority: toFiniteNumber(source.priority),
  }
}

function getTraceNodeId(value) {
  return normalizeTraceEntry(value)?.nodeId ?? ''
}

function createFrontierLookup(values = []) {
  const lookup = new Map()
  values.forEach((value) => {
    const entry = normalizeTraceEntry(value)
    if (entry && !lookup.has(entry.nodeId)) lookup.set(entry.nodeId, entry)
  })
  return lookup
}

function getComparableScore(entry) {
  if (!entry) return null
  return entry.gCost ?? entry.fCost ?? entry.priority
}

function classifyRelaxation(beforeEntry, afterEntry) {
  if (!beforeEntry && afterEntry) return 'add'
  if (!beforeEntry || !afterEntry) return 'unknown'

  const oldScore = getComparableScore(beforeEntry)
  const newScore = getComparableScore(afterEntry)
  if (oldScore == null || newScore == null) return 'unknown'

  return newScore < oldScore ? 'update' : 'keep'
}

function getCandidateEdges(edgeFeatures, currentNodeId) {
  const seenIds = new Set()
  const candidates = []

  edgeFeatures.forEach((feature, index) => {
    const properties = feature?.properties ?? {}
    if (String(properties.from_node ?? '') !== currentNodeId) return

    const edgeId = String(properties.edge_id ?? index)
    const toNode = String(properties.to_node ?? '')
    if (!toNode || seenIds.has(edgeId)) return

    seenIds.add(edgeId)
    candidates.push({ edgeId, toNode })
  })

  return candidates
}

function actionBase({
  frameIndex,
  currentNodeId,
  candidates,
  frontierNodeIds,
  visitedNodeIds,
}) {
  return {
    frameIndex,
    currentNodeId,
    candidateEdgeIds: candidates.map(({ edgeId }) => edgeId),
    activeEdgeId: null,
    activeNeighborId: null,
    outcome: null,
    oldValues: null,
    newValues: null,
    frontierNodeIds,
    visitedNodeIds,
  }
}

function appendAction(actions, action) {
  actions.push({ ...action, actionIndex: actions.length })
}

function buildFrameActions({
  actions,
  frame,
  previousFrame,
  frameIndex,
  edgeFeatures,
  goalNode,
}) {
  const currentNodeId = getTraceNodeId(frame.current)
  if (!currentNodeId) return

  const isSelectionFrame =
    Array.isArray(frame.candidates) || frame.selected != null
  const candidates =
    currentNodeId === goalNode || isSelectionFrame
      ? []
      : getCandidateEdges(edgeFeatures, currentNodeId)
  const beforeLookup = createFrontierLookup(previousFrame?.frontier)
  beforeLookup.delete(currentNodeId)
  const afterLookup = createFrontierLookup(frame.frontier)
  const visitedNodeIds = (frame.visited ?? [])
    .map(getTraceNodeId)
    .filter(Boolean)
  const base = actionBase({
    frameIndex,
    currentNodeId,
    candidates,
    frontierNodeIds: [...beforeLookup.keys()],
    visitedNodeIds,
  })

  appendAction(actions, { ...base, type: 'expand' })

  const progressiveFrontier = new Map(beforeLookup)
  candidates.forEach(({ edgeId, toNode }) => {
    const beforeEntry = beforeLookup.get(toNode) ?? null
    const afterEntry = afterLookup.get(toNode) ?? null
    const outcome = classifyRelaxation(beforeEntry, afterEntry)

    if ((outcome === 'add' || outcome === 'update') && afterEntry) {
      progressiveFrontier.set(toNode, afterEntry)
    }

    appendAction(actions, {
      ...base,
      type: 'consider-edge',
      activeEdgeId: edgeId,
      activeNeighborId: toNode,
      outcome,
      oldValues: beforeEntry,
      newValues: afterEntry,
      frontierNodeIds: [...progressiveFrontier.keys()],
    })
  })

  appendAction(actions, {
    ...base,
    type: 'frame-complete',
    frontierNodeIds: [...afterLookup.keys()],
  })
}

function buildVisitedOrderActions(result, edgeFeatures) {
  const visitedOrder = result?.visited_order ?? []
  const actions = []

  visitedOrder.forEach((value, frameIndex) => {
    const currentNodeId = getTraceNodeId(value)
    if (!currentNodeId) return
    const candidates =
      currentNodeId === String(result?.goal_node ?? '')
        ? []
        : getCandidateEdges(edgeFeatures, currentNodeId)
    const base = actionBase({
      frameIndex,
      currentNodeId,
      candidates,
      frontierNodeIds: [],
      visitedNodeIds: visitedOrder
        .slice(0, frameIndex + 1)
        .map(getTraceNodeId)
        .filter(Boolean),
    })

    appendAction(actions, { ...base, type: 'expand' })
    candidates.forEach(({ edgeId, toNode }) => {
      appendAction(actions, {
        ...base,
        type: 'consider-edge',
        activeEdgeId: edgeId,
        activeNeighborId: toNode,
        outcome: 'unknown',
      })
    })
    appendAction(actions, { ...base, type: 'frame-complete' })
  })

  return actions
}

export function buildSearchActionTimeline(result, edgeFeatures = []) {
  if (result?.status !== 'success') return []

  const frames = result?.frontier_steps ?? []
  const actions = []

  if (frames.length > 0) {
    frames.forEach((frame, frameIndex) => {
      buildFrameActions({
        actions,
        frame,
        previousFrame: frames[frameIndex - 1],
        frameIndex,
        edgeFeatures,
        goalNode: String(result?.goal_node ?? ''),
      })
    })
  } else if ((result?.visited_order?.length ?? 0) > 0) {
    actions.push(...buildVisitedOrderActions(result, edgeFeatures))
    actions.forEach((action, actionIndex) => {
      action.actionIndex = actionIndex
    })
  }

  return actions
}

export function getSearchAction(timeline, currentStep) {
  if (!Array.isArray(timeline) || timeline.length === 0) return EMPTY_ACTION
  const safeStep = Math.max(0, Math.min(currentStep, timeline.length - 1))
  return timeline[safeStep]
}

export function shouldShowFinalPath(result, simulationStatus, timelineLength) {
  return (
    result?.status === 'success' &&
    (simulationStatus === 'completed' || timelineLength === 0)
  )
}

export function getSearchAnimationFrame(result, currentStep) {
  const frontierSteps = result?.frontier_steps ?? []

  if (frontierSteps.length > 0) {
    const safeStep = Math.max(
      0,
      Math.min(currentStep, frontierSteps.length - 1),
    )
    const frame = frontierSteps[safeStep] ?? {}

    return {
      currentNodeId: getTraceNodeId(frame.current) || null,
      frontierNodeIds: (frame.frontier ?? [])
        .map(getTraceNodeId)
        .filter(Boolean),
      visitedNodeIds: (frame.visited ?? [])
        .map(getTraceNodeId)
        .filter(Boolean),
      totalSteps: frontierSteps.length,
    }
  }

  const visitedOrder = result?.visited_order ?? []
  const safeStep = Math.max(0, Math.min(currentStep, visitedOrder.length - 1))

  return {
    currentNodeId: getTraceNodeId(visitedOrder[safeStep]) || null,
    frontierNodeIds: [],
    visitedNodeIds: visitedOrder.slice(0, safeStep + 1).map(getTraceNodeId),
    totalSteps: visitedOrder.length,
  }
}

export function getInferredSearchBranchEdgeIds(
  result,
  currentStep,
  edgeFeatures = [],
) {
  const frames = result?.frontier_steps ?? []
  if (result?.status !== 'success' || frames.length === 0) return []

  const safeStep = Math.max(0, Math.min(currentStep, frames.length - 1))
  const startNode = getTraceNodeId(result.start_node || frames[0]?.current)
  const currentNode = getTraceNodeId(frames[safeStep]?.current)
  if (!startNode || !currentNode || currentNode === startNode) return []

  const edgeById = createEdgeLookup(edgeFeatures)
  const currentFrame = frames[safeStep] ?? {}
  const explicitPath = currentFrame.current_path_edges ?? currentFrame.path_edges
  if (Array.isArray(explicitPath)) {
    return validateDirectedPath(explicitPath, edgeById, startNode, currentNode)
  }

  const explicitParentBranch = getExplicitParentBranch(
    frames,
    safeStep,
    edgeById,
    startNode,
    currentNode,
  )
  if (explicitParentBranch !== null) return explicitParentBranch

  const edgeByPair = createDirectedPairLookup(edgeFeatures)
  const parentByNode = inferFirstDiscoveryParents(
    frames,
    safeStep,
    startNode,
    edgeByPair,
  )
  return reconstructInferredBranch(parentByNode, startNode, currentNode)
}

export const getActiveSearchBranchEdgeIds = getInferredSearchBranchEdgeIds

function createEdgeLookup(edgeFeatures) {
  const edgeById = new Map()
  edgeFeatures.forEach((feature) => {
    const properties = feature?.properties ?? {}
    if (
      properties.edge_id == null ||
      properties.from_node == null ||
      properties.to_node == null
    ) {
      return
    }
    const edgeId = String(properties.edge_id)
    if (!edgeById.has(edgeId)) {
      edgeById.set(edgeId, {
        fromNode: String(properties.from_node),
        toNode: String(properties.to_node),
      })
    }
  })
  return edgeById
}

function createDirectedPairLookup(edgeFeatures) {
  const edgeByPair = new Map()
  edgeFeatures.forEach((feature) => {
    const properties = feature?.properties ?? {}
    if (
      properties.edge_id == null ||
      properties.from_node == null ||
      properties.to_node == null
    ) {
      return
    }
    const key = `${String(properties.from_node)}\u0000${String(properties.to_node)}`
    if (!edgeByPair.has(key)) edgeByPair.set(key, String(properties.edge_id))
  })
  return edgeByPair
}

function validateDirectedPath(edgeIds, edgeById, startNode, currentNode) {
  let cursor = startNode
  const validatedIds = []
  for (const value of edgeIds) {
    const edgeId = String(value)
    const edge = edgeById.get(edgeId)
    if (!edge || edge.fromNode !== cursor) return []
    validatedIds.push(edgeId)
    cursor = edge.toNode
  }
  return cursor === currentNode ? validatedIds : []
}

function inferFirstDiscoveryParents(frames, safeStep, startNode, edgeByPair) {
  const discovered = new Set([startNode])
  const parentByNode = new Map()
  for (let index = 0; index <= safeStep; index += 1) {
    const frame = frames[index] ?? {}
    const parentNode = getTraceNodeId(frame.current)
    if (!parentNode) continue
    discovered.add(parentNode)
    for (const value of frame.frontier ?? []) {
      const frontierNode = getTraceNodeId(value)
      if (!frontierNode || discovered.has(frontierNode)) continue
      const edgeId = edgeByPair.get(`${parentNode}\u0000${frontierNode}`)
      if (!edgeId) continue
      parentByNode.set(frontierNode, { parentNode, edgeId })
      discovered.add(frontierNode)
    }
  }
  return parentByNode
}

function reconstructInferredBranch(parentByNode, startNode, currentNode) {
  const edgeIds = []
  const branchNodes = new Set([currentNode])
  let cursor = currentNode
  while (cursor !== startNode) {
    const link = parentByNode.get(cursor)
    if (!link || branchNodes.has(link.parentNode)) return []
    edgeIds.unshift(link.edgeId)
    branchNodes.add(link.parentNode)
    cursor = link.parentNode
  }
  return edgeIds
}

function getExplicitParentBranch(
  frames,
  safeStep,
  edgeById,
  startNode,
  currentNode,
) {
  const parentByNode = new Map()
  let hasExplicitLinkage = false
  for (let index = 0; index <= safeStep; index += 1) {
    const frame = frames[index] ?? {}
    const entries = [frame.current, ...(frame.frontier ?? [])]
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue
      const nodeId = getTraceNodeId(entry)
      const parentNode = getTraceNodeId(entry.parent ?? entry.parent_node)
      const edgeId = entry.via_edge ?? entry.edge_id
      if (!nodeId || !parentNode || edgeId == null) continue
      hasExplicitLinkage = true
      const normalizedEdgeId = String(edgeId)
      const edge = edgeById.get(normalizedEdgeId)
      if (!edge || edge.fromNode !== parentNode || edge.toNode !== nodeId) {
        continue
      }
      parentByNode.set(nodeId, { parentNode, edgeId: normalizedEdgeId })
    }
  }
  if (!hasExplicitLinkage) return null
  return reconstructInferredBranch(parentByNode, startNode, currentNode)
}
