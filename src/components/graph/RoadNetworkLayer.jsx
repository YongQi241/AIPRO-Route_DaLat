import { useMemo } from 'react'
import { createDrawableEdges } from './graphGeometry'
import { formatNodeNumber } from '../results/resultFormatting'
import './RoadNetworkLayer.css'

export default function RoadNetworkLayer({
  features = [],
  project,
  onEdgeHover,
  hoveredEdgeId = null,
}) {
  const drawableEdges = useMemo(
    () => createDrawableEdges(features, project),
    [features, project],
  )

  return (
    <g className="road-network-layer" aria-label="Mạng lưới đường">
      <g className="road-network-layer__base">
        {drawableEdges.flatMap((edge) =>
          edge.paths.map((path) => {
            const className = [
              'road-network-layer__edge',
              edge.closed && 'road-network-layer__edge--closed',
              edge.congestion >= 4 && 'road-network-layer__edge--congested',
              edge.edgeId === hoveredEdgeId &&
                'road-network-layer__edge--hovered',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <g key={path.id}>
                <path
                  className={className}
                  d={path.value}
                  aria-label={`${edge.edgeId}: ${formatNodeNumber(edge.fromNode)} đến ${formatNodeNumber(edge.toNode)}`}
                />
                <path
                  className="road-network-layer__edge-hitbox"
                  d={path.value}
                  aria-hidden="true"
                  onPointerEnter={(event) => onEdgeHover?.(edge, event)}
                  onPointerLeave={() => onEdgeHover?.(null)}
                />
              </g>
            )
          }),
        )}
      </g>
    </g>
  )
}
