import { useMemo } from 'react'
import { createDrawableEdges } from './graphGeometry'
import './EdgeLabelLayer.css'

export default function EdgeLabelLayer({ features = [], project }) {
  const drawableEdges = useMemo(
    () => createDrawableEdges(features, project),
    [features, project],
  )

  return (
    <g className="edge-label-layer" aria-label="Edge numbers">
      {drawableEdges.flatMap((edge) =>
        edge.paths.map((path) =>
          path.label ? (
            <text
              key={`label-${path.id}`}
              className="edge-label-layer__label"
              x={path.label.x}
              y={path.label.y}
              textAnchor="middle"
              dominantBaseline="central"
              transform={`rotate(${path.label.angle} ${path.label.x} ${path.label.y})`}
              aria-hidden="true"
            >
              {edge.edgeId}
            </text>
          ) : null,
        ),
      )}
    </g>
  )
}
