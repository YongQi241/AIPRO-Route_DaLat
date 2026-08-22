const PROFILES = {
  shortest: [0.8, 0.15, 0.03, 0.02],
  distance: [0.8, 0.15, 0.03, 0.02],
  fastest: [0.1, 0.75, 0.1, 0.05],
  time: [0.1, 0.75, 0.1, 0.05],
  balanced: [0.2, 0.5, 0.15, 0.15],
  cost: [0.2, 0.5, 0.15, 0.15],
  safest: [0.1, 0.25, 0.1, 0.55],
}

export function getOptimizationFormula(optimization = 'balanced') {
  const requested = String(optimization).toLowerCase()
  const normalized = {
    distance: 'shortest',
    time: 'fastest',
    cost: 'balanced',
  }[requested] ?? requested
  const [distance, time, congestion, risk] =
    PROFILES[requested] ?? PROFILES.balanced

  return {
    optimization: normalized,
    expression:
      'cost = α·distance_norm + β·time_norm + γ·congestion_norm + δ·risk_norm',
    weights: { distance, time, congestion, risk },
  }
}

export function formatOptimizationFormula(formula) {
  const weights = formula.weights
  return `cost = ${weights.distance}·distance_norm + ${weights.time}·time_norm + ${weights.congestion}·congestion_norm + ${weights.risk}·risk_norm`
}
