import { useMemo } from 'react'
import AlgorithmSidebar from './components/algorithm/AlgorithmSidebar'
import StatusMessage from './components/feedback/StatusMessage'
import GraphWorkspace from './components/graph/GraphWorkspace'
import AppShell from './components/layout/AppShell'
import PlaybackToolbar from './components/playback/PlaybackToolbar'
import BottomPanelTabs from './components/panels/BottomPanelTabs'
import RouteSelectionControls from './components/route-selection/RouteSelectionControls'
import { useGraphData } from './hooks/useGraphData'
import { useRouteSolver } from './hooks/useRouteSolver'
import { useAppStore } from './store/useAppStore'

export default function App() {
  useGraphData()
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
          <PlaybackToolbar />
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
      bottomPanel={<BottomPanelTabs />}
    />
  )
}
