import { useMemo } from 'react'
import {
  describeCandidateEdgeDecision,
  getTraceEdgeState,
  sortTraceEdgesByPaintPriority,
} from './edgeDecision'
import { createDrawableEdges } from './graphGeometry'
import { formatNodeNumber } from '../results/resultFormatting'
import './SearchTraversalLayer.css'

function resolveEdges(edgeLookup, edgeIds, kind) {
  return edgeIds
    .map((edgeId, highlightIndex) => {
      const edge = edgeLookup.get(String(edgeId))
      return edge ? { ...edge, highlightIndex, kind } : null
    })
    .filter(Boolean)
}

function EdgePaths({ edge, keyPrefix, onEdgeHover }) {
  return edge.paths.map((path) => (
    <path
      key={`${keyPrefix}-${edge.highlightIndex}-${path.id}`}
      className={[
        'search-traversal-layer__edge',
        `search-traversal-layer__edge--${edge.kind}`,
      ].join(' ')}
      d={path.value}
      aria-label={`${formatNodeNumber(edge.fromNode)} đến ${formatNodeNumber(edge.toNode)}: ${edge.reason ?? 'đường suy ra'}`}
      onPointerEnter={(event) => onEdgeHover?.(edge, event)}
      onPointerLeave={() => onEdgeHover?.(null)}
    />
  ))
}

export default function SearchTraversalLayer({
  features = [],
  project,
  branchEdgeIds = [],
  candidateEdgeIds = [],
  evaluatedCandidateActions = [],
  finalPathEdgeIds = [],
  algorithm = null,
  weightUsed = null,
  optimization = null,
  onEdgeHover,
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
        { algorithm, weightUsed, optimization },
      )

      return {
        ...edge,
        kind,
        reason:
          kind === 'chosen'
            ? `Được chọn cuối cùng: cạnh này thuộc tuyến kết quả. ${decisionReason}`
            : decisionReason,
      }
    }

    return {
      branch: resolveEdges(edgeLookup, branchEdgeIds, 'branch'),
      trace: sortTraceEdgesByPaintPriority(
        resolveEdges(edgeLookup, candidateEdgeIds, 'pending').map(
          withTraceState,
        ),
      ).filter((edge) => edge.kind === 'chosen'),
    }
  }, [
    branchEdgeIds,
    candidateEdgeIds,
    evaluatedCandidateActions,
    algorithm,
    weightUsed,
    optimization,
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
      aria-label="Phát lại bước nới lỏng suy ra"
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

      <g aria-label="Đường tới nút hiện tại">
        {highlights.branch.map((edge) => (
          <EdgePaths
            key={`branch-${edge.edgeId}`}
            edge={edge}
            keyPrefix="branch"
            onEdgeHover={onEdgeHover}
          />
        ))}
      </g>
      <g aria-label="Các cạnh tiến trình theo trạng thái đánh giá">
        {highlights.trace.map((edge) => (
          <EdgePaths
            key={`trace-${edge.edgeId}`}
            edge={edge}
            keyPrefix="trace"
            onEdgeHover={onEdgeHover}
          />
        ))}
      </g>
    </g>
  )
}
