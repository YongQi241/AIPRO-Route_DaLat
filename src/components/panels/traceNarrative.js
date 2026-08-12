import { describeCandidateEdgeDecision } from '../graph/edgeDecision.js'
import { describeLocationDecision } from '../graph/locationDecision.js'
import {
  formatSearchCost,
  getSearchCostModel,
  SEARCH_COST_MODEL,
} from '../graph/searchCostModel.js'
import { formatNodeNumber, scaleCost } from '../results/resultFormatting.js'

function toNumber(value) {
  const number = Number(value)
  return value == null || value === '' || !Number.isFinite(number)
    ? null
    : number
}

function number(value) {
  return scaleCost(value)?.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  }) ?? 'chưa ghi nhận'
}

function locationLabel(nodeId, locationNames) {
  if (nodeId == null) return 'địa điểm không xác định'
  return formatNodeNumber(nodeId)
}

function listLocations(nodeIds, locationNames) {
  return nodeIds.map((nodeId) => locationLabel(nodeId, locationNames)).join(', ')
}

function expansionReason(action, algorithm) {
  const values = action.currentValues ?? {}
  const normalizedAlgorithm = String(algorithm ?? '').toLowerCase()
  const rule = action.selectionRule
  const costModel = getSearchCostModel(algorithm, rule)

  if (costModel === SEARCH_COST_MODEL.ASTAR) {
    return `Chọn vì f(n)=${formatSearchCost(values.fCost, 'chưa ghi nhận')} nhỏ nhất (g=${formatSearchCost(values.gCost, 'chưa ghi nhận')}, h=${formatSearchCost(values.hCost, 'chưa ghi nhận')}).`
  }
  if (costModel === SEARCH_COST_MODEL.CUMULATIVE_G) {
    return `Chọn vì g(n)=${formatSearchCost(values.gCost ?? values.priority, 'chưa ghi nhận')} nhỏ nhất trên biên.`
  }
  if (rule === 'lowest_h_cost' || normalizedAlgorithm.includes('greedy')) {
    return `Chọn vì h(n)=${number(values.hCost ?? values.priority)} nhỏ nhất; không xét chi phí đã đi.`
  }
  if (
    rule === 'lowest_neighbor_h_cost' ||
    normalizedAlgorithm.includes('hill')
  ) {
    return `Cuối nhánh có h(n)=${number(values.hCost ?? values.priority)}; bế tắc thì quay lui.`
  }
  if (rule === 'fifo_queue' || normalizedAlgorithm.includes('breadth') || normalizedAlgorithm === 'bfs') {
    return 'Lấy đầu hàng đợi FIFO; ưu tiên tuyến ít cạnh.'
  }
  if (rule === 'lifo_stack' || normalizedAlgorithm.includes('depth') || normalizedAlgorithm === 'dfs') {
    return 'Lấy đỉnh ngăn xếp LIFO; đi sâu rồi quay lui.'
  }
  return 'Chọn làm nút tiếp theo trên biên.'
}

function candidateSummary(action) {
  const count = action.candidateEdgeIds?.length ?? 0
  if (count === 0) return 'Không có đường đi ra.'
  return `Xét ${count} đường: ${action.candidateEdgeIds.join(', ')}.`
}

function localEdgeCost(action, edgeCostDetails, algorithm) {
  const detail = edgeCostDetails?.[action.activeEdgeId]
  if (!detail) return ''
  if (detail.closed) {
    return ' Đường bị đóng trong kịch bản này.'
  }
  if (toNumber(detail.route_cost) == null) {
    return ' Không có giá trị chi phí.'
  }
  const costModel = getSearchCostModel(algorithm, action.selectionRule)
  const cumulativeLabel = costModel === SEARCH_COST_MODEL.CUMULATIVE_G
    ? 'g(n) là chi phí tích lũy.'
    : 'g(n)/f(n) là chi phí tích lũy.'
  return ` Chi phí cạnh: ${number(detail.route_cost)}; ${cumulativeLabel}`
}

export function describeTraceAction(action, actions = [], context = {}) {
  const { algorithm, edgeCostDetails, locationNames } = context
  const current = locationLabel(action.currentNodeId, locationNames)
  const neighbor = locationLabel(action.activeNeighborId, locationNames)

  if (action.type === 'select-next-location') {
    const count = action.selectionCandidates?.length ?? 0
    return {
      title: `Chọn điểm dừng tiếp theo từ ${current}`,
      detail: `So sánh ${count} điểm còn lại; chọn điểm khả dụng có tổng thấp nhất.`,
    }
  }

  if (action.type === 'expand') {
    return {
      title: `Mở rộng ${current}`,
      detail: `${expansionReason(action, algorithm)} ${candidateSummary(action)}`,
    }
  }

  if (action.type === 'consider-edge') {
    const evaluatedAtThisPoint = actions.filter(
      (candidate) =>
        candidate.type === 'consider-edge' &&
        candidate.actionIndex <= action.actionIndex,
    )
    const decision = describeCandidateEdgeDecision(
      action.activeEdgeId,
      evaluatedAtThisPoint,
      { algorithm },
    )
    return {
      title: `Xét ${action.activeEdgeId}: ${current} → ${neighbor}`,
      detail: `${decision}${localEdgeCost(action, edgeCostDetails, algorithm)}`,
    }
  }

  if (action.type === 'consider-location') {
    return {
      title: `So sánh ${neighbor}`,
      detail: describeLocationDecision(action),
    }
  }

  if (action.type === 'frame-complete') {
    if (action.selectionRule === 'lowest_candidate_score') {
      const selected = locationLabel(action.selectedNodeId, locationNames)
      return {
        title: `Chọn ${selected} làm điểm dừng tiếp theo`,
        detail: `Chọn ${selected} với điểm thấp nhất ${number(action.selectedScore)}.`,
      }
    }

    const frontier = action.frontierNodeIds ?? []
    const frontierText = frontier.length > 0
      ? `Biên: ${listLocations(frontier, locationNames)}.`
      : 'Biên rỗng.'
    const visitedCount = action.visitedNodeIds?.length ?? 0
    return {
      title: `Hoàn tất mở rộng ${current}`,
      detail: `${frontierText} Đã thăm ${visitedCount} nút.`,
    }
  }

  return {
    title: 'Hoàn tất tiến trình',
    detail: 'Đã phát hết thao tác; hiển thị tuyến cuối.',
  }
}
