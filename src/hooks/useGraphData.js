import { useCallback, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

const GRAPH_DATA_URLS = {
  nodes: '../../data/generated_routes_connected/nodes_snapped.geojson',
  edges: '../../data/generated_routes_connected/edges.geojson',
}

let pendingGraphRequest = null

function validateFeatureCollection(data, label, idField) {
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error(`${label} is not a valid GeoJSON FeatureCollection.`)
  }

  const missingIdentifier = data.features.some(
    (feature) => feature?.properties?.[idField] == null,
  )

  if (missingIdentifier) {
    throw new Error(`${label} contains a feature without ${idField}.`)
  }

  return data
}

async function fetchGeoJson(url, label, idField) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(
      `Unable to load ${label} (${response.status} ${response.statusText}).`,
    )
  }

  const data = await response.json()
  return validateFeatureCollection(data, label, idField)
}

function requestGraphData() {
  if (!pendingGraphRequest) {
    pendingGraphRequest = Promise.all([
      fetchGeoJson(GRAPH_DATA_URLS.nodes, 'nodes GeoJSON', 'node_id'),
      fetchGeoJson(GRAPH_DATA_URLS.edges, 'edges GeoJSON', 'edge_id'),
    ]).finally(() => {
      pendingGraphRequest = null
    })
  }

  return pendingGraphRequest
}

export function useGraphData({ autoLoad = true } = {}) {
  const isLoading = useAppStore((state) => state.graphData.isLoading)
  const isLoaded = useAppStore((state) => state.graphData.isLoaded)
  const error = useAppStore((state) => state.graphData.error)
  const setGraphData = useAppStore((state) => state.setGraphData)
  const setGraphDataError = useAppStore((state) => state.setGraphDataError)
  const setGraphDataLoading = useAppStore(
    (state) => state.setGraphDataLoading,
  )

  const loadGraphData = useCallback(async () => {
    setGraphDataLoading()

    try {
      const [nodes, edges] = await requestGraphData()
      setGraphData({ nodes, edges })
      return { nodes, edges }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load graph data.'
      setGraphDataError(message)
      return null
    }
  }, [setGraphData, setGraphDataError, setGraphDataLoading])

  useEffect(() => {
    if (autoLoad && !isLoaded && !isLoading && !error) {
      loadGraphData()
    }
  }, [autoLoad, error, isLoaded, isLoading, loadGraphData])

  return {
    isLoading,
    isLoaded,
    loadGraphData,
  }
}
