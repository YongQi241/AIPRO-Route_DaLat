import { useMemo } from 'react'
import { describeNodeConnections } from './nodeConnections'
import './GraphNodeLayer.css'

function resolveNodeState(
  nodeId,
  currentNodeId,
  frontierNodeIds,
  visitedNodeIds,
  finalPathNodeIds,
  showFinalPath,
) {
  if (showFinalPath && finalPathNodeIds.has(nodeId)) return 'final'
  if (nodeId === currentNodeId) return 'current'
  if (frontierNodeIds.has(nodeId)) return 'frontier'
  if (visitedNodeIds.has(nodeId)) return 'visited'
  return 'unvisited'
}

function getNodeNotation(nodeId) {
  const numericPart = String(nodeId).match(/\d+$/)?.[0]
  return numericPart ?? String(nodeId)
}

const NODE_STATE_LABELS = {
  final: 'thuộc tuyến cuối',
  current: 'hiện tại',
  frontier: 'trên biên',
  visited: 'đã thăm',
  unvisited: 'chưa thăm',
}

export default function GraphNodeLayer({
  nodes = [],
  currentNodeId = null,
  frontierNodeIds = [],
  visitedNodeIds = [],
  evaluatedNodeId = null,
  finalPathNodeIds = [],
  showFinalPath = false,
  markerScale = 1,
}) {
  const frontierSet = useMemo(
    () => new Set(frontierNodeIds),
    [frontierNodeIds],
  )
  const visitedSet = useMemo(
    () => new Set(visitedNodeIds),
    [visitedNodeIds],
  )
  const finalPathSet = useMemo(
    () => new Set(finalPathNodeIds),
    [finalPathNodeIds],
  )
  return (
    <g className="graph-node-layer" aria-label="Các địa điểm">
      {nodes.map((node) => {
        const nodeState = resolveNodeState(
          node.id,
          currentNodeId,
          frontierSet,
          visitedSet,
          finalPathSet,
          showFinalPath,
        )
        const hoverDescription = describeNodeConnections(node)
        return (
          <g
            key={node.id}
            className={`graph-node-layer__node graph-node-layer__node--${nodeState}`}
            data-node-id={node.id}
            data-node-state={nodeState}
            transform={`translate(${node.x} ${node.y}) scale(${markerScale})`}
            tabIndex="0"
            role="img"
            aria-label={`${hoverDescription.replaceAll('\n', '. ')}; ${NODE_STATE_LABELS[nodeState]}`}
          >
            <title>{hoverDescription}</title>
            {node.id === evaluatedNodeId && (
              <circle
                className="graph-node-layer__evaluation-ring"
                r="15"
                aria-hidden="true"
              />
            )}
            {nodeState === 'current' && (
              <circle
                className="graph-node-layer__pulse"
                r="14"
                aria-hidden="true"
              />
            )}
            <circle className="graph-node-layer__marker" r="10" />
            <text
              className="graph-node-layer__notation"
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="central"
              aria-hidden="true"
            >
              {getNodeNotation(node.id)}
            </text>
          </g>
        )
      })}
    </g>
  )
}
