function getTraceNodeId(value) {
  if (value == null) return ''
  if (typeof value === 'object') {
    return String(value.node ?? value.node_id ?? value.id ?? '')
  }
  return String(value)
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
    currentNodeId: visitedOrder[safeStep] ?? null,
    frontierNodeIds: [],
    visitedNodeIds: visitedOrder.slice(0, safeStep),
    totalSteps: visitedOrder.length,
  }
}

export function getConfirmedRoutePrefix(result, frame) {
  const pathNodes = result?.path_nodes ?? []
  const pathEdges = result?.path_edges ?? []
  if (result?.status !== 'success' || pathNodes.length === 0) {
    return {
      visiblePathNodes: [],
      visiblePathEdges: [],
      latestConfirmedNodeId: null,
    }
  }

  const reachedNodes = new Set(frame?.visitedNodeIds ?? [])
  if (frame?.currentNodeId) reachedNodes.add(frame.currentNodeId)

  const visiblePathNodes = [String(pathNodes[0])]
  const visiblePathEdges = []

  for (let index = 1; index < pathNodes.length; index += 1) {
    const nodeId = String(pathNodes[index])
    if (!reachedNodes.has(nodeId)) break

    const edgeId = pathEdges[index - 1]
    if (edgeId == null) break

    visiblePathNodes.push(nodeId)
    visiblePathEdges.push(String(edgeId))
  }

  return {
    visiblePathNodes,
    visiblePathEdges,
    latestConfirmedNodeId:
      visiblePathNodes.length > 1
        ? visiblePathNodes[visiblePathNodes.length - 1]
        : null,
  }
}

export function getActiveSearchBranchEdgeIds(
  result,
  currentStep,
  edgeFeatures = [],
) {
  const frames = result?.frontier_steps ?? []
  if (result?.status !== 'success' || frames.length === 0) return []

  const safeStep = Math.max(0, Math.min(currentStep, frames.length - 1))
  const startNode = getTraceNodeId(
    result.start_node || frames[0]?.current,
  )
  const currentNode = getTraceNodeId(frames[safeStep]?.current)
  if (!startNode || !currentNode || currentNode === startNode) return []

  const discovered = new Set([startNode])
  const parentByNode = new Map()

  for (let index = 0; index <= safeStep; index += 1) {
    const frame = frames[index] ?? {}
    const parentNode = getTraceNodeId(frame.current)
    if (!parentNode) continue

    discovered.add(parentNode)
    for (const frontierNodeValue of frame.frontier ?? []) {
      const frontierNode = getTraceNodeId(frontierNodeValue)
      if (!frontierNode || discovered.has(frontierNode)) continue

      parentByNode.set(frontierNode, parentNode)
      discovered.add(frontierNode)
    }
  }

  const branchPairs = []
  const branchNodes = new Set([currentNode])
  let cursor = currentNode

  while (cursor !== startNode) {
    const parent = parentByNode.get(cursor)
    if (!parent || branchNodes.has(parent)) return []

    branchPairs.unshift([parent, cursor])
    branchNodes.add(parent)
    cursor = parent
  }

  const edgeByPair = new Map()
  for (const feature of edgeFeatures) {
    const properties = feature?.properties ?? {}
    if (
      properties.edge_id == null ||
      properties.from_node == null ||
      properties.to_node == null
    ) {
      continue
    }

    const key = `${String(properties.from_node)}\u0000${String(properties.to_node)}`
    if (!edgeByPair.has(key)) edgeByPair.set(key, String(properties.edge_id))
  }

  const edgeIds = []
  for (const [fromNode, toNode] of branchPairs) {
    const edgeId = edgeByPair.get(`${fromNode}\u0000${toNode}`)
    if (!edgeId) return []
    edgeIds.push(edgeId)
  }

  return edgeIds
}
