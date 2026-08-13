import { useEffect } from 'react'
import { SIMULATION_STATUS, useAppStore } from '../../store/useAppStore'
import GraphNodeLayer from './GraphNodeLayer'
import { getCompletedVisitedNodeIds } from './searchTimeline'

export default function SearchAnimationLayer({
  nodes = [],
  result = null,
  action = null,
  totalActions = 0,
  showFinalPath = false,
  markerScale = 1,
}) {
  const simulation = useAppStore((state) => state.simulation)
  const setCurrentStep = useAppStore((state) => state.setCurrentStep)
  const completeSimulation = useAppStore(
    (state) => state.completeSimulation,
  )

  useEffect(() => {
    if (simulation.status !== SIMULATION_STATUS.PLAYING) return undefined

    if (totalActions === 0) {
      completeSimulation()
      return undefined
    }

    const timerId = window.setTimeout(() => {
      const lastAction = totalActions - 1
      const isFinishing = simulation.currentStep >= lastAction

      if (isFinishing) {
        completeSimulation()
      } else {
        setCurrentStep(simulation.currentStep + 1)
      }
    }, 700 / simulation.speed)

    return () => window.clearTimeout(timerId)
  }, [
    completeSimulation,
    setCurrentStep,
    simulation.currentStep,
    simulation.speed,
    simulation.status,
    totalActions,
  ])

  const isComplete = simulation.status === SIMULATION_STATUS.COMPLETED
  const completedVisitedNodeIds = isComplete
    ? getCompletedVisitedNodeIds(result, action)
    : null

  return (
    <GraphNodeLayer
      nodes={nodes}
      currentNodeId={isComplete ? null : action?.currentNodeId}
      frontierNodeIds={isComplete ? [] : action?.frontierNodeIds}
      visitedNodeIds={completedVisitedNodeIds ?? action?.visitedNodeIds}
      evaluatedNodeId={isComplete ? null : action?.activeNeighborId}
      finalPathNodeIds={result?.path_nodes}
      showFinalPath={showFinalPath}
      markerScale={markerScale}
    />
  )
}
