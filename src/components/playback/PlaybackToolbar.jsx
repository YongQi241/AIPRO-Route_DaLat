import { useMemo } from 'react'
import {
  getAnimationStepCount,
  SIMULATION_STATUS,
  useAppStore,
} from '../../store/useAppStore'
import './PlaybackToolbar.css'

const SPEED_OPTIONS = [0.5, 1, 1.5, 2]
const STATUS_LABELS = {
  idle: 'Chưa bắt đầu',
  ready: 'Sẵn sàng',
  playing: 'Đang phát',
  paused: 'Đã tạm dừng',
  completed: 'Hoàn tất',
}

/**
 * Controls the visualization timeline. Route calculation remains outside this
 * component; it only invokes timeline actions from the global store.
 */
export default function PlaybackToolbar({ className = '', compact = false }) {
  const status = useAppStore((state) => state.simulation.status)
  const speed = useAppStore((state) => state.simulation.speed)
  const currentStep = useAppStore((state) => state.simulation.currentStep)
  const result = useAppStore((state) => state.routeResult)
  const graphEdges = useAppStore((state) => state.graphData.edges)
  const play = useAppStore((state) => state.play)
  const pause = useAppStore((state) => state.pause)
  const firstAction = useAppStore((state) => state.firstAction)
  const previousAction = useAppStore((state) => state.previousAction)
  const nextAction = useAppStore((state) => state.nextAction)
  const lastAction = useAppStore((state) => state.lastAction)
  const resetSimulation = useAppStore((state) => state.resetSimulation)
  const setSpeed = useAppStore((state) => state.setSpeed)

  const edgeFeatures = graphEdges?.features ?? []
  const totalActions = useMemo(
    () => getAnimationStepCount(result, edgeFeatures),
    [edgeFeatures, result],
  )
  const hasAnimation = result?.status === 'success' && totalActions > 0
  const lastStep = Math.max(0, totalActions - 1)
  const isPlaying = status === SIMULATION_STATUS.PLAYING
  const canReset = status !== SIMULATION_STATUS.IDLE
  const canGoFirst = hasAnimation && currentStep > 0
  const canGoPrevious = hasAnimation && currentStep > 0
  const canGoNext = hasAnimation && currentStep < lastStep
  const canGoLast =
    hasAnimation &&
    (currentStep < lastStep || status !== SIMULATION_STATUS.COMPLETED)
  const toolbarClassName = [
    'playback-toolbar',
    compact && 'playback-toolbar--compact',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={toolbarClassName}
      role="toolbar"
      aria-label="Điều khiển mô phỏng"
    >
      <div className="playback-toolbar__group">
        <button
          className="playback-toolbar__button playback-toolbar__button--action"
          type="button"
          onClick={firstAction}
          disabled={!canGoFirst}
          aria-label="Đi tới thao tác tìm kiếm đầu tiên"
          title="Thao tác đầu tiên"
        >
          <span aria-hidden="true">{'\u2502\u2190'}</span>
          {!compact && ' Thao tác đầu'}
        </button>

        <button
          className="playback-toolbar__button playback-toolbar__button--action"
          type="button"
          onClick={previousAction}
          disabled={!canGoPrevious}
          aria-label="Thao tác tìm kiếm trước đó"
          title="Thao tác trước"
        >
          <span aria-hidden="true">{'\u2190'}</span>
          {!compact && ' Thao tác trước'}
        </button>

        <span className="playback-toolbar__divider" aria-hidden="true" />

        <button
          className="playback-toolbar__icon-button"
          type="button"
          onClick={play}
          disabled={isPlaying || !hasAnimation}
          aria-label="Phát mô phỏng"
          title="Phát"
        >
          <span aria-hidden="true">{'\u25b6'}</span>
        </button>

        <button
          className="playback-toolbar__icon-button"
          type="button"
          onClick={pause}
          disabled={!isPlaying}
          aria-label="Tạm dừng mô phỏng"
          title="Tạm dừng"
        >
          <span aria-hidden="true">{'\u2161'}</span>
        </button>

        <button
          className="playback-toolbar__button playback-toolbar__button--action"
          type="button"
          onClick={nextAction}
          disabled={!canGoNext}
          aria-label="Thao tác tìm kiếm tiếp theo"
          title="Thao tác tiếp"
        >
          {!compact && 'Thao tác tiếp '}
          <span aria-hidden="true">{'\u2192'}</span>
        </button>

        <button
          className="playback-toolbar__button playback-toolbar__button--action"
          type="button"
          onClick={lastAction}
          disabled={!canGoLast}
          aria-label="Đi tới thao tác tìm kiếm cuối cùng"
          title="Thao tác cuối"
        >
          {!compact && 'Thao tác cuối '}
          <span aria-hidden="true">{'\u2192\u2502'}</span>
        </button>

        <button
          className="playback-toolbar__button"
          type="button"
          onClick={resetSimulation}
          disabled={!canReset}
        >
          <span aria-hidden={compact ? 'true' : undefined}>
            {compact ? '\u21ba' : 'Đặt lại'}
          </span>
        </button>
      </div>

      <div className="playback-toolbar__group playback-toolbar__group--end">
        <label
          className="playback-toolbar__speed-label"
          htmlFor="playback-speed"
        >
          Tốc độ
        </label>
        <select
          id="playback-speed"
          className="playback-toolbar__speed-select"
          value={speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
          aria-label="Tốc độ mô phỏng"
        >
          {SPEED_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}{'\u00d7'}
            </option>
          ))}
        </select>

        <output
          className={
            'playback-toolbar__status playback-toolbar__status--' + status
          }
          aria-live="polite"
        >
          {STATUS_LABELS[status] ?? status}
        </output>
      </div>
    </div>
  )
}
