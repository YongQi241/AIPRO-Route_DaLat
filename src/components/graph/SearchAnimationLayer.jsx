import { useEffect, useMemo } from 'react'
import { SIMULATION_STATUS, useAppStore } from '../../store/useAppStore'
import GraphNodeLayer from './GraphNodeLayer'
import { getSearchAnimationFrame } from './searchTimeline'

export { getSearchAnimationFrame } from './searchTimeline'

export default function SearchAnimationLayer({
  nodes = [],
  result = null,
  showFinalPath = false,
  confirmedPathNodeIds = [],
  latestConfirmedNodeId = null,
}) {
  const simulation = useAppStore((state) => state.simulation)
  const setCurrentStep = useAppStore((state) => state.setCurrentStep)
  const completeSimulation = useAppStore(
    (state) => state.completeSimulation,
  )

  const frame = useMemo(
    () => getSearchAnimationFrame(result, simulation.currentStep),
    [result, simulation.currentStep],
  )

  useEffect(() => {
    if (simulation.status !== SIMULATION_STATUS.PLAYING) return undefined

    if (frame.totalSteps === 0) {
      completeSimulation()
      return undefined
    }

    const timerId = window.setTimeout(() => {
      const isLastStep = simulation.currentStep >= frame.totalSteps - 1

      if (isLastStep) {
        completeSimulation()
      } else {
        setCurrentStep(simulation.currentStep + 1)
      }
    }, 700 / simulation.speed)

    return () => window.clearTimeout(timerId)
  }, [
    completeSimulation,
    frame.totalSteps,
    setCurrentStep,
    simulation.currentStep,
    simulation.speed,
    simulation.status,
  ])

  return (
    <GraphNodeLayer
      nodes={nodes}
      currentNodeId={frame.currentNodeId}
      frontierNodeIds={frame.frontierNodeIds}
      visitedNodeIds={frame.visitedNodeIds}
      finalPathNodeIds={result?.path_nodes}
      showFinalPath={showFinalPath}
      confirmedPathNodeIds={confirmedPathNodeIds}
      latestConfirmedNodeId={latestConfirmedNodeId}
    />
  )
}
