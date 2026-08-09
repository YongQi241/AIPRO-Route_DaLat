function toNumber(value) {
  const number = Number(value)
  return value == null || value === '' || !Number.isFinite(number)
    ? null
    : number
}

function formatNumber(value) {
  return toNumber(value)?.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  }) ?? 'unknown'
}

export function getDecisionCost(values) {
  if (!values) return null

  const fCost = toNumber(values.fCost)
  if (fCost != null) return fCost

  const gCost = toNumber(values.gCost)
  const hCost = toNumber(values.hCost)
  if (gCost != null && hCost != null) return gCost + hCost

  return toNumber(values.priority) ?? gCost ?? hCost
}

function formatCost(values) {
  if (!values) return 'cost values were not included in this trace'

  const gCost = toNumber(values.gCost)
  const hCost = toNumber(values.hCost)
  const total = getDecisionCost(values)
  const parts = []

  if (gCost != null) parts.push(`g(n)=${formatNumber(gCost)}`)
  if (hCost != null) parts.push(`h(n)=${formatNumber(hCost)}`)
  if (gCost != null && hCost != null) {
    parts.push(`f(n)=g(n)+h(n)=${formatNumber(total)}`)
  } else if (values.fCost != null) {
    parts.push(`f(n)=${formatNumber(total)}`)
  } else if (values.priority != null && total != null) {
    parts.push(`priority=${formatNumber(total)}`)
  }

  return parts.length > 0 ? parts.join(', ') : 'cost values were not included in this trace'
}

function describeComparison(action, evaluatedActions) {
  const candidateCost = getDecisionCost(action.newValues)
  const scored = evaluatedActions
    .filter(
      (candidate) =>
        candidate?.type === 'consider-edge' &&
        (action.frameIndex == null ||
          candidate.frameIndex === action.frameIndex),
    )
    .map((candidate) => ({
      edgeId: String(candidate.activeEdgeId ?? ''),
      cost: getDecisionCost(candidate.newValues),
    }))
    .filter(({ cost }) => cost != null)

  if (candidateCost == null || scored.length < 2) {
    return scored.length === 1
      ? 'It is the only evaluated option with a comparable cost so far.'
      : 'The trace does not contain enough comparable edge costs yet.'
  }

  const lower = scored.filter(({ cost }) => cost < candidateCost)
  const equal = scored.filter(
    ({ edgeId, cost }) => edgeId !== String(action.activeEdgeId) && cost === candidateCost,
  )

  if (lower.length === 0) {
    return equal.length === 0
      ? `It has the lowest cost among ${scored.length} evaluated options so far.`
      : `It ties for the lowest cost among ${scored.length} evaluated options so far.`
  }

  const best = Math.min(...scored.map(({ cost }) => cost))
  const bestEdges = scored
    .filter(({ cost }) => cost === best)
    .map(({ edgeId }) => edgeId)
    .join(', ')
  return `${lower.length} of ${scored.length} evaluated options cost less; edge ${bestEdges} has the lowest cost, ${formatNumber(best)}.`
}

export function describeCandidateEdgeDecision(edgeId, evaluatedActions = []) {
  const normalizedEdgeId = String(edgeId)
  const action = [...evaluatedActions]
    .reverse()
    .find(
      (candidate) =>
        candidate?.type === 'consider-edge' &&
        String(candidate.activeEdgeId ?? '') === normalizedEdgeId,
    )

  if (!action) {
    return 'Pending: this candidate edge has not been evaluated yet.'
  }

  const candidateCost = getDecisionCost(action.newValues)
  const retainedCost = getDecisionCost(action.oldValues)
  const costDetail = formatCost(action.newValues)
  const comparison = describeComparison(action, evaluatedActions)

  if (action.outcome === 'add') {
    return `Checked and retained as a new frontier option because ${costDetail}. ${comparison}`
  }
  if (action.outcome === 'update') {
    const improvement =
      candidateCost != null && retainedCost != null
        ? `candidate total ${formatNumber(candidateCost)} is lower than the previous ${formatNumber(retainedCost)}`
        : 'it improves the previously retained route'
    return `Checked and retained as an improved frontier option because ${improvement} (${costDetail}). ${comparison}`
  }
  if (action.outcome === 'keep') {
    const rejection =
      candidateCost != null && retainedCost != null
        ? `candidate total ${formatNumber(candidateCost)} is not lower than the retained ${formatNumber(retainedCost)}`
        : 'it did not improve the route already retained for this destination'
    return `Not chosen as an improvement because ${rejection} (${costDetail}). ${comparison}`
  }
  if (action.outcome === 'skip') {
    return `Not retained by this relaxation (${costDetail}). ${comparison}`
  }

  return `Evaluated in traversal order (${costDetail}); this algorithm trace does not use cost to select among these outgoing edges.`
}

export function getEvaluatedCandidateEdgeIds(actions = []) {
  return [
    ...new Set(
      actions
        .filter(
          (action) =>
            action?.type === 'consider-edge' && action.activeEdgeId != null,
        )
        .map((action) => String(action.activeEdgeId)),
    ),
  ]
}

export function getTraceEdgeState(
  edgeId,
  evaluatedActions = [],
  finalPathEdgeIds = [],
) {
  const normalizedEdgeId = String(edgeId)
  if (finalPathEdgeIds.map(String).includes(normalizedEdgeId)) return 'chosen'

  return evaluatedActions.some(
    (action) =>
      action?.type === 'consider-edge' &&
      String(action.activeEdgeId ?? '') === normalizedEdgeId,
  )
    ? 'checked'
    : 'pending'
}
