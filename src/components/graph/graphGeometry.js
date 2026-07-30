export function getLineCoordinates(geometry) {
  if (!geometry) return []
  if (geometry.type === 'LineString') return [geometry.coordinates]
  if (geometry.type === 'MultiLineString') return geometry.coordinates
  return []
}

export function lineToPath(line, project) {
  return line
    .map((coordinate, index) => {
      const [x, y] = project(coordinate)
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
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
      })),
    }
  })
}
