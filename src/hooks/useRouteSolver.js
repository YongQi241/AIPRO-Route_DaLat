import { useCallback } from 'react'
import { solveRoute } from '../services/routeService'
import { createComparisonRequests } from '../services/routeComparison'
import { useAppStore } from '../store/useAppStore'

export function useRouteSolver() {
  const setRouteRequestLoading = useAppStore(
    (state) => state.setRouteRequestLoading,
  )
  const setRouteRequestError = useAppStore(
    (state) => state.setRouteRequestError,
  )
  const setRouteResult = useAppStore((state) => state.setRouteResult)
  const setRouteComparisonLoading = useAppStore((state) => state.setRouteComparisonLoading)
  const setRouteComparisonResults = useAppStore((state) => state.setRouteComparisonResults)
  const setRouteComparisonError = useAppStore((state) => state.setRouteComparisonError)
  const play = useAppStore((state) => state.play)
  const isSolving = useAppStore(
    (state) => state.requestState.status === 'loading',
  )

  const runRouteSearch = useCallback(
    async (request) => {
      const requestId = setRouteRequestLoading()
      let result

      try {
        result = await solveRoute(request)
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Không thể hoàn tất yêu cầu định tuyến.'
        setRouteRequestError(message, requestId)
        return null
      }

      const accepted = setRouteResult(result, requestId)
      if (!accepted) return result

      if (
        result.status === 'success' &&
        ((result.frontier_steps?.length ?? 0) > 0 ||
          (result.visited_order?.length ?? 0) > 0)
      ) {
        play()
      }

      if (result.status !== 'success') return result

      setRouteComparisonLoading(requestId)
      try {
        const comparisonRequests = createComparisonRequests(request)
        const settled = await Promise.allSettled(
          comparisonRequests.map(async (comparisonRequest) => ({
            optimization: comparisonRequest.optimization,
            algorithm: comparisonRequest.algorithm,
            comparisonRole: comparisonRequest.comparison_role,
            request: comparisonRequest,
            result: await solveRoute(comparisonRequest, { allowDemoFallback: false }),
          })),
        )
        const candidates = settled
          .filter(({ status }) => status === 'fulfilled')
          .map(({ value }) => value)

        if (candidates.length > 0) {
          setRouteComparisonResults(requestId, candidates)
        } else {
          setRouteComparisonError(requestId, 'Không thể tải tuyến đối chứng.')
        }
      } catch {
        setRouteComparisonError(requestId, 'Không thể tải tuyến đối chứng.')
      }

      return result
    },
    [
      play,
      setRouteComparisonError,
      setRouteComparisonLoading,
      setRouteComparisonResults,
      setRouteRequestError,
      setRouteRequestLoading,
      setRouteResult,
    ],
  )

  return {
    isSolving,
    runRouteSearch,
  }
}
