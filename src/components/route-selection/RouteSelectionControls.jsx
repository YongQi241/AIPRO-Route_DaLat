import { useEffect, useMemo, useState } from 'react'
import {
  createRouteRequest,
  isMultiLocationAlgorithm,
} from '../../services/routeRequest'
import { useAppStore } from '../../store/useAppStore'
import ScenarioFormulaPanel from './ScenarioFormulaPanel'
import './RouteSelectionControls.css'

const DEFAULT_SCENARIOS = [
  { value: 'S0', label: 'S0 — Ngày thường' },
  { value: 'S1', label: 'S1 — Cuối tuần đông đúc' },
  { value: 'S2', label: 'S2 — Giờ cao điểm buổi tối' },
  { value: 'S3', label: 'S3 — Mưa lớn' },
  { value: 'S4', label: 'S4 — Sương mù dày' },
]

const DEFAULT_OPTIMIZATIONS = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'distance', label: 'Shortest' },
  { value: 'time', label: 'Fastest' },
  { value: 'safest', label: 'Safest' },
]

const MULTI_LOCATION_LABELS = {
  nearest_neighbor: 'Nearest Neighbor',
  brute_force_tsp: 'Brute Force TSP',
}

export default function RouteSelectionControls({
  locations = [],
  scenarios = DEFAULT_SCENARIOS,
  optimizationOptions = DEFAULT_OPTIMIZATIONS,
  onSolve,
  disabled = false,
  className = '',
  scenarioCostModel = null,
}) {
  const [intermediateDraft, setIntermediateDraft] = useState('')

  const selectedAlgorithm = useAppStore((state) => state.selectedAlgorithm)
  const routeSelection = useAppStore((state) => state.routeSelection)
  const setRouteField = useAppStore((state) => state.setRouteField)
  const addVisitNode = useAppStore((state) => state.addVisitNode)
  const removeVisitNode = useAppStore((state) => state.removeVisitNode)
  const clearVisitNodes = useAppStore((state) => state.clearVisitNodes)
  const supportsMultiLocation = isMultiLocationAlgorithm(selectedAlgorithm)

  useEffect(() => {
    if (supportsMultiLocation) return

    setIntermediateDraft('')
    clearVisitNodes()
  }, [clearVisitNodes, supportsMultiLocation])

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
    if (!supportsMultiLocation || !intermediateDraft) return
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
        <legend className="route-selection__legend">Thiết lập tuyến đường</legend>

        <label className="route-selection__field">
          <span>Điểm xuất phát</span>
          <select
            value={routeSelection.startNode}
            onChange={(event) =>
              handleEndpointChange('startNode', event.target.value)
            }
          >
            <option value="">Chọn điểm xuất phát</option>
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
          <span>Điểm đến</span>
          <select
            value={routeSelection.goalNode}
            aria-invalid={hasSameEndpoints}
            onChange={(event) =>
              handleEndpointChange('goalNode', event.target.value)
            }
          >
            <option value="">Chọn điểm đến</option>
            {locations.map((location) => (
              <option key={location.value} value={location.value}>
                {location.label}
              </option>
            ))}
          </select>
        </label>

        <label className="route-selection__field">
          <span>Kịch bản</span>
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
          Tìm tuyến đường
        </button>
      </fieldset>

      <ScenarioFormulaPanel
        selection={routeSelection}
        costModel={scenarioCostModel}
      />

      <div
        className={`route-selection__intermediate${
          supportsMultiLocation
            ? ''
            : ' route-selection__intermediate--disabled'
        }`}
      >
        <p
          className="route-selection__multi-location-note"
          id="multi-location-guidance"
        >
          <strong>Phương pháp đa địa điểm:</strong> Nearest Neighbor và Brute
          Force TSP.
          {supportsMultiLocation && (
            <span>
              {' '}
              Đang sử dụng {MULTI_LOCATION_LABELS[selectedAlgorithm]}.
            </span>
          )}
          {!supportsMultiLocation && (
            <span>
              {' '}
              Chọn một trong hai phương pháp tại Search strategy để thêm
              địa điểm trung gian.
            </span>
          )}
        </p>

        <label className="route-selection__field">
          <span>Trung gian (optional)</span>
          <span className="route-selection__intermediate-input">
            <select
              value={intermediateDraft}
              aria-describedby="multi-location-guidance"
              disabled={
                disabled ||
                !supportsMultiLocation ||
                availableIntermediateLocations.length === 0
              }
              onChange={(event) => setIntermediateDraft(event.target.value)}
            >
              <option value="">
                {supportsMultiLocation
                  ? 'Thêm một địa điểm'
                  : 'Trước tiên hãy chọn phương pháp đa địa điểm'}
              </option>
              {availableIntermediateLocations.map((location) => (
                <option key={location.value} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddIntermediate}
              disabled={
                disabled || !supportsMultiLocation || !intermediateDraft
              }
            >
              Thêm
            </button>
          </span>
        </label>

        {supportsMultiLocation && routeSelection.visitNodes.length > 0 && (
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
          Điểm xuất phát và điểm đến phải khác nhau.
        </p>
      )}
    </form>
  )
}
