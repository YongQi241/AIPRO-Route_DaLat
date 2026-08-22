import { useMemo } from 'react'
import { createDrawableEdges, isHighTraffic } from './graphGeometry'
import { formatNodeNumber } from '../results/resultFormatting'
import './FinalRouteLayer.css'

export default function FinalRouteLayer({
  features = [],
  project,
  pathEdgeIds = [],
  segments = [],
  visible = false,
  onEdgeHover,
}) {
  const orderedRoute = useMemo(() => {
    if (!visible || !project || pathEdgeIds.length === 0) return []

    const edgeLookup = new Map(
      createDrawableEdges(features, project).map((edge) => [
        edge.edgeId,
        edge,
      ]),
    )
    const segmentLookup = new Map(
      segments.map((segment) => [String(segment.edge_id), segment]),
    )

    return pathEdgeIds
      .map((edgeId, routeIndex) => {
        const normalizedId = String(edgeId)
        const edge = edgeLookup.get(normalizedId)

        if (!edge) return null

        return {
          ...edge,
          routeIndex,
          segment: segmentLookup.get(normalizedId),
        }
      })
      .filter(Boolean)
  }, [features, pathEdgeIds, project, segments, visible])

  if (orderedRoute.length === 0) return null

  return (
    <g className="final-route-layer" aria-label="Tuyến đường kết quả">
      <defs>
        <filter
          id="final-route-glow"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {orderedRoute.flatMap((edge) =>
        edge.paths.map((path) => {
          const congestion = Number(
            edge.segment?.congestion_level ?? edge.congestion,
          )
          const risk = Number(edge.segment?.risk ?? 0)
          const hasHighTraffic = isHighTraffic(congestion)
          const isWarning = risk > 0

          return (
            <path
              key={`final-${edge.routeIndex}-${path.id}`}
              className={[
                'final-route-layer__edge',
                hasHighTraffic && 'final-route-layer__edge--high-traffic',
                isWarning && 'final-route-layer__edge--warning',
              ]
                .filter(Boolean)
                .join(' ')}
              d={path.value}
              style={{ '--route-index': edge.routeIndex }}
              aria-label={`Đoạn ${edge.routeIndex + 1}: ${edge.edgeId}, ${formatNodeNumber(edge.fromNode)} đến ${formatNodeNumber(edge.toNode)}`}
              onPointerEnter={(event) => onEdgeHover?.(edge, event)}
              onPointerLeave={() => onEdgeHover?.(null)}
            />
          )
        }),
      )}
    </g>
  )
}
