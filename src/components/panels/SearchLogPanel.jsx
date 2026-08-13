import { useEffect, useMemo, useRef } from 'react'
import { buildSearchActionTimeline } from '../graph/searchTimeline'
import { SIMULATION_STATUS, useAppStore } from '../../store/useAppStore'
import { describeTraceAction } from './traceNarrative'
import { formatNodeNumber } from '../results/resultFormatting'
import './SearchLogPanel.css'

function shortenTraceDetail(detail, maximumLength = 150) {
  const text = String(detail ?? '').trim()
  const firstSentence = text.split(/(?<=[.!?])\s+/u)[0] ?? text

  if (firstSentence.length <= maximumLength) return firstSentence
  return `${firstSentence.slice(0, maximumLength - 1).trimEnd()}…`
}

export default function SearchLogPanel({ className = '', overlay = false }) {
  const result = useAppStore((state) => state.routeResult)
  const graphNodes = useAppStore((state) => state.graphData.nodes)
  const graphEdges = useAppStore((state) => state.graphData.edges)
  const edgeFeatures = graphEdges?.features ?? []
  const simulation = useAppStore((state) => state.simulation)
  const activeLogRef = useRef(null)

  const actions = useMemo(
    () => buildSearchActionTimeline(result, edgeFeatures),
    [edgeFeatures, result],
  )
  const locationNames = useMemo(
    () => new Map(
      (graphNodes?.features ?? []).map(({ properties = {} }) => [
        String(properties.node_id),
        formatNodeNumber(properties.node_id),
      ]),
    ),
    [graphNodes],
  )
  const visibleActions =
    simulation.status === SIMULATION_STATUS.IDLE
      ? []
      : actions.slice(0, Math.min(simulation.currentStep + 1, actions.length))

  useEffect(() => {
    activeLogRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [simulation.currentStep])

  const rootClassName = ['search-log-panel', className]
    .filter(Boolean)
    .join(' ')

  if (overlay) {
    return (
      <section
        className={`${rootClassName} search-log-panel--overlay`}
        aria-label="Tiến trình thuật toán"
        aria-live="polite"
      >
        <header>
          <strong>Tiến trình thuật toán</strong>
          <span>{visibleActions.length} / {actions.length}</span>
        </header>
        <ol>
          {visibleActions.map((action, index) => {
            const event = describeTraceAction(action, actions, {
              algorithm: result?.algorithm,
              weightUsed: result?.weight_used,
              optimization: result?.optimization,
              edgeCostDetails: result?.edge_cost_details,
              locationNames,
            })
            const isLatest = index === visibleActions.length - 1

            return (
              <li
                className={[
                  'search-log-panel__toast',
                  isLatest && 'search-log-panel__toast--latest',
                ].filter(Boolean).join(' ')}
                key={action.actionIndex}
                ref={isLatest ? activeLogRef : null}
              >
                <span>{action.actionIndex + 1}</span>
                <div>
                  <strong>{event.title}</strong>
                  <p>{shortenTraceDetail(event.detail)}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>
    )
  }

  return (
    <section className={rootClassName} aria-labelledby="search-log-title">
      <header className="search-log-panel__header">
        <div>
          <span>Tiến trình thuật toán</span>
          <h2 id="search-log-title">Nhật ký tìm kiếm</h2>
        </div>
        <output aria-live="polite">
          {visibleActions.length} / {actions.length} thao tác
        </output>
      </header>

      {actions.length === 0 ? (
        <div className="search-log-panel__empty">
          <strong>Chưa có tiến trình tìm kiếm</strong>
          <span>
            Nhật ký sử dụng frontier_steps hoặc visited_order từ kết quả.
          </span>
        </div>
      ) : visibleActions.length === 0 ? (
        <div className="search-log-panel__empty">
          <strong>Trình phát đã sẵn sàng</strong>
          <span>Nhấn Phát hoặc Thao tác tiếp để xem thao tác đầu tiên.</span>
        </div>
      ) : (
        <ol className="search-log-panel__list">
          {visibleActions.map((action, index) => {
            const isActive = index === visibleActions.length - 1
            const event = describeTraceAction(action, actions, {
              algorithm: result?.algorithm,
              weightUsed: result?.weight_used,
              optimization: result?.optimization,
              edgeCostDetails: result?.edge_cost_details,
              locationNames,
            })

            return (
              <li
                key={action.actionIndex}
                className={isActive ? 'search-log-panel__item--active' : ''}
                ref={isActive ? activeLogRef : null}
              >
                <span className="search-log-panel__step">
                  {action.actionIndex + 1}
                </span>
                <span className="search-log-panel__event">
                  <strong>{event.title}</strong>
                  <p>{event.detail}</p>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
