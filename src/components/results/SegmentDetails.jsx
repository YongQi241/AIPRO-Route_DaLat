import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { isHighTraffic } from '../graph/graphGeometry'
import {
  createNodeNameLookup,
  formatMetric,
  formatNumber,
} from './resultFormatting'
import './SegmentDetails.css'

function orderSegments(pathEdgeIds, segments) {
  const segmentLookup = new Map(
    segments.map((segment) => [String(segment.edge_id), segment]),
  )

  return pathEdgeIds.map((edgeId) => ({
    edgeId: String(edgeId),
    data: segmentLookup.get(String(edgeId)) ?? null,
  }))
}

export default function SegmentDetails({ className = '' }) {
  const nodes = useAppStore((state) => state.graphData.nodes)
  const result = useAppStore((state) => state.routeResult)

  const nodeNameLookup = useMemo(
    () => createNodeNameLookup(nodes),
    [nodes],
  )
  const orderedSegments = useMemo(
    () => orderSegments(result?.path_edges ?? [], result?.segments ?? []),
    [result],
  )
  const rootClassName = ['segment-details', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={rootClassName} aria-labelledby="segment-details-title">
      <header className="segment-details__header">
        <div>
          <span>Chi tiết</span>
          <h2 id="segment-details-title">Chi tiết từng đoạn</h2>
        </div>
        <output>{orderedSegments.length} đoạn</output>
      </header>

      {orderedSegments.length === 0 ? (
        <div className="segment-details__empty">
          <strong>Chưa có đoạn đường</strong>
          <span>Các chỉ số từng đoạn sẽ xuất hiện khi tìm được tuyến đường.</span>
        </div>
      ) : (
        <ol className="segment-details__list">
          {orderedSegments.map(({ edgeId, data }, index) => {
            const congestion = Number(data?.congestion_level)
            const risk = Number(data?.risk)
            const hasHighTraffic = isHighTraffic(congestion)
            const hasWarning = Number.isFinite(risk) && risk > 0
            const fromName =
              nodeNameLookup.get(String(data?.from_node)) ??
              data?.from_node ??
              '—'
            const toName =
              nodeNameLookup.get(String(data?.to_node)) ?? data?.to_node ?? '—'

            return (
              <li
                key={`${edgeId}-${index}`}
                className={[
                  hasHighTraffic && 'segment-details__item--traffic',
                  hasWarning && 'segment-details__item--warning',
                ].filter(Boolean).join(' ') || undefined}
              >
                <div className="segment-details__index">{index + 1}</div>
                <div className="segment-details__route">
                  <strong>
                    {fromName} <span aria-hidden="true">→</span> {toName}
                  </strong>
                  <small>{edgeId}</small>
                </div>
                <dl>
                  <div>
                    <dt>Quãng đường</dt>
                    <dd>{formatMetric(data?.distance_km, 'km')}</dd>
                  </div>
                  <div>
                    <dt>Thời gian</dt>
                    <dd>{formatMetric(data?.adjusted_time_min, 'min')}</dd>
                  </div>
                  <div>
                    <dt>Ùn tắc</dt>
                    <dd>
                      {Number.isFinite(congestion) ? (
                        <span
                          className={`segment-details__congestion segment-details__congestion--${Math.min(5, Math.max(0, congestion))}`}
                        >
                          {congestion}/5
                        </span>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Rủi ro</dt>
                    <dd>{formatNumber(data?.risk)}</dd>
                  </div>
                </dl>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
