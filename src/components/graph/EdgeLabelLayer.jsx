import { useMemo } from 'react'
import { createDrawableEdges } from './graphGeometry'
import { formatCost } from '../results/resultFormatting'
import './EdgeLabelLayer.css'

export default function EdgeLabelLayer({
  features = [],
  project,
  edgeCosts = new Map(),
  closedEdgeIds = new Set(),
  onEdgeHover,
  labelScale = 1,
}) {
  const drawableEdges = useMemo(
    () => createDrawableEdges(features, project),
    [features, project],
  )

  return (
    <g className="edge-label-layer" aria-label="Số hiệu cạnh">
      {drawableEdges.flatMap((edge) =>
        edge.paths.map((path) =>
          path.label ? (
            <text
              key={`label-${path.id}`}
              className="edge-label-layer__label"
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="central"
              transform={`translate(${path.label.x} ${path.label.y}) rotate(${path.label.angle}) scale(${labelScale})`}
              aria-hidden="true"
              onPointerEnter={(event) => onEdgeHover?.(edge, event)}
              onPointerLeave={() => onEdgeHover?.(null)}
            >
              {edge.edgeId}
              {closedEdgeIds.has(edge.edgeId)
                ? ' · closed'
                : edgeCosts.has(edge.edgeId)
                  ? ` · cost=${formatCost(edgeCosts.get(edge.edgeId))}`
                  : ' · không có giá trị chi phí'}
            </text>
          ) : null,
        ),
      )}
    </g>
  )
}
