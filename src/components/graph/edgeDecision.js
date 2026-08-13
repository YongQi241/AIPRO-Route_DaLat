import {
  formatSearchCost,
  getSearchCostModel,
  getSearchDecisionCost,
  SEARCH_COST_MODEL,
} from './searchCostModel.js'

function toNumber(value) {
  const number = Number(value)
  return value == null || value === '' || !Number.isFinite(number)
    ? null
    : number
}

export function getDecisionCost(values, costModel = SEARCH_COST_MODEL.GENERIC) {
  return getSearchDecisionCost(values, costModel)
}

function formatCost(values, costModel, costContext) {
  if (!values) return 'tiến trình này không chứa giá trị chi phí'

  const gCost = toNumber(values.gCost)
  const hCost = toNumber(values.hCost)
  const total = getDecisionCost(values, costModel)
  const parts = []

  if (costModel === SEARCH_COST_MODEL.CUMULATIVE_G) {
    const cumulativeCost = gCost ?? toNumber(values.priority)
    return cumulativeCost == null
      ? 'tiến trình này không chứa giá trị g(n)'
      : `g(n)=${formatSearchCost(cumulativeCost, costContext)}`
  }

  if (gCost != null) parts.push(`g(n)=${formatSearchCost(gCost, costContext)}`)
  if (hCost != null) parts.push(`h(n)=${formatSearchCost(hCost, costContext)}`)
  if (gCost != null && hCost != null) {
    parts.push(`f(n)=g(n)+h(n)=${formatSearchCost(total, costContext)}`)
  } else if (values.fCost != null) {
    parts.push(`f(n)=${formatSearchCost(total, costContext)}`)
  } else if (values.priority != null && total != null) {
    parts.push(`độ ưu tiên=${formatSearchCost(total, costContext)}`)
  }

  return parts.length > 0 ? parts.join(', ') : 'tiến trình này không chứa giá trị chi phí'
}

export function describeCandidateEdgeDecision(
  edgeId,
  evaluatedActions = [],
  { algorithm = null, weightUsed = null, optimization = null } = {},
) {
  const normalizedEdgeId = String(edgeId)
  const action = [...evaluatedActions]
    .reverse()
    .find(
      (candidate) =>
        candidate?.type === 'consider-edge' &&
        String(candidate.activeEdgeId ?? '') === normalizedEdgeId,
    )

  if (!action) {
    return 'Chờ xét.'
  }

  const costModel = getSearchCostModel(algorithm, action.selectionRule)
  const costContext = { weightUsed, optimization }
  const candidateCost = getDecisionCost(action.newValues, costModel)
  const retainedCost = getDecisionCost(action.oldValues, costModel)
  const costDetail = formatCost(action.newValues, costModel, costContext)
  const retainedOwner = action.retainedEdgeId
    ? ` thuộc về đường ${action.retainedEdgeId}`
    : ''

  if (action.outcome === 'add') {
    return `Thêm vào biên: ${costDetail}`
  }
  if (action.outcome === 'update') {
    return candidateCost != null && retainedCost != null
      ? `Cập nhật biên: ${formatSearchCost(candidateCost, costContext)} < ${formatSearchCost(retainedCost, costContext)}${retainedOwner}`
      : `Cập nhật biên: ${costDetail} tốt hơn phương án cũ${retainedOwner}`
  }
  if (action.outcome === 'keep') {
    return candidateCost != null && retainedCost != null
      ? `Không cập nhật: ${formatSearchCost(candidateCost, costContext)} ≥ ${formatSearchCost(retainedCost, costContext)}${retainedOwner}`
      : `Không cập nhật: ${costDetail} không tốt hơn phương án đang giữ${retainedOwner}`
  }
  if (action.outcome === 'skip') {
    return `Không giữ: ${costDetail}`
  }

  return `Xét theo thứ tự duyệt; không dùng chi phí (${costDetail}).`
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
