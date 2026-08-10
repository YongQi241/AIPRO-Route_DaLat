import { scaleCost } from '../results/resultFormatting.js'

function number(value, digits = 6) {
  const parsed = Number(value)
  return Number.isFinite(parsed)
    ? parsed.toLocaleString(undefined, { maximumFractionDigits: digits })
    : '—'
}

export function formatEdgeCostCalculation(detail, formula) {
  if (!detail || detail.closed) {
    return {
      expression: formula?.expression ?? 'Công thức chi phí tuyến theo kịch bản',
      substitution: 'Không tính toán: cạnh này bị đóng trong kịch bản.',
      result: null,
    }
  }

  const weights = formula?.weights ?? {}
  const normalized = detail.normalized ?? {}
  const terms = [
    ['distance', 'α'],
    ['time', 'β'],
    ['congestion', 'γ'],
    ['risk', 'δ'],
  ]

  return {
    expression: 'Chi phí',
    substitution: `cost =(${terms
      .map(
        ([key, symbol]) =>
          `${symbol} ${number(weights[key], 3)} × ${number(normalized[key])}`,
      )
      .join(' + ')})`,
    contributions: terms
      .map(([key]) => `${({ distance: 'quãng đường', time: 'thời gian', congestion: 'ùn tắc', risk: 'rủi ro' })[key]} ${number(scaleCost(detail.contributions?.[key]))}`)
      .join(' + '),
    result: detail.route_cost == null ? null : number(scaleCost(detail.route_cost)),
  }
}

export { number as formatEdgeDetailNumber }
