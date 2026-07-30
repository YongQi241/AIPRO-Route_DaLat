import { useCallback, useMemo, useRef, useState } from 'react'
import { SIMULATION_STATUS, useAppStore } from '../../store/useAppStore'
import FinalRouteLayer from './FinalRouteLayer'
import { getLineCoordinates } from './graphGeometry'
import RoadNetworkLayer from './RoadNetworkLayer'
import SearchAnimationLayer, {
  getSearchAnimationFrame,
} from './SearchAnimationLayer'
import './GraphWorkspace.css'

const VIEWBOX = {
  width: 1000,
  height: 650,
  padding: 42,
}

const MIN_ZOOM = 0.6
const MAX_ZOOM = 5
const ZOOM_STEP = 1.25
const INITIAL_VIEWPORT = { x: 0, y: 0, scale: 1 }

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function getBounds(nodeFeatures, edgeFeatures) {
  const coordinates = []

  nodeFeatures.forEach((feature) => {
    if (feature.geometry?.type === 'Point') {
      coordinates.push(feature.geometry.coordinates)
    }
  })

  edgeFeatures.forEach((feature) => {
    getLineCoordinates(feature.geometry).forEach((line) => {
      coordinates.push(...line)
    })
  })

  if (coordinates.length === 0) return null

  return coordinates.reduce(
    (bounds, [longitude, latitude]) => ({
      minX: Math.min(bounds.minX, longitude),
      maxX: Math.max(bounds.maxX, longitude),
      minY: Math.min(bounds.minY, latitude),
      maxY: Math.max(bounds.maxY, latitude),
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    },
  )
}

function createProjector(bounds) {
  if (!bounds) return null

  const longitudeSpan = Math.max(bounds.maxX - bounds.minX, Number.EPSILON)
  const latitudeSpan = Math.max(bounds.maxY - bounds.minY, Number.EPSILON)
  const drawableWidth = VIEWBOX.width - VIEWBOX.padding * 2
  const drawableHeight = VIEWBOX.height - VIEWBOX.padding * 2
  const scale = Math.min(
    drawableWidth / longitudeSpan,
    drawableHeight / latitudeSpan,
  )
  const renderedWidth = longitudeSpan * scale
  const renderedHeight = latitudeSpan * scale
  const offsetX = (VIEWBOX.width - renderedWidth) / 2
  const offsetY = (VIEWBOX.height - renderedHeight) / 2

  return ([longitude, latitude]) => [
    offsetX + (longitude - bounds.minX) * scale,
    VIEWBOX.height - (offsetY + (latitude - bounds.minY) * scale),
  ]
}

export default function GraphWorkspace({ className = '' }) {
  const dragRef = useRef(null)
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT)
  const [isPanning, setIsPanning] = useState(false)
  const graphData = useAppStore((state) => state.graphData)
  const result = useAppStore((state) => state.routeResult)
  const simulation = useAppStore((state) => state.simulation)

  const nodeFeatures = graphData.nodes?.features ?? []
  const edgeFeatures = graphData.edges?.features ?? []
  const frame = useMemo(
    () => getSearchAnimationFrame(result, simulation.currentStep),
    [result, simulation.currentStep],
  )

  const drawing = useMemo(() => {
    const bounds = getBounds(nodeFeatures, edgeFeatures)
    const project = createProjector(bounds)
    if (!project) return null

    return {
      project,
      nodes: nodeFeatures
        .filter((feature) => feature.geometry?.type === 'Point')
        .map((feature, index) => {
          const [x, y] = project(feature.geometry.coordinates)
          const properties = feature.properties ?? {}
          return {
            id: String(properties.node_id ?? index),
            name:
              properties.name_vi ??
              properties.name_en ??
              String(properties.node_id ?? index),
            x,
            y,
          }
        }),
    }
  }, [edgeFeatures, nodeFeatures])

  const isSuccessful = result?.status === 'success'
  const showFinalPath =
    isSuccessful &&
    (simulation.status === SIMULATION_STATUS.COMPLETED ||
      frame.totalSteps === 0)
  const rootClassName = ['graph-workspace', className]
    .filter(Boolean)
    .join(' ')

  const zoomAtPoint = useCallback((factor, focusX, focusY) => {
    setViewport((current) => {
      const scale = clamp(current.scale * factor, MIN_ZOOM, MAX_ZOOM)
      const worldX = (focusX - current.x) / current.scale
      const worldY = (focusY - current.y) / current.scale

      return {
        scale,
        x: focusX - worldX * scale,
        y: focusY - worldY * scale,
      }
    })
  }, [])

  const zoomFromCenter = useCallback(
    (factor) => {
      zoomAtPoint(factor, VIEWBOX.width / 2, VIEWBOX.height / 2)
    },
    [zoomAtPoint],
  )

  const handleWheel = (event) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const focusX =
      ((event.clientX - rect.left) / Math.max(rect.width, 1)) * VIEWBOX.width
    const focusY =
      ((event.clientY - rect.top) / Math.max(rect.height, 1)) * VIEWBOX.height
    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP

    zoomAtPoint(factor, focusX, focusY)
  }

  const handlePointerDown = (event) => {
    if (event.button !== 0 || !event.isPrimary) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    }
    setIsPanning(true)
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const rect = event.currentTarget.getBoundingClientRect()
    const deltaX =
      ((event.clientX - drag.clientX) / Math.max(rect.width, 1)) * VIEWBOX.width
    const deltaY =
      ((event.clientY - drag.clientY) / Math.max(rect.height, 1)) *
      VIEWBOX.height

    dragRef.current = {
      ...drag,
      clientX: event.clientX,
      clientY: event.clientY,
    }
    setViewport((current) => ({
      ...current,
      x: current.x + deltaX,
      y: current.y + deltaY,
    }))
  }

  const finishPanning = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
    setIsPanning(false)
  }

  const resetViewport = () => {
    dragRef.current = null
    setIsPanning(false)
    setViewport(INITIAL_VIEWPORT)
  }

  if (graphData.error) {
    return (
      <section className={rootClassName} aria-label="Không gian đồ thị">
        <div className="graph-workspace__message graph-workspace__message--error">
          <strong>Unable to load graph data</strong>
          <span>{String(graphData.error)}</span>
        </div>
      </section>
    )
  }

  if (graphData.isLoading) {
    return (
      <section className={rootClassName} aria-label="Không gian đồ thị">
        <div className="graph-workspace__message">
          <span className="graph-workspace__loader" aria-hidden="true" />
          <strong>Loading graph data</strong>
          <span>Reading nodes and edges GeoJSON…</span>
        </div>
      </section>
    )
  }

  if (!drawing) {
    return (
      <section className={rootClassName} aria-label="Không gian đồ thị">
        <div className="graph-workspace__message">
          <strong>No graph data loaded</strong>
          <span>Load nodes and edges GeoJSON to display the road network.</span>
        </div>
      </section>
    )
  }

  return (
    <section className={rootClassName} aria-label="Không gian đồ thị">
      <div className="graph-workspace__header">
        <div>
          <h1>Đà Lạt road network</h1>
          <p>
            {drawing.nodes.length} locations · {edgeFeatures.length} directed
            edges
          </p>
        </div>
        <div className="graph-workspace__progress" aria-live="polite">
          Step {Math.min(simulation.currentStep + 1, frame.totalSteps || 0)}
          <span>/ {frame.totalSteps}</span>
        </div>
      </div>

      <div className="graph-workspace__canvas">
        <div
          className="graph-workspace__map-controls"
          role="toolbar"
          aria-label="Điều khiển bản đồ"
        >
          <button
            type="button"
            onClick={() => zoomFromCenter(ZOOM_STEP)}
            disabled={viewport.scale >= MAX_ZOOM}
            aria-label="Phóng to bản đồ"
            title="Zoom in"
          >
            +
          </button>
          <output aria-live="polite">
            {Math.round(viewport.scale * 100)}%
          </output>
          <button
            type="button"
            onClick={() => zoomFromCenter(1 / ZOOM_STEP)}
            disabled={viewport.scale <= MIN_ZOOM}
            aria-label="Thu nhỏ bản đồ"
            title="Zoom out"
          >
            −
          </button>
          <button
            className="graph-workspace__reset-view"
            type="button"
            onClick={resetViewport}
            disabled={
              viewport.x === 0 &&
              viewport.y === 0 &&
              viewport.scale === 1
            }
          >
            Reset view
          </button>
        </div>

        <svg
          className={isPanning ? 'graph-workspace__svg--panning' : ''}
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          role="img"
          aria-label="Mạng lưới đường và tiến trình tìm kiếm"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPanning}
          onPointerCancel={finishPanning}
          onDoubleClick={resetViewport}
        >
          <g
            className="graph-workspace__viewport"
            transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}
          >
            <RoadNetworkLayer
              features={edgeFeatures}
              project={drawing.project}
            />
            <FinalRouteLayer
              features={edgeFeatures}
              project={drawing.project}
              pathEdgeIds={result?.path_edges}
              segments={result?.segments}
              visible={showFinalPath}
            />

            <SearchAnimationLayer
              nodes={drawing.nodes}
              result={result}
              showFinalPath={showFinalPath}
            />
          </g>
        </svg>
      </div>

      <ul className="graph-workspace__legend" aria-label="Chú thích đồ thị">
        {[
          ['unvisited', 'Unvisited'],
          ['frontier', 'Frontier'],
          ['visited', 'Visited'],
          ['current', 'Current'],
          ['final', 'Final path'],
        ].map(([state, label]) => (
          <li key={state}>
            <span className={`graph-workspace__legend-dot--${state}`} />
            {label}
          </li>
        ))}
      </ul>
    </section>
  )
}
