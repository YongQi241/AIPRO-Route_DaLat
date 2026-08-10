import { formatNodeNumber } from '../results/resultFormatting.js'

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
  const heading = formatNodeNumber(node?.id ?? 'Không xác định')
  if (connections.length === 0) return `${heading}\nKhông có cạnh kết nối.`

  const outgoing = connections.filter(
    ({ direction }) => direction === 'outgoing',
  )
  const incoming = connections.filter(
    ({ direction }) => direction === 'incoming',
  )
  const formatOutgoing = ({ edgeId, toNode }) =>
    `${edgeId} → ${formatNodeNumber(toNode)}`
  const formatIncoming = ({ edgeId, fromNode }) =>
    `${edgeId} ← ${formatNodeNumber(fromNode)}`

  return [
    heading,
    `Đi ra (${outgoing.length}): ${
      outgoing.length > 0 ? outgoing.map(formatOutgoing).join(', ') : 'không có'
    }`,
    `Đi vào (${incoming.length}): ${
      incoming.length > 0 ? incoming.map(formatIncoming).join(', ') : 'không có'
    }`,
  ].join('\n')
}
