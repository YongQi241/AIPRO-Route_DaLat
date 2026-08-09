import { useMemo } from 'react'
import {
  getAnimationStepCount,
  SIMULATION_STATUS,
  useAppStore,
} from '../../store/useAppStore'
import './PlaybackToolbar.css'

const SPEED_OPTIONS = [0.5, 1, 1.5, 2]

/**
 * Controls the visualization timeline. Route calculation remains outside this
 * component; it only invokes timeline actions from the global store.
 */
export default function PlaybackToolbar({ className = '' }) {
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
  const toolbarClassName = ['playback-toolbar', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={toolbarClassName}
      role="toolbar"
      aria-label="Simulation controls"
    >
      <div className="playback-toolbar__group">
        <button
          className="playback-toolbar__button playback-toolbar__button--action"
          type="button"
          onClick={firstAction}
          disabled={!canGoFirst}
          aria-label="Go to the first search action"
          title="First action"
        >
          <span aria-hidden="true">{'\u2502\u2190'}</span> First action
        </button>

        <button
          className="playback-toolbar__button playback-toolbar__button--action"
          type="button"
          onClick={previousAction}
          disabled={!canGoPrevious}
          aria-label="Previous search action"
          title="Previous action"
        >
          <span aria-hidden="true">{'\u2190'}</span> Previous action
        </button>

        <span className="playback-toolbar__divider" aria-hidden="true" />

        <button
          className="playback-toolbar__icon-button"
          type="button"
          onClick={play}
          disabled={isPlaying || !hasAnimation}
          aria-label="Play simulation"
          title="Play"
        >
          <span aria-hidden="true">{'\u25b6'}</span>
        </button>

        <button
          className="playback-toolbar__icon-button"
          type="button"
          onClick={pause}
          disabled={!isPlaying}
          aria-label="Pause simulation"
          title="Pause"
        >
          <span aria-hidden="true">{'\u2161'}</span>
        </button>

        <button
          className="playback-toolbar__button playback-toolbar__button--action"
          type="button"
          onClick={nextAction}
          disabled={!canGoNext}
          aria-label="Next search action"
          title="Next action"
        >
          Next action <span aria-hidden="true">{'\u2192'}</span>
        </button>

        <button
          className="playback-toolbar__button playback-toolbar__button--action"
          type="button"
          onClick={lastAction}
          disabled={!canGoLast}
          aria-label="Go to the last search action"
          title="Last action"
        >
          Last action <span aria-hidden="true">{'\u2192\u2502'}</span>
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
          aria-label="Simulation speed"
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
          {status}
        </output>
      </div>
    </div>
  )
}
