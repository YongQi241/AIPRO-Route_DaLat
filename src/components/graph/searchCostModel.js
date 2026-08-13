import { scaleCost } from '../results/resultFormatting.js'

export const SEARCH_COST_MODEL = Object.freeze({
  ASTAR: 'astar',
  CUMULATIVE_G: 'cumulative-g',
  GENERIC: 'generic',
})

function normalizeAlgorithm(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[‐‑–—]/gu, '-')
    .replace(/\s+/gu, ' ')
}

function finiteNumber(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function getSearchCostModel(algorithm, selectionRule = null) {
  const normalized = normalizeAlgorithm(algorithm)

  if (
    normalized === 'dijkstra' ||
    normalized === 'ucs' ||
    normalized === 'uniform-cost search' ||
    normalized === 'uniform cost search'
  ) {
    return SEARCH_COST_MODEL.CUMULATIVE_G
  }

  if (
    normalized === 'astar' ||
    normalized === 'a*' ||
    normalized === 'a* search'
  ) {
    return SEARCH_COST_MODEL.ASTAR
  }

  if (selectionRule === 'lowest_g_cost') {
    return SEARCH_COST_MODEL.CUMULATIVE_G
  }
  if (selectionRule === 'lowest_f_cost') {
    return SEARCH_COST_MODEL.ASTAR
  }

  return SEARCH_COST_MODEL.GENERIC
}

export function getSearchDecisionCost(values, costModel) {
  if (!values) return null

  const gCost = finiteNumber(values.gCost)
  const hCost = finiteNumber(values.hCost)
  const fCost = finiteNumber(values.fCost)
  const priority = finiteNumber(values.priority)

  if (costModel === SEARCH_COST_MODEL.CUMULATIVE_G) {
    return gCost ?? priority
  }

  if (costModel === SEARCH_COST_MODEL.ASTAR) {
    return fCost ??
      (gCost != null && hCost != null ? gCost + hCost : null) ??
      priority ??
      gCost ??
      hCost
  }

  return fCost ??
    (gCost != null && hCost != null ? gCost + hCost : null) ??
    priority ??
    gCost ??
    hCost
}

function resolveSearchWeight(weightUsed, optimization) {
  if (weightUsed) return String(weightUsed).toLowerCase()

  const normalizedOptimization = String(optimization ?? '').toLowerCase()
  if (['shortest', 'distance'].includes(normalizedOptimization)) {
    return 'distance_km'
  }
  if (['fastest', 'time'].includes(normalizedOptimization)) {
    return 'adjusted_time_min'
  }
  return 'route_cost'
}

export function formatSearchCost(
  value,
  {
    weightUsed = null,
    weight_used: resultWeightUsed = null,
    optimization = null,
    fallback = 'không xác định',
  } = {},
) {
  const weight = resolveSearchWeight(weightUsed ?? resultWeightUsed, optimization)
  const number = weight === 'route_cost' ? scaleCost(value) : finiteNumber(value)
  if (number == null) return fallback

  const formatted = number.toLocaleString(undefined, { maximumFractionDigits: 3 })
  if (weight === 'distance_km') return `${formatted} km`
  if (weight === 'adjusted_time_min') return `${formatted} phút`
  return formatted
}
