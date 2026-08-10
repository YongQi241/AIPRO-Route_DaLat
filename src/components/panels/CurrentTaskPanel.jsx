import { useMemo } from 'react'
import {
  buildSearchActionTimeline,
  getSearchAction,
} from '../graph/searchTimeline'
import { MULTI_LOCATION_ALGORITHMS } from '../../services/routeRequest'
import { SIMULATION_STATUS, useAppStore } from '../../store/useAppStore'
import {
  formatAlgorithmLabel,
  formatNodeNumber,
  formatOptimizationLabel,
} from '../results/resultFormatting'
import './CurrentTaskPanel.css'

const STATUS_LABELS = {
  idle: 'Sẵn sàng',
  ready: 'Sẵn sàng',
  playing: 'Đang tìm kiếm',
  paused: 'Đã tạm dừng',
  completed: 'Hoàn tất',
}

const OUTCOME_LABELS = {
  add: 'Đã thêm vào biên tìm kiếm',
  update: 'Đã cập nhật giá trị biên',
  keep: 'Giữ nguyên giá trị hiện có',
  selected: 'Đã chọn làm điểm dừng tiếp theo',
  rejected: 'Loại vì điểm số cao hơn',
  unreachable: 'Không thể đến địa điểm',
}

function createLocationLookup(nodes) {
  return new Map(
    (nodes?.features ?? []).map(({ properties = {} }) => [
      String(properties.node_id),
      formatNodeNumber(properties.node_id),
    ]),
  )
}

export default function CurrentTaskPanel({ className = '' }) {
  const graphNodes = useAppStore((state) => state.graphData.nodes)
  const graphEdges = useAppStore((state) => state.graphData.edges)
  const edgeFeatures = graphEdges?.features ?? []
  const selectedAlgorithm = useAppStore((state) => state.selectedAlgorithm)
  const routeSelection = useAppStore((state) => state.routeSelection)
  const result = useAppStore((state) => state.routeResult)
  const simulation = useAppStore((state) => state.simulation)

  const locationLookup = useMemo(
    () => createLocationLookup(graphNodes),
    [graphNodes],
  )
  const timeline = useMemo(
    () => buildSearchActionTimeline(result, edgeFeatures),
    [edgeFeatures, result],
  )
  const action =
    simulation.status === SIMULATION_STATUS.IDLE
      ? null
      : getSearchAction(timeline, simulation.currentStep)
  const visibleActionCount =
    timeline.length === 0 || simulation.status === SIMULATION_STATUS.IDLE
      ? 0
      : Math.min(simulation.currentStep + 1, timeline.length)
  const progress =
    timeline.length > 0
      ? Math.round((visibleActionCount / timeline.length) * 100)
      : 0

  const displayName = (nodeId) =>
    nodeId ? (locationLookup.get(String(nodeId)) ?? nodeId) : 'Chưa chọn'
  const currentNodeName = action?.currentNodeId
    ? displayName(action.currentNodeId)
    : 'Đang chờ'
  const usesIntermediateLocations = MULTI_LOCATION_ALGORITHMS.has(
    selectedAlgorithm,
  )
  const requestedStops =
    result?.visit_nodes ??
    (usesIntermediateLocations
      ? [...routeSelection.visitNodes, routeSelection.goalNode].filter(Boolean)
      : [])
  const requestedStopLabels = [...new Set(requestedStops)]
    .map((nodeId) => displayName(nodeId))
    .join(' → ')
  const rootClassName = ['current-task-panel', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={rootClassName} aria-labelledby="current-task-title">
      <header className="current-task-panel__header">
        <div>
          <span>Mô phỏng</span>
          <h2 id="current-task-title">Tác vụ hiện tại</h2>
        </div>
        <output
          className={`current-task-panel__status current-task-panel__status--${simulation.status}`}
          aria-live="polite"
        >
          {STATUS_LABELS[simulation.status] ?? simulation.status}
        </output>
      </header>

      <div className="current-task-panel__route">
        <div>
          <span>Điểm xuất phát</span>
          <strong>{displayName(routeSelection.startNode)}</strong>
        </div>
        <span className="current-task-panel__route-arrow" aria-hidden="true">
          →
        </span>
        <div>
          <span>Điểm đến</span>
          <strong>{displayName(routeSelection.goalNode)}</strong>
        </div>
      </div>

      <dl className="current-task-panel__details">
        <div>
          <dt>Thuật toán</dt>
          <dd>{formatAlgorithmLabel(result?.algorithm ?? selectedAlgorithm)}</dd>
        </div>
        <div>
          <dt>Kịch bản</dt>
          <dd>{result?.scenario_id ?? routeSelection.scenarioId}</dd>
        </div>
        <div>
          <dt>Optimization</dt>
          <dd>{formatOptimizationLabel(result?.optimization ?? routeSelection.optimization)}</dd>
        </div>
        <div>
          <dt>Tuyến trung gian</dt>
          <dd>
            {usesIntermediateLocations || result?.visit_nodes
              ? requestedStopLabels || 'Chưa chọn điểm dừng'
              : 'Thuật toán này không sử dụng'}
          </dd>
        </div>
        <div>
          <dt>Nút hiện tại</dt>
          <dd>{currentNodeName}</dd>
        </div>
        <div>
          <dt>Cạnh đang xét</dt>
          <dd>{action?.activeEdgeId ?? '—'}</dd>
        </div>
        <div>
          <dt>Nút đang đánh giá</dt>
          <dd>
            {action?.activeNeighborId
              ? displayName(action.activeNeighborId)
              : '—'}
          </dd>
        </div>
        <div>
          <dt>Kết quả nới lỏng</dt>
          <dd>{OUTCOME_LABELS[action?.outcome] ?? '—'}</dd>
        </div>
      </dl>

      <div
        className="current-task-panel__progress"
        aria-label={`Tiến độ mô phỏng ${progress}%`}
      >
        <div>
          <span>Thao tác tìm kiếm</span>
          <strong>
            {visibleActionCount} / {timeline.length}
          </strong>
        </div>
        <div
          className="current-task-panel__progress-track"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      {result?.message && (
        <p
          className={`current-task-panel__message current-task-panel__message--${result.status}`}
          role={result.status === 'success' ? 'status' : 'alert'}
        >
          {result.message}
        </p>
      )}
    </section>
  )
}
