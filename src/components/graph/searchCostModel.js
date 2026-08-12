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

export function formatSearchCost(value, fallback = 'không xác định') {
  const scaled = scaleCost(value)
  return scaled == null
    ? fallback
    : scaled.toLocaleString(undefined, { maximumFractionDigits: 3 })
}
