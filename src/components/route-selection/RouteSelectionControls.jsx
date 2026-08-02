import { useMemo, useState } from 'react'
import { createRouteRequest } from '../../services/routeRequest'
import { useAppStore } from '../../store/useAppStore'
import './RouteSelectionControls.css'

const DEFAULT_SCENARIOS = [
  { value: 'S0', label: 'S0 — Weekday normal' },
  { value: 'S1', label: 'S1 — Weekend busy' },
  { value: 'S2', label: 'S2 — Evening rush' },
  { value: 'S3', label: 'S3 — Heavy rain' },
  { value: 'S4', label: 'S4 — Dense fog' },
]

const DEFAULT_OPTIMIZATIONS = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'distance', label: 'Shortest distance' },
  { value: 'time', label: 'Fastest time' },
  { value: 'cost', label: 'Lowest cost' },
]

export default function RouteSelectionControls({
  locations = [],
  scenarios = DEFAULT_SCENARIOS,
  optimizationOptions = DEFAULT_OPTIMIZATIONS,
  onSolve,
  disabled = false,
  className = '',
}) {
  const [intermediateDraft, setIntermediateDraft] = useState('')

  const selectedAlgorithm = useAppStore((state) => state.selectedAlgorithm)
  const routeSelection = useAppStore((state) => state.routeSelection)
  const setRouteField = useAppStore((state) => state.setRouteField)
  const addVisitNode = useAppStore((state) => state.addVisitNode)
  const removeVisitNode = useAppStore((state) => state.removeVisitNode)

  const locationNames = useMemo(
    () =>
      new Map(
        locations.map((location) => [location.value, location.label]),
      ),
    [locations],
  )

  const availableIntermediateLocations = useMemo(
    () =>
      locations.filter(
        ({ value }) =>
          value !== routeSelection.startNode &&
          value !== routeSelection.goalNode &&
          !routeSelection.visitNodes.includes(value),
      ),
    [locations, routeSelection],
  )

  const hasSameEndpoints =
    Boolean(routeSelection.startNode) &&
    routeSelection.startNode === routeSelection.goalNode
  const hasRequiredEndpoints =
    Boolean(routeSelection.startNode) && Boolean(routeSelection.goalNode)
  const canSubmit =
    !disabled && hasRequiredEndpoints && !hasSameEndpoints && Boolean(onSolve)

  const handleEndpointChange = (field, value) => {
    setRouteField(field, value)

    if (routeSelection.visitNodes.includes(value)) {
      removeVisitNode(value)
    }
  }

  const handleAddIntermediate = () => {
    if (!intermediateDraft) return
    addVisitNode(intermediateDraft)
    setIntermediateDraft('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!canSubmit) return

    onSolve(createRouteRequest(routeSelection, selectedAlgorithm))
  }

  const rootClassName = ['route-selection', className]
    .filter(Boolean)
    .join(' ')

  return (
    <form className={rootClassName} onSubmit={handleSubmit}>
      <fieldset className="route-selection__fields" disabled={disabled}>
        <legend className="route-selection__legend">Route settings</legend>

        <label className="route-selection__field">
          <span>Start location</span>
          <select
            value={routeSelection.startNode}
            onChange={(event) =>
              handleEndpointChange('startNode', event.target.value)
            }
          >
            <option value="">Select start</option>
            {locations.map((location) => (
              <option key={location.value} value={location.value}>
                {location.label}
              </option>
            ))}
          </select>
        </label>

        <span className="route-selection__arrow" aria-hidden="true">
          →
        </span>

        <label className="route-selection__field">
          <span>Destination</span>
          <select
            value={routeSelection.goalNode}
            aria-invalid={hasSameEndpoints}
            onChange={(event) =>
              handleEndpointChange('goalNode', event.target.value)
            }
          >
            <option value="">Select destination</option>
            {locations.map((location) => (
              <option key={location.value} value={location.value}>
                {location.label}
              </option>
            ))}
          </select>
        </label>

        <label className="route-selection__field">
          <span>Scenario</span>
          <select
            value={routeSelection.scenarioId}
            onChange={(event) =>
              setRouteField('scenarioId', event.target.value)
            }
          >
            {scenarios.map((scenario) => (
              <option key={scenario.value} value={scenario.value}>
                {scenario.label}
              </option>
            ))}
          </select>
        </label>

        <label className="route-selection__field">
          <span>Optimization</span>
          <select
            value={routeSelection.optimization}
            onChange={(event) =>
              setRouteField('optimization', event.target.value)
            }
          >
            {optimizationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          className="route-selection__solve-button"
          type="submit"
          disabled={!canSubmit}
        >
          Find route
        </button>
      </fieldset>

      <div className="route-selection__intermediate">
        <label className="route-selection__field">
          <span>Intermediate locations (optional)</span>
          <span className="route-selection__intermediate-input">
            <select
              value={intermediateDraft}
              disabled={disabled || availableIntermediateLocations.length === 0}
              onChange={(event) => setIntermediateDraft(event.target.value)}
            >
              <option value="">Add a location</option>
              {availableIntermediateLocations.map((location) => (
                <option key={location.value} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddIntermediate}
              disabled={disabled || !intermediateDraft}
            >
              Add
            </button>
          </span>
        </label>

        {routeSelection.visitNodes.length > 0 && (
          <ul
            className="route-selection__chips"
            aria-label="Các điểm trung gian đã chọn"
          >
            {routeSelection.visitNodes.map((nodeId, index) => (
              <li key={nodeId}>
                <span>{index + 1}</span>
                {locationNames.get(nodeId) ?? nodeId}
                <button
                  type="button"
                  onClick={() => removeVisitNode(nodeId)}
                  disabled={disabled}
                  aria-label={`Xóa ${locationNames.get(nodeId) ?? nodeId}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasSameEndpoints && (
        <p className="route-selection__error" role="alert">
          Start location and destination must be different.
        </p>
      )}
    </form>
  )
}
