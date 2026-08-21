import { create } from 'zustand'
import { buildSearchActionTimeline } from '../components/graph/searchTimeline.js'

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

export function getAnimationStepCount(result, edgeFeatures = []) {
  return buildSearchActionTimeline(result, edgeFeatures).length
}

function getStateEdgeFeatures(state) {
  return state.graphData.edges?.features ?? []
}

const initialRouteComparison = {
  status: REQUEST_STATUS.IDLE,
  candidates: [],
  message: null,
}

export const useAppStore = create((set, get) => ({
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
  routeComparison: initialRouteComparison,
  activeRouteRequestId: 0,
  requestState: {
    status: REQUEST_STATUS.IDLE,
    message: null,
  },
  simulation: initialSimulationState,
  hasRevealedFinalResult: false,

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

  clearVisitNodes: () =>
    set((state) => ({
      routeSelection: {
        ...state.routeSelection,
        visitNodes: [],
      },
    })),

  resetRouteSelection: () => set({ routeSelection: initialRouteSelection }),

  setRouteResult: (routeResult, requestId = null) => {
    let accepted = false
    set((state) => {
      if (requestId != null && requestId !== state.activeRouteRequestId) return state
      accepted = true
      return {
      routeResult,
      requestState: {
        status: routeResult?.status ?? REQUEST_STATUS.ERROR,
        message: routeResult?.message ?? null,
      },
      simulation: initialSimulationState,
      hasRevealedFinalResult:
        routeResult?.status === REQUEST_STATUS.SUCCESS &&
        getAnimationStepCount(routeResult, getStateEdgeFeatures(state)) === 0,
      }
    })
    return accepted
  },

  clearRouteResult: () =>
    set({
      routeResult: null,
      routeComparison: initialRouteComparison,
      requestState: {
        status: REQUEST_STATUS.IDLE,
        message: null,
      },
      simulation: initialSimulationState,
      hasRevealedFinalResult: false,
    }),

  setRouteRequestLoading: () => {
    const requestId = get().activeRouteRequestId + 1
    set({
      activeRouteRequestId: requestId,
      routeResult: null,
      routeComparison: {
        ...initialRouteComparison,
        status: REQUEST_STATUS.LOADING,
      },
      requestState: {
        status: REQUEST_STATUS.LOADING,
        message: 'Đang tính toán tuyến đường…',
      },
      simulation: initialSimulationState,
      hasRevealedFinalResult: false,
    })
    return requestId
  },

  setRouteRequestError: (message, requestId = null) =>
    set((state) => requestId != null && requestId !== state.activeRouteRequestId ? state : ({
      routeResult: null,
      routeComparison: initialRouteComparison,
      requestState: {
        status: REQUEST_STATUS.ERROR,
        message,
      },
      simulation: initialSimulationState,
      hasRevealedFinalResult: false,
    })),

  setRouteComparisonLoading: (requestId) =>
    set((state) => requestId !== state.activeRouteRequestId ? state : ({
      routeComparison: {
        status: REQUEST_STATUS.LOADING,
        candidates: [],
        message: null,
      },
    })),

  setRouteComparisonResults: (requestId, candidates) =>
    set((state) => requestId !== state.activeRouteRequestId ? state : ({
      routeComparison: {
        status: REQUEST_STATUS.SUCCESS,
        candidates,
        message: null,
      },
    })),

  setRouteComparisonError: (requestId, message) =>
    set((state) => requestId !== state.activeRouteRequestId ? state : ({
      routeComparison: {
        status: REQUEST_STATUS.ERROR,
        candidates: [],
        message,
      },
    })),

  dismissStatusMessage: () =>
    set({
      requestState: {
        status: REQUEST_STATUS.IDLE,
        message: null,
      },
    }),

  play: () =>
    set((state) => {
      const totalSteps = getAnimationStepCount(
        state.routeResult,
        getStateEdgeFeatures(state),
      )
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
            Math.max(
              0,
              getAnimationStepCount(
                state.routeResult,
                getStateEdgeFeatures(state),
              ) - 1,
            ),
          ),
        ),
      },
    })),

  nextAction: () =>
    set((state) => {
      const totalSteps = getAnimationStepCount(
        state.routeResult,
        getStateEdgeFeatures(state),
      )
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
        hasRevealedFinalResult:
          state.hasRevealedFinalResult || currentStep === lastStep,
      }
    }),

  firstAction: () =>
    set((state) => {
      const totalSteps = getAnimationStepCount(
        state.routeResult,
        getStateEdgeFeatures(state),
      )
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
          currentStep: 0,
          status: SIMULATION_STATUS.PAUSED,
        },
      }
    }),

  lastAction: () =>
    set((state) => {
      const totalSteps = getAnimationStepCount(
        state.routeResult,
        getStateEdgeFeatures(state),
      )
      if (state.routeResult?.status !== REQUEST_STATUS.SUCCESS || !totalSteps) {
        return state
      }

      return {
        simulation: {
          ...state.simulation,
          currentStep: totalSteps - 1,
          status: SIMULATION_STATUS.COMPLETED,
        },
        hasRevealedFinalResult: true,
      }
    }),

  previousAction: () =>
    set((state) => {
      const totalSteps = getAnimationStepCount(
        state.routeResult,
        getStateEdgeFeatures(state),
      )
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
      hasRevealedFinalResult:
        state.hasRevealedFinalResult ||
        state.routeResult?.status === REQUEST_STATUS.SUCCESS,
    })),

  revealFinalResult: () =>
    set((state) => ({
      hasRevealedFinalResult:
        state.hasRevealedFinalResult ||
        state.routeResult?.status === REQUEST_STATUS.SUCCESS,
    })),

  resetSimulation: () =>
    set((state) => ({
      simulation: {
        ...initialSimulationState,
        speed: state.simulation.speed,
      },
    })),
}))
