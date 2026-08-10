import { useCallback } from 'react'
import { solveRoute } from '../services/routeService'
import { useAppStore } from '../store/useAppStore'

export function useRouteSolver() {
  const setRouteRequestLoading = useAppStore(
    (state) => state.setRouteRequestLoading,
  )
  const setRouteRequestError = useAppStore(
    (state) => state.setRouteRequestError,
  )
  const setRouteResult = useAppStore((state) => state.setRouteResult)
  const play = useAppStore((state) => state.play)
  const isSolving = useAppStore(
    (state) => state.requestState.status === 'loading',
  )

  const runRouteSearch = useCallback(
    async (request) => {
      setRouteRequestLoading()

      try {
        const result = await solveRoute(request)
        setRouteResult(result)

        if (
          result.status === 'success' &&
          ((result.frontier_steps?.length ?? 0) > 0 ||
            (result.visited_order?.length ?? 0) > 0)
        ) {
          play()
        }

        return result
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Không thể hoàn tất yêu cầu định tuyến.'
        setRouteRequestError(message)
        return null
      }
    },
    [play, setRouteRequestError, setRouteRequestLoading, setRouteResult],
  )

  return {
    isSolving,
    runRouteSearch,
  }
}
