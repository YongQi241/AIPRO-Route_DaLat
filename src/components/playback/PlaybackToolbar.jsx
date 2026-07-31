import {
  getAnimationStepCount,
  SIMULATION_STATUS,
  useAppStore,
} from '../../store/useAppStore'
import './PlaybackToolbar.css'

const SPEED_OPTIONS = [0.5, 1, 1.5, 2]

/**
 * Controls the visualization timeline. Route calculation remains outside this
 * component; it only updates playback state in the global store.
 */
export default function PlaybackToolbar({
  onLoad,
  loadDisabled = false,
  className = '',
}) {
  const status = useAppStore((state) => state.simulation.status)
  const speed = useAppStore((state) => state.simulation.speed)
  const result = useAppStore((state) => state.routeResult)
  const play = useAppStore((state) => state.play)
  const pause = useAppStore((state) => state.pause)
  const nextAction = useAppStore((state) => state.nextAction)
  const previousAction = useAppStore((state) => state.previousAction)
  const resetSimulation = useAppStore((state) => state.resetSimulation)
  const setSpeed = useAppStore((state) => state.setSpeed)

  const isPlaying = status === SIMULATION_STATUS.PLAYING
  const hasAnimation =
    result?.status === 'success' &&
    getAnimationStepCount(result) > 0
  const lastStep = Math.max(0, getAnimationStepCount(result) - 1)
  const currentStep = useAppStore((state) => state.simulation.currentStep)
  const canPause = isPlaying
  const canReset = status !== SIMULATION_STATUS.IDLE
  const canGoPrevious = hasAnimation && currentStep > 0
  const canGoNext = hasAnimation && currentStep < lastStep
  const toolbarClassName = ['playback-toolbar', className]
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
          className="playback-toolbar__button playback-toolbar__button--load"
          type="button"
          onClick={onLoad}
          disabled={loadDisabled || !onLoad}
        >
          Load data
        </button>

        <span className="playback-toolbar__divider" aria-hidden="true" />

        <button
          className="playback-toolbar__button playback-toolbar__button--action"
          type="button"
          onClick={previousAction}
          disabled={!canGoPrevious}
          aria-label="Previous search action"
          title="Go to the previous search action"
        >
          <span aria-hidden="true">←</span> Previous action
        </button>

        <button
          className="playback-toolbar__icon-button"
          type="button"
          onClick={play}
          disabled={isPlaying || !hasAnimation}
          aria-label="Phát mô phỏng"
          title="Play"
        >
          <span aria-hidden="true">▶</span>
        </button>

        <button
          className="playback-toolbar__icon-button"
          type="button"
          onClick={pause}
          disabled={!canPause}
          aria-label="Tạm dừng mô phỏng"
          title="Pause"
        >
          <span aria-hidden="true">Ⅱ</span>
        </button>

        <button
          className="playback-toolbar__button playback-toolbar__button--action"
          type="button"
          onClick={nextAction}
          disabled={!canGoNext}
          aria-label="Next search action"
          title="Go to the next search action"
        >
          Next action <span aria-hidden="true">→</span>
        </button>

        <button
          className="playback-toolbar__button"
          type="button"
          onClick={resetSimulation}
          disabled={!canReset}
        >
          Reset
        </button>
      </div>

      <div className="playback-toolbar__group playback-toolbar__group--end">
        <label
          className="playback-toolbar__speed-label"
          htmlFor="playback-speed"
        >
          Speed
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
              {option}×
            </option>
          ))}
        </select>

        <output
          className={`playback-toolbar__status playback-toolbar__status--${status}`}
          aria-live="polite"
        >
          {status}
        </output>
      </div>
    </div>
  )
}
