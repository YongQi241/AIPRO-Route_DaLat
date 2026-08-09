function number(value, digits = 6) {
  const parsed = Number(value)
  return Number.isFinite(parsed)
    ? parsed.toLocaleString(undefined, { maximumFractionDigits: digits })
    : '—'
}

export function formatEdgeCostCalculation(detail, formula) {
  if (!detail || detail.closed) {
    return {
      expression: formula?.expression ?? 'Scenario route-cost formula',
      substitution: 'Not calculated: this edge is closed in the scenario.',
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
    expression:
      formula?.expression ??
      'cost = α·distance_norm + β·time_norm + γ·congestion_norm + δ·risk_norm',
    substitution: `cost = ${terms
      .map(
        ([key, symbol]) =>
          `${symbol} ${number(weights[key], 3)} × ${number(normalized[key])}`,
      )
      .join(' + ')}`,
    contributions: terms
      .map(([key]) => `${key} ${number(detail.contributions?.[key])}`)
      .join(' + '),
    result: number(detail.route_cost),
  }
}

export { number as formatEdgeDetailNumber }
