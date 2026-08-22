import { useEffect, useMemo, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { isHighTraffic } from '../graph/graphGeometry'
import {
  createNodeNameLookup,
  formatCost,
  formatMetric,
  formatNumber,
} from './resultFormatting'
import { scrollRoutePathOnWheel } from './routePathScroll'
import './RouteResultPanel.css'

const STATUS_LABELS = {
  success: 'Đã tìm thấy tuyến đường',
  no_path: 'Không có tuyến đường',
  invalid_input: 'Dữ liệu đầu vào không hợp lệ',
  error: 'Lỗi',
}

export default function RouteResultPanel({ className = '' }) {
  const pathRegionRef = useRef(null)
  const pathListRef = useRef(null)
  const nodes = useAppStore((state) => state.graphData.nodes)
  const result = useAppStore((state) => state.routeResult)

  const nodeNameLookup = useMemo(
    () => createNodeNameLookup(nodes),
    [nodes],
  )
  const path = result?.path_nodes ?? []
  const metrics = result?.metrics ?? {}
  const pathLabels = path.map(
    (nodeId) => nodeNameLookup.get(String(nodeId)) ?? nodeId,
  )
  const warningSegments = (result?.segments ?? []).filter(
    (segment) =>
      isHighTraffic(segment.congestion_level) ||
      Number(segment.risk ?? 0) > 0,
  ).length
  const rootClassName = ['route-result-panel', className]
    .filter(Boolean)
    .join(' ')

  useEffect(() => {
    const pathRegion = pathRegionRef.current
    if (!pathRegion) return undefined

    const handlePathWheel = (event) => {
      scrollRoutePathOnWheel(pathListRef.current, event)
    }

    // A native non-passive listener is required because React/browser root
    // wheel listeners may be passive and ignore preventDefault().
    pathRegion.addEventListener('wheel', handlePathWheel, { passive: false })
    return () => pathRegion.removeEventListener('wheel', handlePathWheel)
  }, [path.length])

  return (
    <section className={rootClassName} aria-labelledby="route-result-title">
      <header className="route-result-panel__header">
        <div>
          <span>Kết quả</span>
          <h2 id="route-result-title">Kết quả tuyến đường</h2>
        </div>
        {result && (
          <output
            className={`route-result-panel__status route-result-panel__status--${result.status}`}
            aria-live="polite"
          >
            {STATUS_LABELS[result.status] ?? result.status}
          </output>
        )}
      </header>

      {!result ? (
        <div className="route-result-panel__empty">
          <strong>Chưa có kết quả</strong>
          <span>Các chỉ số tuyến đường sẽ xuất hiện sau khi dịch vụ phản hồi.</span>
        </div>
      ) : result.status !== 'success' ? (
        <div className="route-result-panel__failure" role="alert">
          <strong>{STATUS_LABELS[result.status] ?? 'Không có tuyến đường'}</strong>
          <span>{result.message ?? result.explanation ?? 'Không có thông tin chi tiết.'}</span>
        </div>
      ) : (
        <>
          <div className="route-result-panel__path" ref={pathRegionRef}>
            <span>Đường đi đã chọn</span>
            <ol
              aria-label="Các nút trên tuyến đường đã chọn"
              ref={pathListRef}
              tabIndex={0}
              title="Lăn chuột để xem toàn bộ tuyến đường"
            >
              {pathLabels.map((label, index) => (
                <li key={`${path[index]}-${index}`}>
                  <span>{index + 1}</span>
                  <strong>{label}</strong>
                </li>
              ))}
            </ol>
          </div>

          <dl className="route-result-panel__metrics">
            <div>
              <dt>Tổng quãng đường</dt>
              <dd>{formatMetric(metrics.total_distance_km, 'km')}</dd>
            </div>
            <div>
              <dt>Thời gian ước tính</dt>
              <dd>{formatMetric(metrics.total_time_min, 'min')}</dd>
            </div>
            <div>
              <dt>Tổng chi phí</dt>
              <dd>{formatCost(metrics.total_cost)}</dd>
            </div>
            <div>
              <dt>Số nút đã khám phá</dt>
              <dd>{formatNumber(metrics.explored_nodes, 0)}</dd>
            </div>
            <div>
              <dt>Thời gian xử lý</dt>
              <dd>{formatMetric(metrics.processing_time_ms, 'ms')}</dd>
            </div>
            <div>
              <dt>Đoạn đường cảnh báo</dt>
              <dd>{warningSegments}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  )
}
