import { useMemo } from 'react'
import AlgorithmSidebar from './components/algorithm/AlgorithmSidebar'
import StatusMessage from './components/feedback/StatusMessage'
import GraphWorkspace from './components/graph/GraphWorkspace'
import AppShell from './components/layout/AppShell'
import PlaybackToolbar from './components/playback/PlaybackToolbar'
import CurrentTaskPanel from './components/panels/CurrentTaskPanel'
import SearchLogPanel from './components/panels/SearchLogPanel'
import RouteResultPanel from './components/results/RouteResultPanel'
import RouteExplanation from './components/results/RouteExplanation'
import SegmentDetails from './components/results/SegmentDetails'
import RouteSelectionControls from './components/route-selection/RouteSelectionControls'
import { useGraphData } from './hooks/useGraphData'
import { useRouteSolver } from './hooks/useRouteSolver'
import { useAppStore } from './store/useAppStore'

export default function App() {
  const { isLoading, loadGraphData } = useGraphData()
  const { isSolving, runRouteSearch } = useRouteSolver()
  const nodes = useAppStore((state) => state.graphData.nodes)
  const locations = useMemo(() => {
    if (!nodes?.features) return []

    return nodes.features.map(({ properties }) => ({
      value: String(properties.node_id),
      label: `${properties.name_vi ?? properties.name_en ?? properties.node_id} (${properties.node_id})`,
    }))
  }, [nodes])

  return (
    <AppShell
      topBar={
        <>
          <PlaybackToolbar
            onLoad={loadGraphData}
            loadDisabled={isLoading}
          />
          <RouteSelectionControls
            locations={locations}
            onSolve={runRouteSearch}
            disabled={isSolving}
          />
          <StatusMessage />
        </>
      }
      workspace={<GraphWorkspace />}
      sidebar={<AlgorithmSidebar />}
      bottomPanel={
        <div className="bottom-panel-grid">
          <CurrentTaskPanel />
          <SearchLogPanel />
          <RouteResultPanel />
          <SegmentDetails />
          <RouteExplanation className="bottom-panel-grid__full-width" />
        </div>
      }
    />
  )
}
