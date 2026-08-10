import { scaleCost } from '../results/resultFormatting.js'

function toNumber(value) {
  const number = Number(value)
  return value == null || value === '' || !Number.isFinite(number)
    ? null
    : number
}

function formatNumber(value) {
  return scaleCost(value)?.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  }) ?? 'không xác định'
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
  if (!values) return 'tiến trình này không chứa giá trị chi phí'

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
    parts.push(`độ ưu tiên=${formatNumber(total)}`)
  }

  return parts.length > 0 ? parts.join(', ') : 'tiến trình này không chứa giá trị chi phí'
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
    return 'Chờ xét.'
  }

  const candidateCost = getDecisionCost(action.newValues)
  const retainedCost = getDecisionCost(action.oldValues)
  const costDetail = formatCost(action.newValues)
  const retainedOwner = action.retainedEdgeId
    ? ` thuộc về đường ${action.retainedEdgeId}`
    : ''

  if (action.outcome === 'add') {
    return `Thêm vào biên: ${costDetail}`
  }
  if (action.outcome === 'update') {
    return candidateCost != null && retainedCost != null
      ? `Cập nhật biên: ${formatNumber(candidateCost)} < ${formatNumber(retainedCost)}${retainedOwner}`
      : `Cập nhật biên: ${costDetail} tốt hơn phương án cũ${retainedOwner}`
  }
  if (action.outcome === 'keep') {
    return candidateCost != null && retainedCost != null
      ? `Không cập nhật: ${formatNumber(candidateCost)} ≥ ${formatNumber(retainedCost)}${retainedOwner}`
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