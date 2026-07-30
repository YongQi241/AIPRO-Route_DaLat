export function createNodeNameLookup(nodesGeoJson) {
  return new Map(
    (nodesGeoJson?.features ?? []).map(({ properties = {} }) => [
      String(properties.node_id),
      properties.name_vi ?? properties.name_en ?? properties.node_id,
    ]),
  )
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
