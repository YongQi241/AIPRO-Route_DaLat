const DEFAULT_VIEWBOX = {
  width: 1000,
  height: 650,
  paddingX: 80,
  paddingY: 70,
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

// Deterministic Fruchterman-Reingold spring layout. The simulation uses the
// classic inverse-distance repulsion and squared-distance attraction forces.
export function createFruchtermanReingoldLayout(
  nodeFeatures = [],
  edgeFeatures = [],
  rootNodeId = '',
  viewbox = DEFAULT_VIEWBOX,
) {
  const nodeIds = nodeFeatures
    .map((feature, index) =>
      String(feature?.properties?.node_id ?? index),
    )
    .sort()
  if (nodeIds.length === 0) {
    return { positions: new Map(), edgeFeatures: [] }
  }

  const knownNodes = new Set(nodeIds)
  const links = []
  const seenLinks = new Set()

  edgeFeatures.forEach((feature) => {
    const fromNode = String(feature?.properties?.from_node ?? '')
    const toNode = String(feature?.properties?.to_node ?? '')
    if (
      !knownNodes.has(fromNode) ||
      !knownNodes.has(toNode) ||
      fromNode === toNode
    ) {
      return
    }
    const key = [fromNode, toNode].sort().join('\u0000')
    if (seenLinks.has(key)) return
    seenLinks.add(key)
    links.push([fromNode, toNode])
  })

  const width = viewbox.width - viewbox.paddingX * 2
  const height = viewbox.height - viewbox.paddingY * 2
  const positions = initializePositions(
    nodeIds,
    rootNodeId,
    width,
    height,
  )
  relaxPositions(positions, nodeIds, links, width, height)
  fitPositions(positions, width, height, viewbox.paddingX, viewbox.paddingY)

  return {
    positions,
    edgeFeatures: positionEdges(edgeFeatures, positions),
  }
}

export const createTopologyLayout = createFruchtermanReingoldLayout
export const createTreeLayout = createFruchtermanReingoldLayout

function initializePositions(nodeIds, rootNodeId, width, height) {
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) * 0.38
  const preferredRoot = String(rootNodeId)
  const ordered = [
    ...(nodeIds.includes(preferredRoot) ? [preferredRoot] : []),
    ...nodeIds.filter((nodeId) => nodeId !== preferredRoot),
  ]

  return new Map(
    ordered.map((nodeId, index) => {
      if (index === 0 && nodeId === preferredRoot) {
        return [nodeId, { x: centerX, y: centerY }]
      }
      const angle = index * GOLDEN_ANGLE
      const radialScale = Math.sqrt((index + 1) / ordered.length)
      return [
        nodeId,
        {
          x: centerX + Math.cos(angle) * radius * radialScale,
          y: centerY + Math.sin(angle) * radius * radialScale,
        },
      ]
    }),
  )
}

function relaxPositions(positions, nodeIds, links, width, height) {
  const idealDistance = Math.sqrt(
    (width * height) / Math.max(nodeIds.length, 1),
  )
  let temperature = Math.min(width, height) * 0.12

  for (let iteration = 0; iteration < 260; iteration += 1) {
    const movement = new Map(
      nodeIds.map((nodeId) => [nodeId, { x: 0, y: 0 }]),
    )

    for (let leftIndex = 0; leftIndex < nodeIds.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < nodeIds.length;
        rightIndex += 1
      ) {
        const leftId = nodeIds[leftIndex]
        const rightId = nodeIds[rightIndex]
        const delta = vectorBetween(
          positions.get(leftId),
          positions.get(rightId),
          leftIndex,
          rightIndex,
        )
        const force = (idealDistance * idealDistance) / delta.distance
        applyForce(movement.get(leftId), delta, -force)
        applyForce(movement.get(rightId), delta, force)
      }
    }

    links.forEach(([fromNode, toNode]) => {
      const delta = vectorBetween(
        positions.get(fromNode),
        positions.get(toNode),
      )
      const force = (delta.distance * delta.distance) / idealDistance
      applyForce(movement.get(fromNode), delta, force)
      applyForce(movement.get(toNode), delta, -force)
    })

    nodeIds.forEach((nodeId) => {
      const position = positions.get(nodeId)
      const delta = movement.get(nodeId)
      const magnitude = Math.max(Math.hypot(delta.x, delta.y), 0.001)
      const step = Math.min(magnitude, temperature)
      position.x = clamp(
        position.x + (delta.x / magnitude) * step,
        0,
        width,
      )
      position.y = clamp(
        position.y + (delta.y / magnitude) * step,
        0,
        height,
      )
    })

    temperature *= 0.985
  }
}

function vectorBetween(from, to, leftIndex = 0, rightIndex = 1) {
  let x = to.x - from.x
  let y = to.y - from.y
  let distance = Math.hypot(x, y)
  if (distance < 0.001) {
    const angle = (leftIndex + rightIndex + 1) * GOLDEN_ANGLE
    x = Math.cos(angle)
    y = Math.sin(angle)
    distance = 1
  }
  return { x: x / distance, y: y / distance, distance }
}

function applyForce(target, direction, force) {
  target.x += direction.x * force
  target.y += direction.y * force
}

function fitPositions(positions, width, height, paddingX, paddingY) {
  const values = [...positions.values()]
  const minX = Math.min(...values.map(({ x }) => x))
  const maxX = Math.max(...values.map(({ x }) => x))
  const minY = Math.min(...values.map(({ y }) => y))
  const maxY = Math.max(...values.map(({ y }) => y))
  const spanX = Math.max(maxX - minX, 1)
  const spanY = Math.max(maxY - minY, 1)

  positions.forEach((position, nodeId) => {
    positions.set(nodeId, [
      paddingX + ((position.x - minX) / spanX) * width,
      paddingY + ((position.y - minY) / spanY) * height,
    ])
  })
}

function positionEdges(edgeFeatures, positions) {
  const pairCounts = new Map()
  edgeFeatures.forEach((feature) => {
    const fromNode = String(feature?.properties?.from_node ?? '')
    const toNode = String(feature?.properties?.to_node ?? '')
    const key = [fromNode, toNode].sort().join('\u0000')
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
  })

  return edgeFeatures
    .map((feature) => {
      const fromNode = String(feature?.properties?.from_node ?? '')
      const toNode = String(feature?.properties?.to_node ?? '')
      const from = positions.get(fromNode)
      const to = positions.get(toNode)
      if (!from || !to) return null
      const pairKey = [fromNode, toNode].sort().join('\u0000')

      return {
        ...feature,
        geometry: {
          type: 'LineString',
          coordinates:
            fromNode === toNode
              ? selfLoop(from)
              : curvedEdge(
                  from,
                  to,
                  pairCounts.get(pairKey) > 1,
                ),
        },
      }
    })
    .filter(Boolean)
}

function curvedEdge(from, to, hasReverseEdge) {
  if (!hasReverseEdge) return [from, to]
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const length = Math.max(Math.hypot(dx, dy), 1)
  const offset = Math.min(18, length * 0.12)
  return [
    from,
    [
      (from[0] + to[0]) / 2 + (-dy / length) * offset,
      (from[1] + to[1]) / 2 + (dx / length) * offset,
    ],
    to,
  ]
}

function selfLoop([x, y]) {
  return [
    [x, y],
    [x + 22, y - 24],
    [x + 36, y],
    [x + 18, y + 15],
    [x, y],
  ]
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}
