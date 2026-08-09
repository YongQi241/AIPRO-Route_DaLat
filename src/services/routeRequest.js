export const MULTI_LOCATION_ALGORITHMS = new Set([
  'nearest_neighbor',
  'brute_force_tsp',
])

export function isMultiLocationAlgorithm(algorithm) {
  return MULTI_LOCATION_ALGORITHMS.has(algorithm)
}

export function createRouteRequest(routeSelection, selectedAlgorithm) {
  const isMultiLocation = isMultiLocationAlgorithm(selectedAlgorithm)
  const intermediateNodes = Array.isArray(routeSelection.visitNodes)
    ? routeSelection.visitNodes
    : []

  return {
    start_node: routeSelection.startNode,
    goal_node: routeSelection.goalNode,
    visit_nodes: isMultiLocation
      ? [...new Set([...intermediateNodes, routeSelection.goalNode])].filter(
          Boolean,
        )
      : [],
    algorithm: selectedAlgorithm,
    scenario_id: routeSelection.scenarioId,
    optimization: routeSelection.optimization,
  }
}
