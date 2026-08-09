export function createNodeConnectionLookup(edgeFeatures = []) {
  const lookup = new Map()

  edgeFeatures.forEach((feature, index) => {
    const properties = feature?.properties ?? {}
    const fromNode = String(properties.from_node ?? '')
    const toNode = String(properties.to_node ?? '')
    if (!fromNode || !toNode) return

    const connection = {
      edgeId: String(properties.edge_id ?? index),
      fromNode,
      toNode,
    }

    if (!lookup.has(fromNode)) lookup.set(fromNode, [])
    lookup.get(fromNode).push({ ...connection, direction: 'outgoing' })

    if (!lookup.has(toNode)) lookup.set(toNode, [])
    lookup.get(toNode).push({ ...connection, direction: 'incoming' })
  })

  return lookup
}

export function describeNodeConnections(node) {
  const connections = node?.connections ?? []
  const heading = `${node?.id ?? 'Unknown'}: ${node?.name ?? 'Unknown location'}`
  if (connections.length === 0) return `${heading}\nNo connected edges.`

  const outgoing = connections.filter(
    ({ direction }) => direction === 'outgoing',
  )
  const incoming = connections.filter(
    ({ direction }) => direction === 'incoming',
  )
  const formatOutgoing = ({ edgeId, toNode }) => `${edgeId} → ${toNode}`
  const formatIncoming = ({ edgeId, fromNode }) => `${edgeId} ← ${fromNode}`

  return [
    heading,
    `Outgoing (${outgoing.length}): ${
      outgoing.length > 0 ? outgoing.map(formatOutgoing).join(', ') : 'none'
    }`,
    `Incoming (${incoming.length}): ${
      incoming.length > 0 ? incoming.map(formatIncoming).join(', ') : 'none'
    }`,
  ].join('\n')
}
