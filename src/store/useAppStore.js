import { create } from 'zustand'

export const SIMULATION_STATUS = Object.freeze({
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  COMPLETED: 'completed',
})

export const REQUEST_STATUS = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  NO_PATH: 'no_path',
  INVALID_INPUT: 'invalid_input',
  ERROR: 'error',
})

const initialSimulationState = {
  status: SIMULATION_STATUS.IDLE,
  speed: 1,
  currentStep: 0,
}

const initialRouteSelection = {
  startNode: '',
  goalNode: '',
  visitNodes: [],
  scenarioId: 'S0',
  optimization: 'balanced',
}

export function getAnimationStepCount(result) {
  return result?.frontier_steps?.length || result?.visited_order?.length || 0
}

export const useAppStore = create((set) => ({
  graphData: {
    nodes: null,
    edges: null,
    isLoading: false,
    isLoaded: false,
    error: null,
  },
  selectedAlgorithm: 'astar',
  routeSelection: initialRouteSelection,
  routeResult: null,
  requestState: {
    status: REQUEST_STATUS.IDLE,
    message: null,
  },
  simulation: initialSimulationState,

  setGraphData: ({ nodes, edges }) =>
    set({
      graphData: {
        nodes,
        edges,
        isLoading: false,
        isLoaded: true,
        error: null,
      },
    }),

  setGraphDataError: (error) =>
    set((state) => ({
      graphData: {
        ...state.graphData,
        isLoading: false,
        isLoaded: false,
        error,
      },
    })),

  setGraphDataLoading: () =>
    set((state) => ({
      graphData: {
        ...state.graphData,
        isLoading: true,
        isLoaded: false,
        error: null,
      },
    })),

  clearGraphData: () =>
    set({
      graphData: {
        nodes: null,
        edges: null,
        isLoading: false,
        isLoaded: false,
        error: null,
      },
    }),

  setSelectedAlgorithm: (selectedAlgorithm) => set({ selectedAlgorithm }),

  setRouteField: (field, value) =>
    set((state) => ({
      routeSelection: {
        ...state.routeSelection,
        [field]: value,
      },
    })),

  addVisitNode: (nodeId) =>
    set((state) => {
      const { startNode, goalNode, visitNodes } = state.routeSelection
      const cannotAdd =
        !nodeId ||
        nodeId === startNode ||
        nodeId === goalNode ||
        visitNodes.includes(nodeId)

      if (cannotAdd) return state

      return {
        routeSelection: {
          ...state.routeSelection,
          visitNodes: [...visitNodes, nodeId],
        },
      }
    }),

  removeVisitNode: (nodeId) =>
    set((state) => ({
      routeSelection: {
        ...state.routeSelection,
        visitNodes: state.routeSelection.visitNodes.filter(
          (id) => id !== nodeId,
        ),
      },
    })),

  resetRouteSelection: () => set({ routeSelection: initialRouteSelection }),

  setRouteResult: (routeResult) =>
    set({
      routeResult,
      requestState: {
        status: routeResult?.status ?? REQUEST_STATUS.ERROR,
        message: routeResult?.message ?? null,
      },
      simulation: initialSimulationState,
    }),

  clearRouteResult: () =>
    set({
      routeResult: null,
      requestState: {
        status: REQUEST_STATUS.IDLE,
        message: null,
      },
      simulation: initialSimulationState,
    }),

  setRouteRequestLoading: () =>
    set({
      requestState: {
        status: REQUEST_STATUS.LOADING,
        message: 'Calculating route…',
      },
    }),

  setRouteRequestError: (message) =>
    set({
      requestState: {
        status: REQUEST_STATUS.ERROR,
        message,
      },
    }),

  dismissStatusMessage: () =>
    set({
      requestState: {
        status: REQUEST_STATUS.IDLE,
        message: null,
      },
    }),

  play: () =>
    set((state) => {
      const totalSteps = getAnimationStepCount(state.routeResult)
      if (state.routeResult?.status !== REQUEST_STATUS.SUCCESS || !totalSteps) {
        return state
      }

      const shouldReplay =
        state.simulation.status === SIMULATION_STATUS.COMPLETED ||
        state.simulation.currentStep >= totalSteps - 1

      return {
        simulation: {
          ...state.simulation,
          currentStep: shouldReplay ? 0 : state.simulation.currentStep,
          status: SIMULATION_STATUS.PLAYING,
        },
      }
    }),

  pause: () =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        status: SIMULATION_STATUS.PAUSED,
      },
    })),

  setSpeed: (speed) =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        speed,
      },
    })),

  setCurrentStep: (currentStep) =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        currentStep: Math.max(
          0,
          Math.min(
            Number(currentStep) || 0,
            Math.max(0, getAnimationStepCount(state.routeResult) - 1),
          ),
        ),
      },
    })),

  nextAction: () =>
    set((state) => {
      const totalSteps = getAnimationStepCount(state.routeResult)
      if (state.routeResult?.status !== REQUEST_STATUS.SUCCESS || !totalSteps) {
        return state
      }

      const lastStep = totalSteps - 1
      if (state.simulation.currentStep >= lastStep) return state

      const currentStep = state.simulation.currentStep + 1
      return {
        simulation: {
          ...state.simulation,
          currentStep,
          status:
            currentStep === lastStep
              ? SIMULATION_STATUS.COMPLETED
              : SIMULATION_STATUS.PAUSED,
        },
      }
    }),

  previousAction: () =>
    set((state) => {
      const totalSteps = getAnimationStepCount(state.routeResult)
      if (
        state.routeResult?.status !== REQUEST_STATUS.SUCCESS ||
        !totalSteps ||
        state.simulation.currentStep <= 0
      ) {
        return state
      }

      return {
        simulation: {
          ...state.simulation,
          currentStep: state.simulation.currentStep - 1,
          status: SIMULATION_STATUS.PAUSED,
        },
      }
    }),

  completeSimulation: () =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        status: SIMULATION_STATUS.COMPLETED,
      },
    })),

  resetSimulation: () =>
    set((state) => ({
      simulation: {
        ...initialSimulationState,
        speed: state.simulation.speed,
      },
    })),
}))
