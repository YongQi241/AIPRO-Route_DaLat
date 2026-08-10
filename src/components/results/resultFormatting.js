export function formatNodeNumber(value) {
  const text = String(value ?? '')
  return text.match(/\d+/g)?.join('') ?? text
}

export const COST_DISPLAY_SCALE = 100

export function scaleCost(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number * COST_DISPLAY_SCALE : null
}

export function formatCost(value, maximumFractionDigits = 3) {
  const scaled = scaleCost(value)
  return scaled == null
    ? 'Không có giá trị chi phí'
    : formatNumber(scaled, maximumFractionDigits)
}

export function createNodeNameLookup(nodesGeoJson) {
  return new Map(
    (nodesGeoJson?.features ?? []).map(({ properties = {} }) => [
      String(properties.node_id),
      formatNodeNumber(properties.node_id),
    ]),
  )
}

const ALGORITHM_LABELS = {
  bfs: 'Breadth-First Search (BFS)',
  dfs: 'Depth-First Search (DFS)',
  ucs: 'Uniform-Cost Search (UCS)',
  dijkstra: 'Dijkstra',
  'a*': 'A* Search',
  astar: 'A* Search',
  'breadth-first search': 'Breadth-First Search (BFS)',
  'depth-first search': 'Depth-First Search (DFS)',
  'uniform-cost search': 'Uniform-Cost Search (UCS)',
  'greedy best-first': 'Greedy Best-First',
  'greedy best-first search': 'Greedy Best-First Search',
  'hill climbing': 'Hill Climbing',
  'nearest neighbor': 'Nearest Neighbor',
  'brute force tsp': 'Brute Force TSP',
}

const OPTIMIZATION_LABELS = {
  balanced: 'Balanced',
  shortest: 'Shortest',
  distance: 'Shortest',
  fastest: 'Fastest',
  time: 'Fastest',
  safest: 'Safest',
  cost: 'Cheapest',
}

export function formatAlgorithmLabel(value) {
  const text = String(value ?? '')
  return ALGORITHM_LABELS[text.toLowerCase()] ?? text
}

export function formatOptimizationLabel(value) {
  const text = String(value ?? '')
  return OPTIMIZATION_LABELS[text.toLowerCase()] ?? text
}

export function formatNumber(value, maximumFractionDigits = 2) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits,
  }).format(number)
}

export function formatMetric(value, unit, maximumFractionDigits = 2) {
  const formatted = formatNumber(value, maximumFractionDigits)
  return formatted === '—' ? formatted : `${formatted} ${unit}`
}
