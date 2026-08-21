const DEFAULT_API_URL = '/api/routes/solve'
const MOCK_RESULT_URL = new URL('../../data/mock-result.json', import.meta.url)

const ALGORITHM_LABELS = {
  bfs: 'BFS',
  dfs: 'DFS',
  ucs: 'UCS',
  dijkstra: 'Dijkstra',
  astar: 'A*',
  greedy: 'Greedy Best-First',
  hill_climbing: 'Hill Climbing',
  nearest_neighbor: 'Nearest Neighbor',
  brute_force_tsp: 'Brute Force TSP',
}

function createInvalidDemoResult(request) {
  return {
    status: 'invalid_input',
    algorithm:
      ALGORITHM_LABELS[request.algorithm] ?? request.algorithm?.toUpperCase(),
    scenario_id: request.scenario_id,
    optimization: request.optimization,
    start_node: request.start_node,
    goal_node: request.goal_node,
    path_nodes: [],
    path_edges: [],
    visited_order: [],
    frontier_steps: [],
    metrics: {},
    segments: [],
    explanation:
      'Chế độ minh họa chỉ chứa một kết quả mẫu ở giao diện và không tự tính tuyến đường.',
    message:
      'Chế độ minh họa chỉ hỗ trợ DL01 → DL09 và không có điểm trung gian. Hãy cấu hình VITE_ROUTE_API_URL để thử các yêu cầu khác.',
  }
}

async function parseResponse(response, sourceLabel) {
  if (!response.ok) {
    throw new Error(
      `${sourceLabel} trả về mã ${response.status} ${response.statusText}.`,
    )
  }

  const result = await response.json()
  if (!result?.status || !Array.isArray(result.path_nodes)) {
    throw new Error(`${sourceLabel} trả về cấu trúc kết quả không hợp lệ.`)
  }

  return result
}

async function requestBackendRoute(apiUrl, request) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  return parseResponse(response, 'API định tuyến')
}

async function requestDemoRoute(request) {
  const supportsDemoRequest =
    request.start_node === 'DL01' &&
    request.goal_node === 'DL09' &&
    (request.visit_nodes?.length ?? 0) === 0

  if (!supportsDemoRequest) return createInvalidDemoResult(request)

  const response = await fetch(MOCK_RESULT_URL)
  const fixture = await parseResponse(response, 'Dữ liệu mẫu minh họa')

  return {
    ...fixture,
    algorithm:
      ALGORITHM_LABELS[request.algorithm] ?? request.algorithm?.toUpperCase(),
    scenario_id: request.scenario_id,
    optimization: request.optimization,
  }
}

export async function solveRoute(request, { allowDemoFallback = true } = {}) {
  const configuredUrl = import.meta.env.VITE_ROUTE_API_URL?.trim()
  const apiUrl = configuredUrl || DEFAULT_API_URL

  try {
    return await requestBackendRoute(apiUrl, request)
  } catch (error) {
    if (!allowDemoFallback || configuredUrl || import.meta.env.PROD) throw error
    return requestDemoRoute(request)
  }
}
