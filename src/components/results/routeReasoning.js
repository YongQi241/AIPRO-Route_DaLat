import { buildSearchActionTimeline } from '../graph/searchTimeline.js'
import { formatNodeNumber, scaleCost } from './resultFormatting.js'

const OBJECTIVES = {
  distance_km: ['Quãng đường', 'total_distance_km', 'km'],
  adjusted_time_min: ['Thời gian di chuyển', 'total_time_min', 'phút'],
  route_cost: ['Chi phí kịch bản', 'total_cost', ''],
  risk: ['Rủi ro', 'total_risk', ''],
  edge_count: ['Số đoạn đường', 'path_edge_count', 'đường'],
  heuristic_only: ['Hướng dẫn theo hàm ước lượng', null, ''],
}

function finite(value) {
  const number = Number(value)
  return value == null || value === '' || !Number.isFinite(number)
    ? null
    : number
}

function nodeLabel(nodeId, names) {
  return formatNodeNumber(nodeId)
}

function algorithmMethod(result) {
  const algorithm = String(result?.algorithm ?? '').toLowerCase()
  if (algorithm.includes('a*')) {
    return 'A* xếp hạng các nút biên theo f(n)=g(n)+h(n): chi phí tuyến đã tích lũy cộng với chi phí còn lại ước tính. Nút có f(n) thấp nhất được mở rộng trước; một giá trị g(n) tốt hơn có thể cập nhật nút đã được phát hiện.'
  }
  if (algorithm.includes('dijkstra')) {
    return 'Dijkstra xếp hạng các nút biên theo g(n) tích lũy và tiếp tục sau khi gặp đích cho tới khi mọi nút có thể đi tới đều được chốt. Tuyến tới đích là một nhánh của cây đường đi ngắn nhất đầy đủ từ điểm xuất phát.'
  }
  if (algorithm === 'ucs') {
    return 'UCS xếp hạng các nút biên theo g(n) tích lũy và dừng ngay khi đích được lấy khỏi hàng đợi ưu tiên. Nó chỉ giữ một tuyến mới tới nút khi tuyến đó làm giảm chi phí tích lũy đã ghi nhận.'
  }
  if (algorithm.includes('breadth') || algorithm === 'bfs') {
    return 'Tìm kiếm theo chiều rộng dùng hàng đợi FIFO và so sánh tuyến theo số đoạn đường. Thuật toán bảo đảm tuyến có ít cạnh nhất, nhưng quãng đường, thời gian, rủi ro và chi phí kịch bản không chi phối thứ tự mở rộng.'
  }
  if (algorithm.includes('depth') || algorithm === 'dfs') {
    return 'Tìm kiếm theo chiều sâu dùng ngăn xếp LIFO và đi theo nhánh mới nhất cho tới ngõ cụt hoặc điểm đến. Tuyến khả thi đầu tiên phụ thuộc vào thứ tự láng giềng có hướng, không phụ thuộc chi phí tuyến.'
  }
  if (algorithm.includes('greedy')) {
    return 'Tìm kiếm Tham Lam ưu tiên tốt nhất chỉ xếp hạng nút theo h(n), tức chi phí còn lại ước tính tới đích. Chi phí đã đi được chủ động bỏ qua; cách này có thể giảm phạm vi khám phá nhưng cũng có thể bỏ lỡ một tuyến hoàn chỉnh rẻ hơn.'
  }
  if (algorithm.includes('hill')) {
    return 'Leo đồi chọn láng giềng đi ra chưa thăm có h(n) nhỏ nhất. Biến thể này có thể chấp nhận bước thoát lên dốc và quay lui tại ngõ cụt, nhưng quyết định vẫn mang tính cục bộ thay vì tối ưu toàn cục.'
  }
  if (algorithm.includes('nearest')) {
    return 'Láng giềng gần nhất chạy Dijkstra có hướng tới mọi điểm dừng còn lại, chọn điểm số khả dụng thấp nhất, di chuyển tới đó rồi lặp lại. Mỗi lựa chọn là tốt nhất cục bộ từ điểm dừng hiện tại; thứ tự ghé thăm tổng thể chỉ là xấp xỉ.'
  }
  if (algorithm.includes('brute')) {
    return 'TSP duyệt cạn liệt kê mọi thứ tự khả thi của các điểm dừng, cộng mục tiêu đã chọn trên từng chặng nối và giữ lại thứ tự hoàn chỉnh có tổng nhỏ nhất.'
  }
  return 'Tuyến đường được tạo theo quy tắc quản lý biên và duyệt của thuật toán đã chọn.'
}

function objective(result) {
  const definition = OBJECTIVES[result?.weight_used] ?? [
    result?.optimization ?? 'Tiêu chí đã chọn',
    'total_cost',
    '',
  ]
  const [label, metricKey, unit] = definition
  const recorded = finite(result?.objective_value)
  const metric = metricKey ? finite(result?.metrics?.[metricKey]) : null
  const value = recorded ?? metric
  return {
    label,
    value: result?.weight_used === 'route_cost' ? scaleCost(value) : value,
    unit,
  }
}

function traceStatistics(result, edgeFeatures) {
  const actions = buildSearchActionTimeline(result, edgeFeatures)
  const count = (type, outcome = null) => actions.filter(
    (action) => action.type === type && (!outcome || action.outcome === outcome),
  ).length
  const frontierSizes = actions
    .filter(({ type }) => type === 'frame-complete')
    .map(({ frontierNodeIds }) => frontierNodeIds.length)

  return {
    recordedActions: actions.length,
    expansions: count('expand'),
    edgeChecks: count('consider-edge'),
    added: count('consider-edge', 'add'),
    improved: count('consider-edge', 'update'),
    retainedExisting: count('consider-edge', 'keep'),
    locationComparisons: count('consider-location'),
    unreachableLocations: count('consider-location', 'unreachable'),
    peakFrontier: frontierSizes.length ? Math.max(...frontierSizes) : 0,
  }
}

function selectedSegments(result, names) {
  return (result?.segments ?? []).map((segment, index) => ({
    index: index + 1,
    edgeId: String(segment.edge_id),
    from: nodeLabel(segment.from_node, names),
    to: nodeLabel(segment.to_node, names),
    distance: finite(segment.distance_km),
    time: finite(segment.adjusted_time_min),
    cost: scaleCost(segment.route_cost),
    congestion: finite(segment.congestion_level),
    risk: finite(segment.risk),
    detail: result?.edge_cost_details?.[String(segment.edge_id)] ?? null,
  }))
}

function formulaContributions(result) {
  const totals = { distance: 0, time: 0, congestion: 0, risk: 0 }
  let available = false
  for (const edgeId of result?.path_edges ?? []) {
    const contributions = result?.edge_cost_details?.[String(edgeId)]?.contributions
    if (!contributions) continue
    available = true
    Object.keys(totals).forEach((key) => {
      totals[key] += scaleCost(contributions[key]) ?? 0
    })
  }
  return available ? totals : null
}

function selectionRounds(result, names) {
  return (result?.selection_steps ?? result?.frontier_steps ?? [])
    .filter((step) => Array.isArray(step?.candidates))
    .map((step, index) => ({
      index: index + 1,
      from: nodeLabel(step.current, names),
      selected: nodeLabel(step.selected, names),
      selectedScore: finite(step.selected_score),
      candidates: step.candidates.map((candidate) => ({
        node: nodeLabel(candidate.node, names),
        reachable: candidate.reachable !== false,
        score: finite(candidate.score),
        selected: String(candidate.node) === String(step.selected),
      })),
    }))
}

export function buildRouteReasoning(result, names, edgeFeatures = []) {
  if (!result) return null
  const path = (result.path_nodes ?? []).map((node) => nodeLabel(node, names))
  const metrics = result.metrics ?? {}
  const permutationsEvaluated = finite(metrics.permutations_evaluated)
  const permutationsPossible = finite(metrics.permutations_possible)

  return {
    status: result.status,
    path,
    method: algorithmMethod(result),
    objective: objective(result),
    figures: [
      { label: 'Quãng đường', value: finite(metrics.total_distance_km), unit: 'km' },
      { label: 'Thời gian di chuyển', value: finite(metrics.total_time_min), unit: 'phút' },
      { label: 'Chi phí kịch bản', value: scaleCost(metrics.total_cost), unit: '' },
      { label: 'Tổng rủi ro', value: finite(metrics.total_risk), unit: '' },
      { label: 'Số đường đã chọn', value: finite(metrics.path_edge_count), unit: '' },
      { label: 'Số nút đã khám phá', value: finite(metrics.explored_nodes), unit: '' },
      { label: 'Thời gian xử lý', value: finite(metrics.processing_time_ms), unit: 'ms' },
    ].filter(({ value }) => value != null),
    trace: traceStatistics(result, edgeFeatures),
    segments: selectedSegments(result, names),
    formula: result.edge_cost_formula ?? null,
    contributions: formulaContributions(result),
    selectionRounds: selectionRounds(result, names),
    permutations: permutationsEvaluated == null && permutationsPossible == null
      ? null
      : { evaluated: permutationsEvaluated, possible: permutationsPossible },
  }
}
