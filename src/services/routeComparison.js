import {
  formatAlgorithmLabel,
  formatNumber,
  formatOptimizationLabel,
  scaleCost,
} from '../components/results/resultFormatting.js'

export const COMPARISON_PRIORITY = ['balanced', 'time', 'distance', 'safest']

const OBJECTIVE_METRICS = {
  shortest: 'total_distance_km',
  fastest: 'total_time_min',
  balanced: 'total_cost',
  // Safest is a risk-heavy weighted profile, so its solver minimizes the
  // profile's route_cost rather than raw risk alone.
  safest: 'total_cost',
}

export function normalizeOptimization(value) {
  const normalized = String(value ?? 'balanced').trim().toLowerCase()
  const aliases = {
    distance: 'shortest',
    time: 'fastest',
    cost: 'balanced',
  }
  return aliases[normalized] ?? normalized
}

export function getComparisonOptimizations(currentOptimization) {
  const currentProfile = normalizeOptimization(currentOptimization)
  return COMPARISON_PRIORITY.filter(
    (optimization) => normalizeOptimization(optimization) !== currentProfile,
  )
}

export function getOptimalRouteAlgorithm(request) {
  return (request?.visit_nodes?.length ?? 0) > 0
    ? 'brute_force_tsp'
    : 'dijkstra'
}

export function createComparisonRequests(request) {
  const algorithm = getOptimalRouteAlgorithm(request)
  const currentOptimization = request?.optimization ?? 'balanced'
  const optimizations = [
    currentOptimization,
    ...getComparisonOptimizations(currentOptimization),
  ]

  return optimizations.map((optimization, index) => ({
    ...request,
    visit_nodes: Array.isArray(request?.visit_nodes)
      ? [...request.visit_nodes]
      : [],
    algorithm,
    optimization,
    comparison_role: index === 0 ? 'current_optimum' : 'alternative_optimum',
  }))
}

function finite(value) {
  const number = Number(value)
  return value == null || value === '' || !Number.isFinite(number)
    ? null
    : number
}

function pathKey(result) {
  const edges = result?.path_edges
  if (Array.isArray(edges) && edges.length > 0) return `edges:${edges.join('|')}`
  const nodes = result?.path_nodes
  return Array.isArray(nodes) ? `nodes:${nodes.join('|')}` : ''
}

export function routesMatch(first, second) {
  const firstKey = pathKey(first)
  return Boolean(firstKey) && firstKey === pathKey(second)
}

function objectiveImprovement(primaryResult, candidate) {
  const profile = normalizeOptimization(candidate.optimization)
  const metric = OBJECTIVE_METRICS[profile]
  const primaryValue = finite(primaryResult?.metrics?.[metric])
  const candidateValue = finite(candidate.result?.metrics?.[metric])
  if (primaryValue == null || candidateValue == null) return 0
  return Math.max(0, primaryValue - candidateValue) / Math.max(Math.abs(primaryValue), 1e-9)
}

function objectiveValue(result, optimization) {
  const metric = OBJECTIVE_METRICS[normalizeOptimization(optimization)]
  return metric ? finite(result?.metrics?.[metric]) : null
}

function objectiveValuesMatch(first, second) {
  if (first == null || second == null) return false
  const tolerance = Math.max(1, Math.abs(first), Math.abs(second)) * 1e-6
  return Math.abs(first - second) <= tolerance
}

function comparisonPriority(candidate) {
  const profile = normalizeOptimization(candidate?.optimization)
  const index = COMPARISON_PRIORITY.findIndex(
    (optimization) => normalizeOptimization(optimization) === profile,
  )
  return index < 0 ? COMPARISON_PRIORITY.length : index
}

export function getComparisonRecommendation(primaryResult, candidates = []) {
  if (!primaryResult || primaryResult.status !== 'success') return null
  const currentProfile = normalizeOptimization(primaryResult.optimization)
  const successful = candidates.filter(
    (candidate) => candidate?.result?.status === 'success',
  )
  const currentOptimum = successful.find((candidate) =>
    candidate.comparisonRole === 'current_optimum' ||
    candidate.comparison_role === 'current_optimum' ||
    normalizeOptimization(candidate.optimization) === currentProfile,
  )

  if (currentOptimum) {
    const currentValue = objectiveValue(primaryResult, currentProfile)
    const optimumValue = objectiveValue(currentOptimum.result, currentProfile)
    if (
      currentValue != null &&
      optimumValue != null &&
      optimumValue < currentValue &&
      !objectiveValuesMatch(currentValue, optimumValue)
    ) {
      return {
        ...currentOptimum,
        currentIsOptimal: false,
        recommendationType: 'current_optimum',
      }
    }
  }

  const alternative = successful
    .filter((candidate) =>
      normalizeOptimization(candidate.optimization) !== currentProfile &&
      !routesMatch(primaryResult, candidate.result),
    )
    .sort((left, right) => comparisonPriority(left) - comparisonPriority(right))[0]

  if (!alternative) return null
  return {
    ...alternative,
    currentIsOptimal: Boolean(currentOptimum),
    recommendationType: 'alternative_optimum',
  }
}

export function selectComparisonCandidate(primaryResult, candidates = []) {
  const recommendation = getComparisonRecommendation(primaryResult, candidates)
  if (recommendation) return recommendation

  const currentProfile = normalizeOptimization(primaryResult?.optimization)
  const seenProfiles = new Set([currentProfile])
  const eligible = candidates.filter((candidate) => {
    const profile = normalizeOptimization(candidate?.optimization)
    if (!candidate?.result || seenProfiles.has(profile)) return false
    seenProfiles.add(profile)
    return true
  })

  const successful = eligible
    .map((candidate, index) => ({
      ...candidate,
      index,
      differentPath: !routesMatch(primaryResult, candidate.result),
      improvement: objectiveImprovement(primaryResult, candidate),
    }))
    .filter((candidate) => candidate.result.status === 'success')
    .sort((left, right) =>
      Number(right.differentPath) - Number(left.differentPath) ||
      Number(right.improvement > 0) - Number(left.improvement > 0) ||
      right.improvement - left.improvement ||
      left.index - right.index,
    )

  if (successful.length > 0) return successful[0]
  return eligible.find((candidate) => candidate.result.status === 'no_path') ?? eligible[0] ?? null
}

function optimizationPriority(optimization) {
  const requested = String(optimization ?? '').toLowerCase()
  const profile = normalizeOptimization(optimization)
  if (profile === 'shortest') return 'độ dài tuyến đường'
  if (profile === 'fastest') return 'thời gian di chuyển'
  if (profile === 'safest') return 'sự an toàn'
  if (profile === 'balanced') {
    const aliasNote = requested === 'cost'
      ? ' (Cheapest hiện dùng cùng profile trọng số với Balanced)'
      : ''
    return `sự cân bằng giữa quãng đường, thời gian, ùn tắc và rủi ro${aliasNote}`
  }
  return `tiêu chí ${formatOptimizationLabel(optimization)}`
}

function currentSelectionSentence(result, optimization) {
  const priority = optimizationPriority(optimization)
  const algorithm = String(result?.algorithm ?? '').toLowerCase()
  if (algorithm === 'bfs' || algorithm.includes('breadth')) {
    return `Cấu hình hiện tại đặt ${priority} làm tiêu chí chính, nhưng tuyến của BFS được chọn theo số cạnh và thứ tự duyệt.`
  }
  if (algorithm === 'dfs' || algorithm.includes('depth')) {
    return `Cấu hình hiện tại đặt ${priority} làm tiêu chí chính, nhưng tuyến của DFS phụ thuộc vào thứ tự duyệt láng giềng.`
  }
  if (algorithm.includes('greedy') || algorithm.includes('hill')) {
    return `Cấu hình hiện tại đặt ${priority} làm tiêu chí chính, nhưng thuật toán chọn bước tiếp theo chủ yếu theo ước lượng Haversine.`
  }
  return `Tuyến hiện tại được chọn với ${priority} là chính.`
}

function routeMetrics(result) {
  const metrics = result?.metrics ?? {}
  const values = []
  const distance = finite(metrics.total_distance_km)
  const time = finite(metrics.total_time_min)
  const cost = scaleCost(metrics.total_cost)
  const risk = finite(metrics.total_risk)
  if (distance != null) values.push(`${formatNumber(distance, 3)} km`)
  if (time != null) values.push(`${formatNumber(time, 3)} phút`)
  if (cost != null) values.push(`chi phí kịch bản: ${formatNumber(cost, 3)}`)
  if (risk != null) values.push(`rủi ro: ${formatNumber(risk, 3)}`)
  return values.length ? values.join('; ') : 'chưa có đủ số liệu tổng hợp'
}

function congestedSegments(result) {
  const segments = Array.isArray(result?.segments) ? result.segments : []
  if (segments.length === 0) return 'chưa có dữ liệu chi tiết theo đoạn'
  const congested = segments.filter((segment) => {
    const level = finite(segment?.congestion_level ?? segment?.congestion)
    return level != null && level >= 3
  })
  if (congested.length === 0) return 'không tồn tại đoạn tắt nghẽn từ mức 3 đến 5'
  return 'Tắc nghẽn ở: ' + congested.map((segment) => {
    const level = finite(segment?.congestion_level ?? segment?.congestion)
    return `${segment.from_node} → ${segment.to_node} (mức ${formatNumber(level, 1)}/5)`
  }).join(', ')
}

function alternativeAdvantage(primaryResult, candidate) {
  const primary = primaryResult?.metrics ?? {}
  const alternative = candidate.result?.metrics ?? {}
  const improves = (metric, transform = (value) => value) => {
    const currentValue = finite(primary[metric])
    const alternativeValue = finite(alternative[metric])
    return currentValue != null && alternativeValue != null &&
      transform(alternativeValue) < transform(currentValue) - 0.0005
  }
  const profile = normalizeOptimization(candidate.optimization)
  if (profile === 'fastest' && improves('total_time_min')) return 'nhanh hơn'
  if (profile === 'shortest' && improves('total_distance_km')) return 'ngắn hơn'
  if (profile === 'safest' && improves('total_risk')) return 'an toàn hơn'
  if (profile === 'balanced' && improves('total_cost', scaleCost)) {
    return 'có chi phí kịch bản thấp hơn'
  }
  if (improves('total_time_min')) return 'nhanh hơn'
  if (improves('total_distance_km')) return 'ngắn hơn'
  if (improves('total_risk')) return 'an toàn hơn'
  if (improves('total_cost', scaleCost)) return 'có chi phí kịch bản thấp hơn'
  return ''
}

function differenceClause(
  primaryValue,
  candidateValue,
  lowerText,
  higherText,
  equivalentText,
  unit = '',
  transform = (value) => value,
) {
  const primary = finite(primaryValue)
  const candidate = finite(candidateValue)
  if (primary == null || candidate == null) return null
  const difference = transform(candidate) - transform(primary)
  if (Math.abs(difference) < 0.0005) return equivalentText
  const amount = formatNumber(Math.abs(difference), 3)
  return difference < 0
    ? `${lowerText} ${amount}${unit}`
    : `${higherText} ${amount}${unit}`
}

function metricDifferences(primaryResult, candidateResult) {
  const primary = primaryResult?.metrics ?? {}
  const candidate = candidateResult?.metrics ?? {}
  return [
    differenceClause(primary.total_distance_km, candidate.total_distance_km, 'ngắn hơn', 'dài hơn', 'có quãng đường tương đương', ' km'),
    differenceClause(primary.total_time_min, candidate.total_time_min, 'nhanh hơn', 'chậm hơn', 'có thời gian tương đương', ' phút'),
    differenceClause(primary.total_cost, candidate.total_cost, 'có chi phí kịch bản thấp hơn', 'có chi phí kịch bản cao hơn', 'có chi phí kịch bản tương đương', '', scaleCost),
    differenceClause(primary.total_risk, candidate.total_risk, 'có rủi ro thấp hơn', 'có rủi ro cao hơn', 'có rủi ro tương đương'),
  ].filter(Boolean)
}

function joinClauses(clauses) {
  if (clauses.length <= 1) return clauses[0] ?? 'không có đủ chỉ số chung để tính chênh lệch'
  return `${clauses.slice(0, -1).join(', ')} và ${clauses.at(-1)}`
}

function algorithmOptimality(result) {
  const algorithm = String(result?.algorithm ?? '').toLowerCase()
  const label = formatAlgorithmLabel(result?.algorithm) || 'thuật toán hiện tại'
  let property
  if (algorithm === 'bfs' || algorithm.includes('breadth')) {
    property = 'tối ưu về số cạnh; chỉ tương đương tối ưu chi phí khi mọi cạnh có cùng chi phí'
  } else if (algorithm === 'dfs' || algorithm.includes('depth')) {
    property = 'không tối ưu vì trả về tuyến khả thi đầu tiên theo thứ tự duyệt'
  } else if (algorithm === 'ucs' || algorithm.includes('uniform')) {
    property = 'tối ưu tổng trọng số với điều kiện mọi trọng số cạnh không âm'
  } else if (algorithm.includes('dijkstra')) {
    property = 'tối ưu tổng trọng số với điều kiện mọi trọng số cạnh không âm'
  } else if (algorithm === 'a*' || algorithm.includes('a*') || algorithm.includes('astar')) {
    property = 'tối ưu với điều kiện trọng số cạnh không âm và heuristic không đánh giá vượt chi phí thực còn lại'
  } else if (algorithm.includes('greedy')) {
    property = 'không tối ưu vì chỉ dùng h(n) và bỏ qua chi phí đã đi g(n)'
  } else if (algorithm.includes('hill')) {
    property = 'không tối ưu vì quyết định dựa trên heuristic cục bộ, dù biến thể này có quay lui'
  } else if (algorithm.includes('nearest')) {
    property = 'không tối ưu toàn cục vì mỗi vòng chỉ chọn điểm tốt nhất ở thời điểm hiện tại'
  } else if (algorithm.includes('brute')) {
    property = 'tối ưu trong phạm vi các thứ tự khả thi đã duyệt, với điều kiện bài toán đủ nhỏ để xét hết mọi hoán vị'
  } else {
    property = 'cần được đánh giá theo bảo đảm riêng của chiến lược tìm kiếm đang dùng'
  }
  return `Thuật toán hiện tại là ${label}: thuật toán ${property}.`
}

export function buildOptimizationComparisonNarrative(primaryResult, comparisonState) {
  if (!primaryResult || primaryResult.status !== 'success') return null
  const currentOptimization = primaryResult.optimization ?? 'balanced'
  const selection = currentSelectionSentence(primaryResult, currentOptimization)
  const optimality = algorithmOptimality(primaryResult)

  if (comparisonState?.status === 'loading') {
    return `${selection} Hệ thống đang dùng bộ giải tối ưu độc lập để kiểm tra cấu hình hiện tại, sau đó tìm phương án thay thế theo thứ tự Balanced, Fastest, Shortest và Safest. ${optimality}`
  }
  if (comparisonState?.status === 'error') {
    return `${selection} Không thể tải tuyến đối chứng; kết quả chính vẫn được giữ nguyên. ${optimality}`
  }

  const recommendation = getComparisonRecommendation(
    primaryResult,
    comparisonState?.candidates,
  )
  const candidate = recommendation ?? selectComparisonCandidate(
    primaryResult,
    comparisonState?.candidates,
  )
  if (!candidate) {
    return `${selection} Chưa có một optimization độc lập phù hợp để đối chứng. ${optimality}`
  }

  const alternativeLabel = formatOptimizationLabel(candidate.optimization)
  if (candidate.result.status !== 'success') {
    const unavailableReason = candidate.result.status === 'no_path'
      ? 'hệ thống không tìm thấy tuyến khả thi để so sánh'
      : 'hệ thống không tạo được một kết quả đối chứng hợp lệ'
    return `${selection} Khi đổi sang ${alternativeLabel} với cùng thuật toán và kịch bản, ${unavailableReason}. ${optimality}`
  }

  if (routesMatch(primaryResult, candidate.result)) {
    const successfulCandidates = (comparisonState?.candidates ?? [])
      .filter(({ result }) => result?.status === 'success')
    const allCheckedRoutesMatch = successfulCandidates.length > 1 &&
      successfulCandidates.every(({ result }) => routesMatch(primaryResult, result))
    const subject = allCheckedRoutesMatch
      ? `${alternativeLabel} và các optimization độc lập đã kiểm tra`
      : alternativeLabel
    const congestion = congestedSegments(primaryResult)
    return `${selection} ${subject} cũng chọn đúng chuỗi đường này; Về tắc nghẽn trên tuyến: ${congestion}. ${optimality}`
  }

  const path = (candidate.result.path_nodes ?? []).join(' → ')
  const differences = joinClauses(metricDifferences(primaryResult, candidate.result))
  const advantage = alternativeAdvantage(primaryResult, candidate)
  const advantageText = advantage ? ` ${advantage}` : ''
  const pathText = path || 'không có chuỗi node đầy đủ'
  const metrics = routeMetrics(candidate.result)
  const congestion = congestedSegments(candidate.result)
  if (recommendation?.recommendationType === 'current_optimum') {
    return `${selection} Tuyến hiện tại chưa phải phương án tối ưu cho ${alternativeLabel}. Bộ giải ${formatAlgorithmLabel(candidate.result.algorithm)} tìm được tuyến tối ưu là ${pathText} (${metrics}); so với tuyến hiện tại, tuyến này ${differences}; Về tắc nghẽn trên tuyến: ${congestion}. ${optimality}`
  }
  if (recommendation?.currentIsOptimal) {
    return `${selection} Tuyến hiện tại đã tối ưu cho cấu hình đang chọn. Theo thứ tự ưu tiên Balanced → Fastest → Shortest → Safest, phương án tối ưu thay thế đầu tiên là tuyến ${alternativeLabel}: ${pathText} (${metrics}); so với tuyến hiện tại, tuyến này ${differences}; Về tắc nghẽn trên tuyến: ${congestion}. ${optimality}`
  }
  return `${selection} Tồn tại một tuyến khác${advantageText} theo ${alternativeLabel} là ${pathText} (${metrics}); so với tuyến hiện tại, tuyến này ${differences}; Về tắc nghẽn trên tuyến: ${congestion}. ${optimality}`
}
