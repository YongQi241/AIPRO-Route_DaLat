import { getOptimizationFormula } from './scenarioCostFormula.js'

const EDGE_DATA_URL = '/data/generated/edges.csv'
const CONDITION_DATA_URL = '/data/generated/edge_conditions.csv'

let localDataRequest = null

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      row.push(field)
      field = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(field)
      if (row.some((value) => value !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }
  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const headers = (rows.shift() ?? []).map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, '') : header,
  )
  return rows.map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? '']),
    ),
  )
}

function numeric(value, fallback = 0) {
  if (value == null || String(value).trim() === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function truthy(value) {
  return ['true', '1', 'yes'].includes(String(value).trim().toLowerCase())
}

function normalize(values) {
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  if (maximum === minimum) return values.map(() => 0)
  return values.map((value) => (value - minimum) / (maximum - minimum))
}

export function calculateScenarioEdgeCosts(
  edges,
  conditions,
  scenarioId,
  optimization,
) {
  const formula = getOptimizationFormula(optimization)
  const conditionByEdge = new Map(
    conditions
      .filter(({ scenario_id }) => scenario_id === scenarioId)
      .map((condition) => [String(condition.edge_id), condition]),
  )
  const prepared = edges.map((edge) => {
    const edgeId = String(edge.edge_id)
    const condition = conditionByEdge.get(edgeId) ?? {}
    const closed = truthy(edge.closed) || truthy(condition.closed)
    const distance = numeric(edge.distance_km)
    const baseTime = numeric(edge.base_time_min)
    const multiplier = numeric(condition.time_multiplier, 1)
    const baseRisk = numeric(edge.risk_score)
    const rainRisk = numeric(condition.rain_risk)
    const fogRisk = numeric(condition.fog_risk)
    const construction = numeric(condition.construction_penalty)

    return {
      edgeId,
      closed,
      distance,
      baseTime,
      multiplier,
      adjustedTime: baseTime * multiplier,
      baseCongestion: numeric(edge.congestion_level),
      scenarioCongestion: numeric(
        condition.congestion_level,
        numeric(edge.congestion_level),
      ),
      baseRisk,
      rainRisk,
      fogRisk,
      construction,
      totalRisk: baseRisk + rainRisk + fogRisk + construction,
      scenarioName: condition.scenario_name ?? scenarioId,
    }
  })
  const open = prepared.filter(({ closed }) => !closed)
  const distanceNorm = normalize(open.map(({ distance }) => distance))
  const timeNorm = normalize(open.map(({ adjustedTime }) => adjustedTime))
  const riskNorm = normalize(open.map(({ totalRisk }) => totalRisk))
  const openIndex = new Map(open.map(({ edgeId }, index) => [edgeId, index]))
  const edgeCosts = {}
  const edgeCostDetails = {}

  prepared.forEach((edge) => {
    const detail = {
      closed: edge.closed,
      distance_km: edge.distance,
      base_time_min: edge.baseTime,
      base_congestion: edge.baseCongestion,
      base_risk: edge.baseRisk,
      scenario_name: edge.scenarioName,
      scenario_congestion: edge.scenarioCongestion,
      time_multiplier: edge.multiplier,
      rain_risk: edge.rainRisk,
      fog_risk: edge.fogRisk,
      construction_penalty: edge.construction,
    }
    const index = openIndex.get(edge.edgeId)
    if (index != null) {
      const normalized = {
        distance: distanceNorm[index],
        time: timeNorm[index],
        congestion: edge.scenarioCongestion / 5,
        risk: riskNorm[index],
      }
      const contributions = Object.fromEntries(
        Object.keys(formula.weights).map((key) => [
          key,
          formula.weights[key] * normalized[key],
        ]),
      )
      const routeCost = Object.values(contributions).reduce(
        (total, value) => total + value,
        0,
      )
      detail.adjusted_time_min = edge.adjustedTime
      detail.effective_congestion = edge.scenarioCongestion
      detail.total_risk = edge.totalRisk
      detail.normalized = normalized
      detail.contributions = contributions
      detail.route_cost = routeCost
      edgeCosts[edge.edgeId] = Number(routeCost.toFixed(6))
    }
    edgeCostDetails[edge.edgeId] = detail
  })

  return {
    status: 'success',
    source: 'local_csv',
    scenario_id: scenarioId,
    optimization,
    edge_costs: edgeCosts,
    closed_edge_ids: prepared
      .filter(({ closed }) => closed)
      .map(({ edgeId }) => edgeId),
    edge_cost_details: edgeCostDetails,
    edge_cost_formula: formula,
    edge_cost_kind: 'scenario_route_cost',
  }
}

async function loadLocalData() {
  if (!localDataRequest) {
    localDataRequest = Promise.all(
      [EDGE_DATA_URL, CONDITION_DATA_URL].map(async (url) => {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Không thể tải ${url}.`)
        return parseCsv(await response.text())
      }),
    ).catch((error) => {
      localDataRequest = null
      throw error
    })
  }
  return localDataRequest
}

export async function fetchScenarioEdgeCosts(
  scenarioId,
  optimization,
  { signal } = {},
) {
  const [edges, conditions] = await loadLocalData()
  if (signal?.aborted) {
    throw new DOMException('Yêu cầu đã bị hủy.', 'AbortError')
  }
  return calculateScenarioEdgeCosts(edges, conditions, scenarioId, optimization)
}
