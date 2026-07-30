import { useEffect, useMemo } from 'react'
import { SIMULATION_STATUS, useAppStore } from '../../store/useAppStore'
import GraphNodeLayer from './GraphNodeLayer'

export function getSearchAnimationFrame(result, currentStep) {
  const frontierSteps = result?.frontier_steps ?? []

  if (frontierSteps.length > 0) {
    const safeStep = Math.min(currentStep, frontierSteps.length - 1)
    const frame = frontierSteps[safeStep] ?? {}

    return {
      currentNodeId: frame.current ?? null,
      frontierNodeIds: frame.frontier ?? [],
      visitedNodeIds: frame.visited ?? [],
      totalSteps: frontierSteps.length,
    }
  }

  const visitedOrder = result?.visited_order ?? []

  return {
    currentNodeId: visitedOrder[currentStep] ?? null,
    frontierNodeIds: [],
    visitedNodeIds: visitedOrder.slice(0, currentStep),
    totalSteps: visitedOrder.length,
  }
}

export default function SearchAnimationLayer({
  nodes = [],
  result = null,
  showFinalPath = false,
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
    />
  )
}
