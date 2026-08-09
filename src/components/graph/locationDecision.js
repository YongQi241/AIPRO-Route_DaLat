function toFiniteNumber(value) {
  const number = Number(value)
  return value == null || value === '' || !Number.isFinite(number)
    ? null
    : number
}

function formatNumber(value) {
  return toFiniteNumber(value)?.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  }) ?? 'unknown'
}

export function describeLocationDecision(action) {
  const score = toFiniteNumber(action?.newValues?.priority)
  const selectedScore = toFiniteNumber(action?.selectedScore)
  const reachableCount = (action?.selectionCandidates ?? []).filter(
    ({ reachable }) => reachable,
  ).length

  if (action?.outcome === 'unreachable') {
    return 'Not selected because no directed route from the current stop was reachable.'
  }

  if (action?.outcome === 'selected') {
    return `Selected with score ${formatNumber(score)} because it is the lowest reachable score among ${reachableCount} option${reachableCount === 1 ? '' : 's'}.`
  }

  if (score != null && selectedScore != null) {
    if (score === selectedScore) {
      return `Not selected despite tying at ${formatNumber(score)}; the deterministic node-ID tie-break chose ${action.selectedNodeId}.`
    }
    return `Not selected because its score ${formatNumber(score)} is higher than ${action.selectedNodeId} at ${formatNumber(selectedScore)} by ${formatNumber(score - selectedScore)}.`
  }

  return `Not selected; ${action?.selectedNodeId ?? 'another reachable location'} had the better recorded score.`
}
