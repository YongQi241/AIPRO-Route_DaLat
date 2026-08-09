export function scenarioCostDataMatches(data, selection) {
  return (
    data?.scenario_id === selection?.scenarioId &&
    data?.optimization === selection?.optimization
  )
}

export function selectActiveScenarioCostData(
  liveData,
  routeResult,
  selection,
) {
  if (scenarioCostDataMatches(liveData, selection)) return liveData
  if (scenarioCostDataMatches(routeResult, selection)) return routeResult
  return null
}
