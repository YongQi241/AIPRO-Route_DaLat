import { useMemo } from 'react'
import {
  describeCandidateEdgeDecision,
  getTraceEdgeState,
} from './edgeDecision'
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
      aria-label={`${edge.fromNode} to ${edge.toNode}: ${edge.reason ?? 'inferred path'}`}
    >
      <title>
        {edge.fromNode} → {edge.toNode} ({edge.edgeId}):{' '}
        {edge.reason ?? 'Inferred path to current node.'}
      </title>
    </path>
  ))
}

export default function SearchTraversalLayer({
  features = [],
  project,
  branchEdgeIds = [],
  candidateEdgeIds = [],
  evaluatedCandidateActions = [],
  finalPathEdgeIds = [],
}) {
  const highlights = useMemo(() => {
    if (!project) return { branch: [], trace: [] }

    const edgeLookup = new Map(
      createDrawableEdges(features, project).map((edge) => [edge.edgeId, edge]),
    )

    const withTraceState = (edge) => {
      const kind = getTraceEdgeState(
        edge.edgeId,
        evaluatedCandidateActions,
        finalPathEdgeIds,
      )
      const decisionReason = describeCandidateEdgeDecision(
        edge.edgeId,
        evaluatedCandidateActions,
      )

      return {
        ...edge,
        kind,
        reason:
          kind === 'chosen'
            ? `Finally chosen: this edge belongs to the returned route. ${decisionReason}`
            : decisionReason,
      }
    }

    return {
      branch: resolveEdges(edgeLookup, branchEdgeIds, 'branch'),
      trace: resolveEdges(edgeLookup, candidateEdgeIds, 'pending').map(
        withTraceState,
      ),
    }
  }, [
    branchEdgeIds,
    candidateEdgeIds,
    evaluatedCandidateActions,
    features,
    finalPathEdgeIds,
    project,
  ])

  if (
    highlights.branch.length === 0 &&
    highlights.trace.length === 0
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
      <g aria-label="Trace edges by evaluation state">
        {highlights.trace.map((edge) => (
          <EdgePaths
            key={`trace-${edge.edgeId}`}
            edge={edge}
            keyPrefix="trace"
          />
        ))}
      </g>
    </g>
  )
}
