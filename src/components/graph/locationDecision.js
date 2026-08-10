import { formatNodeNumber } from '../results/resultFormatting.js'

function toFiniteNumber(value) {
  const number = Number(value)
  return value == null || value === '' || !Number.isFinite(number)
    ? null
    : number
}

function formatNumber(value) {
  return toFiniteNumber(value)?.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  }) ?? 'không xác định'
}

export function describeLocationDecision(action) {
  const score = toFiniteNumber(action?.newValues?.priority)
  const selectedScore = toFiniteNumber(action?.selectedScore)
  const reachableCount = (action?.selectionCandidates ?? []).filter(
    ({ reachable }) => reachable,
  ).length

  if (action?.outcome === 'unreachable') {
    return 'Loại: không có tuyến có hướng.'
  }

  if (action?.outcome === 'selected') {
    return `Chọn: điểm ${formatNumber(score)} thấp nhất trong ${reachableCount} phương án.`
  }

  if (score != null && selectedScore != null) {
    if (score === selectedScore) {
      return `Loại do phá hòa; chọn nút ${formatNodeNumber(action.selectedNodeId)} cùng điểm ${formatNumber(score)}.`
    }
    return `Loại: ${formatNumber(score)} > ${formatNumber(selectedScore)} của nút ${formatNodeNumber(action.selectedNodeId)} (chênh ${formatNumber(score - selectedScore)}).`
  }

  return `Loại: nút ${action?.selectedNodeId ? formatNodeNumber(action.selectedNodeId) : 'khác'} có điểm tốt hơn.`
}
