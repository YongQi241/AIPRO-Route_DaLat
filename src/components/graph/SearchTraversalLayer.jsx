import { useMemo } from 'react'
import { createDrawableEdges } from './graphGeometry'
import './SearchTraversalLayer.css'

function resolveEdges(edgeLookup, edgeIds, kind) {
  return edgeIds
    .map((edgeId, highlightIndex) => {
      const edge = edgeLookup.get(String(edgeId))
      return edge ? { ...edge, highlightIndex, kind } : null
    })
    .filter(Boolean)
}

function EdgePaths({ edge, keyPrefix }) {
  return edge.paths.map((path) => (
    <path
      key={`${keyPrefix}-${edge.highlightIndex}-${path.id}`}
      className={[
        'search-traversal-layer__edge',
        `search-traversal-layer__edge--${edge.kind}`,
      ].join(' ')}
      d={path.value}
    >
      <title>
        {edge.kind === 'candidate'
          ? 'Possible directed successor'
          : edge.kind === 'active'
            ? 'Active edge relaxation'
            : 'Inferred path to current node'}
        : {edge.fromNode} → {edge.toNode} ({edge.edgeId})
      </title>
    </path>
  ))
}

export default function SearchTraversalLayer({
  features = [],
  project,
  branchEdgeIds = [],
  candidateEdgeIds = [],
  activeEdgeId = null,
}) {
  const highlights = useMemo(() => {
    if (!project) return { branch: [], candidate: [], active: [] }

    const edgeLookup = new Map(
      createDrawableEdges(features, project).map((edge) => [edge.edgeId, edge]),
    )

    return {
      branch: resolveEdges(edgeLookup, branchEdgeIds, 'branch'),
      candidate: resolveEdges(edgeLookup, candidateEdgeIds, 'candidate'),
      active:
        activeEdgeId == null
          ? []
          : resolveEdges(edgeLookup, [activeEdgeId], 'active'),
    }
  }, [activeEdgeId, branchEdgeIds, candidateEdgeIds, features, project])

  if (
    highlights.branch.length === 0 &&
    highlights.candidate.length === 0 &&
    highlights.active.length === 0
  ) {
    return null
  }

  return (
    <g
      className="search-traversal-layer"
      aria-label="Inferred relaxation playback"
    >
      <defs>
        <filter
          id="search-traversal-glow"
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
        >
          <feGaussianBlur stdDeviation="1.75" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g aria-label="Path to current node">
        {highlights.branch.map((edge) => (
          <EdgePaths
            key={`branch-${edge.edgeId}`}
            edge={edge}
            keyPrefix="branch"
          />
        ))}
      </g>
      <g aria-label="Candidate outgoing edges">
        {highlights.candidate.map((edge) => (
          <EdgePaths
            key={`candidate-${edge.edgeId}`}
            edge={edge}
            keyPrefix="candidate"
          />
        ))}
      </g>
      <g aria-label="Active edge relaxation">
        {highlights.active.map((edge) => (
          <EdgePaths
            key={`active-${edge.edgeId}`}
            edge={edge}
            keyPrefix="active"
          />
        ))}
      </g>
    </g>
  )
}
