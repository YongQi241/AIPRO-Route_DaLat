import { useMemo } from 'react'
import { createDrawableEdges } from './graphGeometry'
import './RoadNetworkLayer.css'

export default function RoadNetworkLayer({
  features = [],
  project,
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
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <path key={path.id} className={className} d={path.value}>
                <title>
                  {edge.edgeId}: {edge.fromNode} → {edge.toNode}
                  {edge.closed
                    ? ' · closed'
                    : ` · congestion ${edge.congestion}`}
                </title>
              </path>
            )
          }),
        )}
      </g>

    </g>
  )
}
