export function getLineCoordinates(geometry) {
  if (!geometry) return []
  if (geometry.type === 'LineString') return [geometry.coordinates]
  if (geometry.type === 'MultiLineString') return geometry.coordinates
  return []
}

export function isHighTraffic(value) {
  const congestion = Number(value)
  return Number.isFinite(congestion) && congestion >= 3
}

export function lineToPath(line, project) {
  return line
    .map((coordinate, index) => {
      const [x, y] = project(coordinate)
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

export function getLineLabelPosition(line, project, offset = 7) {
  const points = line.map(project)
  if (points.length < 2) return null

  const segments = []
  let totalLength = 0
  for (let index = 1; index < points.length; index += 1) {
    const [startX, startY] = points[index - 1]
    const [endX, endY] = points[index]
    const length = Math.hypot(endX - startX, endY - startY)
    if (length === 0) continue
    segments.push({ startX, startY, endX, endY, length })
    totalLength += length
  }
  if (segments.length === 0) return null

  const midpoint = totalLength / 2
  let distance = 0
  const segment =
    segments.find((candidate) => {
      distance += candidate.length
      return distance >= midpoint
    }) ?? segments.at(-1)
  const distanceBeforeSegment = distance - segment.length
  const ratio = Math.max(
    0,
    Math.min(1, (midpoint - distanceBeforeSegment) / segment.length),
  )
  const deltaX = segment.endX - segment.startX
  const deltaY = segment.endY - segment.startY
  const x = segment.startX + deltaX * ratio
  const y = segment.startY + deltaY * ratio
  let angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI
  if (angle > 90) angle -= 180
  if (angle < -90) angle += 180

  return {
    x: x + (-deltaY / segment.length) * offset,
    y: y + (deltaX / segment.length) * offset,
    angle,
  }
}

export function createDrawableEdges(features, project) {
  if (!project) return []

  return features.map((feature, featureIndex) => {
    const properties = feature.properties ?? {}
    const edgeId = String(properties.edge_id ?? featureIndex)

    return {
      edgeId,
      fromNode: String(properties.from_node ?? ''),
      toNode: String(properties.to_node ?? ''),
      closed: properties.closed === true,
      congestion: Number(properties.congestion_level ?? 0),
      paths: getLineCoordinates(feature.geometry).map((line, lineIndex) => ({
        id: `${edgeId}-${featureIndex}-${lineIndex}`,
        value: lineToPath(line, project),
        label: getLineLabelPosition(line, project),
      })),
    }
  })
}
