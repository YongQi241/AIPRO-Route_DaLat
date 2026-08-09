import { useEffect, useState } from 'react'
import { fetchScenarioEdgeCosts } from '../services/scenarioCostService'
import { useAppStore } from '../store/useAppStore'

export function useScenarioEdgeCosts() {
  const scenarioId = useAppStore((state) => state.routeSelection.scenarioId)
  const optimization = useAppStore(
    (state) => state.routeSelection.optimization,
  )
  const [state, setState] = useState({
    data: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()
    setState({ data: null, isLoading: true, error: null })

    fetchScenarioEdgeCosts(scenarioId, optimization, {
      signal: controller.signal,
    })
      .then((data) => {
        setState({ data, isLoading: false, error: null })
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setState({
          data: null,
          isLoading: false,
          error: error instanceof Error ? error.message : String(error),
        })
      })

    return () => controller.abort()
  }, [optimization, scenarioId])

  return { ...state, scenarioId, optimization }
}
