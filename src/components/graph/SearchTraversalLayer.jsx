import { useMemo } from 'react'
import { createDrawableEdges } from './graphGeometry'
import './SearchTraversalLayer.css'

export default function SearchTraversalLayer({
  features = [],
  project,
  edgeIds = [],
}) {
  const branchEdges = useMemo(() => {
    if (!project || edgeIds.length === 0) return []

    const edgeLookup = new Map(
      createDrawableEdges(features, project).map((edge) => [edge.edgeId, edge]),
    )

    return edgeIds
      .map((edgeId, branchIndex) => {
        const edge = edgeLookup.get(String(edgeId))
        return edge ? { ...edge, branchIndex } : null
      })
      .filter(Boolean)
  }, [edgeIds, features, project])

  if (branchEdges.length === 0) return null

  return (
    <g
      className="search-traversal-layer"
      aria-label="Active search branch"
    >
      <defs>
        <filter
          id="search-traversal-glow"
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
        >
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {branchEdges.flatMap((edge) =>
        edge.paths.map((path) => (
          <path
            key={`search-${edge.branchIndex}-${path.id}`}
            className="search-traversal-layer__edge"
            d={path.value}
          >
            <title>
              Search branch: {edge.fromNode} → {edge.toNode} ({edge.edgeId})
            </title>
          </path>
        )),
      )}
    </g>
  )
}
