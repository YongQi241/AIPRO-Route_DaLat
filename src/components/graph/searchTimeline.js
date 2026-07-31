export function getSearchAnimationFrame(result, currentStep) {
  const frontierSteps = result?.frontier_steps ?? []

  if (frontierSteps.length > 0) {
    const safeStep = Math.max(
      0,
      Math.min(currentStep, frontierSteps.length - 1),
    )
    const frame = frontierSteps[safeStep] ?? {}

    return {
      currentNodeId: frame.current ?? null,
      frontierNodeIds: frame.frontier ?? [],
      visitedNodeIds: frame.visited ?? [],
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
