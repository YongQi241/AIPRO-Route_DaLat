import { useMemo } from 'react'
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

export default function GraphNodeLayer({
  nodes = [],
  currentNodeId = null,
  frontierNodeIds = [],
  visitedNodeIds = [],
  finalPathNodeIds = [],
  showFinalPath = false,
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

        return (
          <g
            key={node.id}
            className={`graph-node-layer__node graph-node-layer__node--${nodeState}`}
            data-node-id={node.id}
            data-node-state={nodeState}
            transform={`translate(${node.x} ${node.y})`}
          >
            {nodeState === 'current' && (
              <circle
                className="graph-node-layer__pulse"
                r="15"
                aria-hidden="true"
              />
            )}
            <circle className="graph-node-layer__marker" r="8">
              <title>
                {node.id}: {node.name} · {nodeState}
              </title>
            </circle>
            <text x="12" y="-10" aria-hidden="true">
              {node.id}
            </text>
          </g>
        )
      })}
    </g>
  )
}
