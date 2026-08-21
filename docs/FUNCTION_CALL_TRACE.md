# Function call trace

This document traces the application's own runtime functions from the React
frontend to the Python routing engine and back to the rendered UI. It names
external-library functions only at the boundary where they are used; it does
not trace React, Zustand, browser, NetworkX, pandas, or Python-standard-library
internals.

The trace reflects the current architecture: the browser uses three backend
routes (`/api/health`, `/api/algorithms`, and `/api/routes/solve`). Scenario
edge-cost display data is calculated locally from the two generated CSV files.

## 1. Runtime boundaries

| Boundary | Project entry point | External operation | Returns to |
| --- | --- | --- | --- |
| React boot | `src/main.jsx` | `ReactDOM.createRoot(...).render(...)` mounts `App` | React component tree |
| Static graph data | `useGraphData` | browser `fetch` reads GeoJSON | Zustand graph state |
| Edge-cost display data | `useScenarioEdgeCosts` | browser `fetch` reads CSV text | component-local hook state |
| Route request | `solveRoute` | browser `fetch` POSTs JSON | `useRouteSolver` |
| HTTP server | `RouteRequestHandler.do_POST` | `ThreadingHTTPServer` dispatches a request | `calculate_route` |
| Routing graph | `load_graph` | pandas reads/merges CSV, NetworkX creates `DiGraph` | selected algorithm |
| Search priority queues | UCS/Dijkstra/A*/Greedy | `heapq.heappush` and `heapq.heappop` | algorithm trace |
| UI state | store action functions | Zustand `set` stores immutable state | React subscribers |

## 2. End-to-end route flow

```text
main.jsx
  -> App()
      -> useGraphData()                         load graph GeoJSON
      -> useScenarioEdgeCosts()                  load CSV-derived edge costs
      -> useRouteSolver()
      -> RouteSelectionControls.onSolve(payload)
          -> createRouteRequest(...)
          -> runRouteSearch(payload)
              -> solveRoute(payload)
                  -> POST /api/routes/solve
                      -> RouteRequestHandler.do_POST()
                          -> calculate_route(payload)
                              -> routing.solve(...)
                                  -> solve_route(...) OR solve_multi_location(...)
                                      -> load_graph(...)
                                      -> selected search function
                                      -> common.finish_result(...)
                              <- JSON result
              -> store.setRouteResult(...)
              -> store.play() when a trace exists
              -> createComparisonRequests(...)
              -> solveRoute(...) for each independent profile
              -> store.setRouteComparisonResults(...)
      -> GraphWorkspace / panels / result components render stored result
          -> buildSearchActionTimeline(...)
          -> playback controls advance simulation.currentStep
```

The request is not streamed. The backend completes the search, then sends one
complete JSON response. The browser replays `frontier_steps`, `visited_order`,
and `path_edges` after receiving that response.

## 3. Frontend startup and static data

### `src/main.jsx` and `src/App.jsx`

1. `main.jsx` mounts `<App />`.
2. `App()` calls `useGraphData()` and `useScenarioEdgeCosts()`.
3. `App()` builds location selector entries from loaded node GeoJSON with
   `useMemo`.
4. `App()` passes callbacks and stored data to `AppShell`,
   `RouteSelectionControls`, `GraphWorkspace`, `AlgorithmSidebar`, playback
   controls, and bottom panels.

External calls: `ReactDOM.createRoot`, React `useMemo`, React rendering.

### `src/hooks/useGraphData.js`

```text
useGraphData()
  -> React useEffect(...)
      -> loadGraphData()
          -> store.setGraphDataLoading()
          -> requestGraphData()
              -> fetchGeoJson(nodes URL, ..., "node_id")
                  -> fetch(...)
                  -> response.json()
                  -> validateFeatureCollection(...)
              -> fetchGeoJson(edges URL, ..., "edge_id")
                  -> fetch(...)
                  -> response.json()
                  -> validateFeatureCollection(...)
          -> store.setGraphData({ nodes, edges })
          OR store.setGraphDataError(message)
```

Function roles:

| Function | Calls / responsibility |
| --- | --- |
| `validateFeatureCollection` | Validates GeoJSON shape and confirms every feature has its required ID. |
| `fetchGeoJson` | Fetches one GeoJSON resource, parses it, then validates it. |
| `requestGraphData` | Shares one pending `Promise.all` request across callers. |
| `useGraphData` | Exposes loading state and `loadGraphData`; auto-loads once. |

### `src/hooks/useScenarioEdgeCosts.js` and `src/services/scenarioCostService.js`

```text
useScenarioEdgeCosts()
  -> React useEffect(... on scenario/profile change)
      -> fetchScenarioEdgeCosts(scenarioId, optimization, { signal })
          -> loadLocalData()
              -> fetch(edges.csv) + fetch(edge_conditions.csv)
              -> parseCsv(text) for each file
          -> calculateScenarioEdgeCosts(edges, conditions, scenarioId, optimization)
              -> getOptimizationFormula(optimization)
              -> numeric / truthy / normalize helpers
              -> returns edge costs, details, closures, and formula
      -> hook setState({ data, isLoading, error })
```

| Function | Calls / responsibility |
| --- | --- |
| `parseCsv` | Parses CSV, including quoted and escaped fields. |
| `numeric` | Converts a value to a finite number or a fallback. |
| `truthy` | Interprets CSV boolean values. |
| `normalize` | Performs min--max normalization. |
| `calculateScenarioEdgeCosts` | Reproduces the backend's open-edge normalization and weighted route-cost calculation for display. |
| `loadLocalData` | Caches the two CSV fetches. |
| `fetchScenarioEdgeCosts` | Loads CSV data, honors an aborted request, and returns calculated display data. |
| `useScenarioEdgeCosts` | Restarts CSV-derived cost loading when scenario or optimization changes. |

`getOptimizationFormula` and `formatOptimizationFormula` in
`src/services/scenarioCostFormula.js` map UI aliases and return profile weights.
The profiles are `distance`/`shortest`, `time`/`fastest`, `balanced`,
`cost` (an alias of `balanced`), and `safest`.

## 4. User input, request construction, and API fallback

### Route-selection controls

```text
RouteSelectionControls
  -> handleEndpointChange(field, value)
      -> store.setRouteField(...)
      -> store.removeVisitNode(...) when the new endpoint was a stop
  -> handleAddIntermediate()
      -> store.addVisitNode(...)
  -> handleSubmit(event)
      -> createRouteRequest(routeSelection, selectedAlgorithm)
      -> onSolve(request) = useRouteSolver.runRouteSearch
```

`RouteSelectionControls` clears intermediate stops when a user leaves a
multi-location algorithm. It permits stops only for `nearest_neighbor` and
`brute_force_tsp`.

`src/services/routeRequest.js` contains:

| Function | Calls / responsibility |
| --- | --- |
| `isMultiLocationAlgorithm` | Tests membership in the multi-location set. |
| `createRouteRequest` | Uses IDs, merges unique intermediate stops and the selected destination into `visit_nodes` for a multi-location request, and emits an empty `visit_nodes` array otherwise. |

### `src/hooks/useRouteSolver.js`

```text
runRouteSearch(request)
  -> store.setRouteRequestLoading() -> requestId
  -> solveRoute(request)
      -> requestBackendRoute(apiUrl, request)
          -> fetch(POST, JSON body)
          -> parseResponse(...)
      OR, only in development without a configured API URL:
          -> requestDemoRoute(request)
              -> fetch(mock-result.json) for DL01 -> DL09 without stops
              OR createInvalidDemoResult(request)
  -> store.setRouteResult(result, requestId)
  -> store.play() if successful result contains a trace
  -> store.setRouteComparisonLoading(requestId)
  -> createComparisonRequests(request)
  -> Promise.allSettled(solveRoute(comparisonRequest, no demo fallback))
  -> store.setRouteComparisonResults(...) OR store.setRouteComparisonError(...)
```

`src/services/routeService.js` functions:

| Function | Calls / responsibility |
| --- | --- |
| `createInvalidDemoResult` | Creates a local invalid-input result outside the single permitted demo request. |
| `parseResponse` | Requires successful HTTP status, JSON, a status field, and `path_nodes`. |
| `requestBackendRoute` | Posts a request to the configured/default route API. |
| `requestDemoRoute` | Loads the static fixture for the permitted development request. |
| `solveRoute` | Prefers API; uses the development-only fixture fallback under its strict conditions. |

## 5. HTTP boundary and validation

### `backend/server.py`

```text
ThreadingHTTPServer
  -> RouteRequestHandler.do_OPTIONS() -> _send_json({})
  -> RouteRequestHandler.do_GET()
      -> _send_json(health) OR _send_json(algorithms) OR 404 JSON
  -> RouteRequestHandler.do_POST()
      -> urlparse(self.path)
      -> json.loads(request body)
      -> calculate_route(payload)
      -> _send_json(result)
```

| Function / method | Calls / responsibility |
| --- | --- |
| `calculate_route` | Validates required fields and `visit_nodes`; rejects stops with a single-route algorithm; calls `routing.solve`; adds API version. |
| `_send_json` | Serializes a JSON response and sets HTTP/CORS headers. |
| `do_OPTIONS` | Responds to browser preflight requests. |
| `do_GET` | Serves health and algorithm-capability metadata. |
| `do_POST` | Parses the solve request and returns its result. |
| `log_message` | Writes a compact request log. |
| `main` | Parses host/port then starts `ThreadingHTTPServer`. |

External calls: `ThreadingHTTPServer`, `json.loads`/`json.dumps`,
`urllib.parse.urlparse`, `argparse`.

## 6. Solver dispatcher and graph creation

### `routing/solver.py`

```text
solve(...)
  -> normalize_algorithm(algorithm)
  -> multi-location algorithm?
      -> solve_multi_location(...)
          -> normalize_optimization(...)
          -> load_graph(...)
          -> optimization_weight(...)
          -> nearest_neighbor_route(...) OR brute_force_tsp_route(...)
          -> _attach_scenario_edge_costs(...)
  -> otherwise solve_route(...)
      -> normalize_optimization(...)
      -> load_graph(...)
      -> optimization_weight(...)
      -> bfs_search / dfs_search / ucs_search / dijkstra_search /
         a_star_search / greedy_best_first_search / hill_climbing_search
      -> _attach_scenario_edge_costs(...)
```

| Function | Calls / responsibility |
| --- | --- |
| `_is_true` | Parses a scalar Boolean-like value. |
| `_attach_scenario_edge_costs` | Adds display-ready edge costs, closed IDs, individual cost details, and profile weights to a result. |
| `normalize_algorithm` | Normalizes aliases such as `a*`, `gbfs`, and `tsp`. |
| `optimization_weight` | Selects `distance_km`, `adjusted_time_min`, or `route_cost`. `safest` uses `route_cost`. |
| `normalize_optimization` | Maps UI aliases to loader profiles. |
| `get_scenario_edge_costs` | Internal helper for producing display costs without a route search. |
| `solve_route` | Loads graph, dispatches a one-goal algorithm, and translates expected errors into result JSON. |
| `solve_multi_location` | Loads graph then dispatches Nearest Neighbor or exhaustive TSP. |
| `solve` | Unified public dispatcher and route-mode gatekeeper. |
| `_single_error_result` / `_multi_error_result` | Create stable error contracts for the UI. |

### `routing/graph_loader.py`

```text
load_graph(scenario, profile)
  -> load_scenario(...)
      -> pandas.read_csv(nodes, edges, conditions)
      -> merge the selected scenario into edges
      -> parse_bool(base and scenario closures)
      -> remove closed edges
      -> calculate adjusted time and total risk
      -> min_max(distance, adjusted time, total risk)
      -> calculate route_cost with profile weights
  -> build_graph(nodes, open edges)
      -> NetworkX DiGraph.add_node(...)
      -> NetworkX DiGraph.add_edge(...)
```

| Function | Calls / responsibility |
| --- | --- |
| `parse_bool` | Converts CSV Boolean columns. |
| `min_max` | Performs safe min--max normalization, returning zero if every value is equal. |
| `load_scenario` | Reads, merges, filters, derives, normalizes, and weights scenario data. |
| `build_graph` | Builds the directed NetworkX graph and assigns all node/edge attributes. |
| `load_graph` | Calls `load_scenario`, then `build_graph`. |

External calls: `pandas.read_csv`, DataFrame merge/filter/arithmetic, and
`networkx.DiGraph.add_node` / `add_edge`.

## 7. Shared search-result functions

Every algorithm finishes through `routing/common.py`.

```text
algorithm
  -> validate_request(...)
  -> SearchTrace(path_nodes, visited_order, frontier_steps)
  -> finish_result(...)
      -> summarize_path(...)
      -> path_edges(...)
      -> build_human_explanation(...)
```

| Function | Calls / responsibility |
| --- | --- |
| `SearchTrace` | Dataclass holding a path and replay trace. |
| `reconstruct_path` | Walks parent links backward, then reverses them. |
| `path_edges` | Converts adjacent node pairs into ordered `edge_id` values. |
| `summarize_path` | Creates per-segment rows and total distance/time/cost/risk metrics. |
| `_node_label`, `_path_label`, `_same_path` | Format and compare paths for explanations. |
| `_benchmark_path` | Runs NetworkX shortest-path logic for a displayed alternative benchmark. |
| `build_human_explanation` | Describes the selected path, algorithm, congestion, and a distinct benchmark route. |
| `make_base_result` | Creates the common empty result shape. |
| `validate_request` | Returns invalid or trivial start-equals-goal result, otherwise `None`. |
| `finish_result` | Converts `SearchTrace` into `success` or `no_path` JSON. |
| `require_nonnegative_weight` | Ensures weighted searches only receive non-negative costs. |

## 8. Single-destination algorithms

### BFS: `routing/bfs.py`

```text
bfs_search
  -> validate_request
  -> deque FIFO loop
      -> graph.successors(current)
      -> record parent only on first discovery
      -> record current/frontier/visited frame
  -> reconstruct_path when goal is popped
  -> finish_result(weight_used="edge_count")
```

`bfs_search` minimizes edge count, not data-derived route cost.

External call: `collections.deque` provides FIFO operations.

### DFS: `routing/dfs.py`

```text
dfs_search
  -> validate_request
  -> LIFO list stack loop
      -> pop current
      -> graph.successors(current), reverse order
      -> mark a neighbor discovered when pushed
      -> assign its parent and record frame
  -> reconstruct_path when goal is popped
  -> finish_result
```

`dfs_search` prevents repeats by marking on push. A node may be expanded while
another already-discovered goal remains on the stack; therefore `visited_order`
can contain nodes not present in `path_nodes`. The final path still follows
valid parent links.

### Dijkstra: `routing/dijkstra.py`

```text
dijkstra_search
  -> validate_request / require_nonnegative_weight
  -> heap priority queue seeded with (0, start)
  -> repeatedly settle lowest-g node
      -> relax every graph.successors(current) edge
      -> update distance and parent when tentative g improves
      -> append a frontier snapshot
  -> stop at goal only when stop_at_goal=True
  -> otherwise settle every reachable node
  -> finish_result
```

`_frontier_snapshot` converts active heap entries into UI fields (`g_cost` and
`priority`). `ucs_search` calls Dijkstra with `stop_at_goal=True`; ordinary
Dijkstra uses its full single-source trace.

### UCS: `routing/ucs.py`

```text
ucs_search
  -> optimization_weight (if no explicit weight)
  -> dijkstra_search(..., stop_at_goal=True)
  -> replace result algorithm label with "UCS"
  -> build_human_explanation for success
```

### A*: `routing/a_star.py`

```text
a_star_search
  -> validate_request / require_nonnegative_weight
  -> default_heuristic(weight, maximum_speed_kph)
  -> heap priority queue seeded with f(start)
  -> pop lowest-f node
      -> skip stale entries
      -> calculate g, h, f values
      -> for each successor: relax g, update parent, push f
      -> permit reopening a previously closed node after a better g
      -> record relaxations and _frontier_snapshot
  -> reconstruct_path at goal
  -> finish_result
```

Supporting calls:

| Function | Role |
| --- | --- |
| `haversine_km` | Computes geographic straight-line distance. |
| `straight_line_distance_heuristic` | Uses Haversine for distance search. |
| `travel_time_heuristic` | Divides Haversine distance by the supplied safe maximum speed. |
| `zero_heuristic` | Keeps A* admissible for `route_cost` and `risk`; behavior then matches goal-directed Dijkstra. |
| `default_heuristic` | Chooses the correct default by weight. |
| `_cost_values` | Builds rounded g/h/f UI values. |
| `_frontier_snapshot` | Collapses active heap entries into one best entry per node. |

### Greedy Best-First: `routing/greedy_best_first.py`

```text
greedy_best_first_search
  -> validate_request
  -> straight_line_distance_heuristic (unless custom heuristic supplied)
  -> heap ordered only by h(n)
  -> discover each successor once, record frames
  -> reconstruct_path at goal
  -> finish_result(weight_used="heuristic_only")
```

`_heuristic_value` rejects negative custom values. `_frontier_snapshot` formats
the remaining h-priority queue.

### Hill climbing: `routing/hill_climbing.py`

```text
hill_climbing_search
  -> validate_request
  -> maintain active_path plus global visited set
  -> score unvisited successors with Haversine
  -> choose lowest-h successor
      -> count a local-minimum escape if h did not decrease
  -> if there are no candidates, pop active_path and count a backtrack
  -> finish_result and attach escape/backtrack metrics
```

This is a practical backtracking hill-climbing variant rather than pure
one-way hill climbing.

## 9. Multi-location algorithms

### Nearest Neighbor: `routing/nearest_neighbor.py`

```text
nearest_neighbor_route
  -> _unique_nodes(visit_nodes)
  -> validate supported weight and node IDs
  -> while unvisited targets remain:
      -> dijkstra_search(current, each candidate, stop_at_goal=True)
      -> score by METRIC_FOR_WEIGHT
      -> choose lowest (score, node ID)
      -> _append_leg(...)
      -> record selection_steps
  -> optional Dijkstra return-to-start leg
  -> _route_metrics(...)
  -> return route result
```

| Function | Role |
| --- | --- |
| `_append_leg` | Concatenates a chosen Dijkstra leg into the full route. |
| `_route_metrics` | Sums segment metrics and counts visited locations. |
| `_unique_nodes` | Preserves first occurrence of each requested target. |
| `_invalid_result` | Stable invalid-input result. |
| `_no_path_result` | Preserves completed partial route and names unreachable targets. |

### Exact brute-force TSP: `routing/brute_force_tsp.py`

```text
brute_force_tsp_route
  -> deduplicate targets and _validate(..., max_targets=8)
  -> run goal-directed Dijkstra for every ordered pair of relevant points
  -> itertools.permutations(targets)
  -> add cached leg metric for every feasible visit order
  -> keep the lowest (score, order)
  -> concatenate selected legs
  -> summarize_path / path_edges
  -> return permutations_evaluated and permutations_possible
```

| Function | Role |
| --- | --- |
| `_metric_for` | Maps selected edge weight to the matching aggregate metric. |
| `_validate` | Checks weight, node IDs, target count, and the eight-target ceiling. |
| `_empty_result` | Creates the multi-location failure contract. |

External call: `itertools.permutations` enumerates possible visit orders.

## 10. Zustand state and playback

`src/store/useAppStore.js` is the state boundary used by every UI component.

### Data and request actions

| Action/function | Called by | Effect |
| --- | --- | --- |
| `getAnimationStepCount` | store playback actions | Calls `buildSearchActionTimeline` and returns action count. |
| `getStateEdgeFeatures` | store playback actions | Reads loaded edge features. |
| `setGraphData`, `setGraphDataError`, `setGraphDataLoading`, `clearGraphData` | `useGraphData` or UI | Maintains graph-data state. |
| `setSelectedAlgorithm` | `AlgorithmSidebar.handleChange` | Chooses algorithm. |
| `setRouteField`, `addVisitNode`, `removeVisitNode`, `clearVisitNodes`, `resetRouteSelection` | route-selection controls | Maintains route form state. |
| `setRouteRequestLoading` | `runRouteSearch` | Generates a request ID, clears old results, enters loading. |
| `setRouteResult` | `runRouteSearch` | Rejects stale request IDs, stores result, initializes simulation. |
| `setRouteRequestError` | `runRouteSearch` catch | Stores transport failure. |
| `setRouteComparisonLoading`, `setRouteComparisonResults`, `setRouteComparisonError` | `runRouteSearch` | Manages asynchronous comparison results without replacing primary result. |
| `dismissStatusMessage`, `clearRouteResult` | feedback/UI controls | Clears user-facing status or result state. |

### Simulation actions

```text
PlaybackToolbar button
  -> store.play / pause / firstAction / previousAction / nextAction /
     lastAction / resetSimulation / setSpeed
  -> store action calls getAnimationStepCount when needed
  -> state updates simulation.status, currentStep, and result-reveal flag
  -> GraphWorkspace re-renders selected timeline action
```

`completeSimulation` and `revealFinalResult` are also store actions used when
the animation reaches a terminal state. `setCurrentStep` clamps external step
selection to valid timeline bounds.

## 11. Timeline, decisions, and graph rendering

### `src/components/graph/searchTimeline.js`

```text
buildSearchActionTimeline(result, edgeFeatures)
  -> result.selection_steps present?
      -> buildLocationSelectionActions(...)
  -> result.frontier_steps present?
      -> buildFrameActions(...) for every frame
  -> otherwise buildVisitedOrderActions(...)
  -> returns micro-actions: expand, consider-edge, frame-complete,
     consider-location, select-location
```

Function map:

| Function group | Responsibility |
| --- | --- |
| `toFiniteNumber`, `normalizeTraceEntry`, `getTraceNodeId`, `createFrontierLookup`, `getComparableScore`, `classifyRelaxation` | Normalize backend trace values and classify add/update/keep decisions. |
| `getCandidateEdges`, `actionBase`, `appendAction` | Find directed outgoing candidates and build normalized action records. |
| `buildLocationSelectionActions`, `buildFrameActions`, `buildVisitedOrderActions` | Turn backend multi-stop, detailed, or fallback trace forms into playback actions. |
| `buildSearchActionTimeline` | Selects the correct timeline builder. |
| `getSearchAction`, `shouldShowFinalPath`, `getCompletedVisitedNodeIds`, `getSearchAnimationFrame` | Reads a safe action and derives display state. |
| `getInferredSearchBranchEdgeIds` | Derives an active directed branch only for display. |
| `createEdgeLookup`, `createDirectedPairLookup`, `validateDirectedPath`, `inferFirstDiscoveryParents`, `reconstructInferredBranch`, `getExplicitParentBranch` | Safely resolve explicit or inferred directed branch geometry. |

### Graph and edge helpers

| Module | Function trace / responsibility |
| --- | --- |
| `graphGeometry.js` | `getLineCoordinates` -> `lineToPath` / `getLineLabelPosition` -> `createDrawableEdges`; normalizes line geometry into SVG paths and label positions. |
| `topologyLayout.js` | `createFruchtermanReingoldLayout` -> `initializePositions` -> `relaxPositions` -> `fitPositions` -> `positionEdges`; supporting `vectorBetween`, `applyForce`, `curvedEdge`, `selfLoop`, `clamp` create deterministic graph-view geometry. |
| `nodeConnections.js` | `createNodeConnectionLookup` prepares incoming/outgoing relationships; `describeNodeConnections` formats them for UI. |
| `edgeDecision.js` | `toNumber` -> `getDecisionCost` / `formatCost` -> `describeCandidateEdgeDecision`; `getEvaluatedCandidateEdgeIds`, `getTraceEdgeState`, and `sortTraceEdgesByPaintPriority` control highlighted edges. |
| `searchCostModel.js` | `normalizeAlgorithm`, `finiteNumber`, `resolveSearchWeight` support `getSearchCostModel`, `getSearchDecisionCost`, and `formatSearchCost`. |
| `locationDecision.js` | `toFiniteNumber` and `formatNumber` support `describeLocationDecision`. |

### `GraphWorkspace.jsx`

```text
GraphWorkspace
  -> buildSearchActionTimeline(result, edgeFeatures)
  -> getSearchAction(timeline, simulation.currentStep)
  -> selectActiveScenarioCostData(...)
  -> getInferredSearchBranchEdgeIds(...)
  -> createFruchtermanReingoldLayout(...) for graph mode
  -> map mode: getBounds -> createProjector
  -> createDrawableEdges / SVG layers render roads, trace, final route, nodes
```

Its local functions have the following roles:

| Function | Role |
| --- | --- |
| `clamp` | Enforces min/max values. |
| `getBounds`, `createProjector` | Project geographic features into SVG space for map mode. |
| `zoomAtPoint`, `zoomFromCenter`, `handleWheel` | Update zoom relative to pointer/center. |
| `handlePointerDown`, `handlePointerMove`, `finishPanning` | Maintain drag/pan state and hover-card position. |
| `resetViewport`, `changeLayout` | Restore view or swap map/graph layouts. |
| `handleEdgeHover` | Stores the hovered edge and safe popup position. |

Layers call their own focused helpers: `RoadNetworkLayer` draws base roads,
`FinalRouteLayer` maps `path_edges` to ordered highlights,
`SearchTraversalLayer.resolveEdges` and `EdgePaths` render trace states,
`GraphNodeLayer.resolveNodeState`/`getNodeNotation` paint nodes, and
`EdgeHoverCard.Condition` presents condition rows. `EdgeLabelLayer` and
`formatEdgeCostCalculation` display the local scenario-cost formula.

## 12. Results, explanations, and panels

### Formatting and reasoning

```text
RouteExplanation
  -> createNodeNameLookup(nodes)
  -> buildRouteReasoning(result, names, edges)
      -> objective / algorithmMethod / traceStatistics /
         selectedSegments / formulaContributions / selectionRounds
  -> buildOptimizationComparisonNarrative(result, comparison)
      -> normalizeOptimization / selectComparisonCandidate /
         metricDifferences / algorithmOptimality
```

| Module | Function trace / responsibility |
| --- | --- |
| `resultFormatting.js` | `formatNodeNumber`, `scaleCost`, `formatCost`, `createNodeNameLookup`, `formatAlgorithmLabel`, `formatOptimizationLabel`, `formatNumber`, `formatMetric` format raw result fields. |
| `routeReasoning.js` | `finite`, `nodeLabel`, `algorithmMethod`, `objective`, `traceStatistics`, `selectedSegments`, `formulaContributions`, `selectionRounds` feed `buildRouteReasoning`. |
| `routeComparison.js` | `normalizeOptimization` -> `getComparisonOptimizations` -> `createComparisonRequests`; then `finite`, `pathKey`, `routesMatch`, `objectiveImprovement`, and `selectComparisonCandidate` choose an alternative. `optimizationPriority`, `currentSelectionSentence`, `routeMetrics`, `congestedSegments`, `alternativeAdvantage`, `differenceClause`, `metricDifferences`, `joinClauses`, and `algorithmOptimality` feed `buildOptimizationComparisonNarrative`. |
| `edgeCostDetails.js` | `number` and `formatEdgeCostCalculation` show one edge's normalized weighted terms. |

`RouteExplanation` uses small render helpers `Figure`, `TraceStatistics`,
`ScenarioFormula`, `SelectionRounds`, and `SegmentConsiderations` to turn the
reasoning object into sections. `RouteResultPanel` and `SegmentDetails` use the
formatting helpers; `SegmentDetails.orderSegments` follows `path_edges` order.

### Bottom panels and logs

| Module | Function trace / responsibility |
| --- | --- |
| `BottomPanelTabs.jsx` | `selectTab` and `handleKeyDown` select an available tab, consulting `isResultTabLocked` and `getKeyboardTabIndex` from `bottomPanelTabsState.js`. |
| `CurrentTaskPanel.jsx` | `createLocationLookup` and its local `displayName` turn action IDs into readable task text. |
| `SearchLogPanel.jsx` | `shortenTraceDetail` limits long textual trace details. |
| `traceNarrative.js` | `toNumber`, `number`, `locationLabel`, `listLocations`, `expansionReason`, `candidateSummary`, and `localEdgeCost` feed `describeTraceAction`. |
| `PlaybackToolbar.jsx` | Calls store simulation actions; it does not calculate routes. |
| `StatusMessage.jsx` | Reads graph/request/result state and displays status. |

## 13. Algorithm selection and application shell

| Component | Runtime call trace |
| --- | --- |
| `AlgorithmSidebar` | `handleChange(algorithm)` -> `store.setSelectedAlgorithm(algorithm)`. |
| `RouteSelectionControls` | Uses `handleEndpointChange`, `handleAddIntermediate`, and `handleSubmit` as described in section 4. |
| `AppShell` | `CollapseButton` toggles local panel visibility; it does not reset global route state. |
| `GraphWorkspace` | Owns layout/viewport/hover local state; reads global result and simulation state. |
| `RouteResultPanel`, `SegmentDetails`, `RouteExplanation` | Read result state and render distinct summaries, segments, and reasoning. |

## 14. Result fields carried across the boundary

```text
Backend algorithm
  -> status, algorithm, scenario_id, optimization
  -> path_nodes, path_edges
  -> visited_order, frontier_steps, selection_steps
  -> metrics, segments, legs
  -> edge_costs, edge_cost_details, edge_cost_formula
  -> explanation, optimality_note, message
  -> frontend store
  -> timeline, layers, panels, comparison narrative
```

`path_edges` is the authoritative final-route geometry selection. The frontend
never invents final edges from coordinates. Any inferred parent branch is only
a temporary visualization aid during playback.

## 15. Error and no-path paths

```text
Bad client fields
  -> calculate_route invalid_input result
  -> store.setRouteResult
  -> StatusMessage / panels show message

Unknown nodes, scenario, algorithm, or unsupported route mode
  -> solver validation/error result
  -> same UI path

Valid search with no directed path
  -> common.finish_result(status="no_path")
  -> no final path; trace can still be replayed

Transport failure
  -> solveRoute throws
  -> useRouteSolver.setRouteRequestError
  -> StatusMessage shows service error

Development-only permitted fallback
  -> requestDemoRoute(mock-result.json)
  -> standard result/store/playback path
```

## 16. External-library reference

| Library/API call | Used for |
| --- | --- |
| React `useState`, `useEffect`, `useMemo`, `useCallback` | Component lifecycle, memoization, and event callbacks. |
| Zustand `create`, `set` | Shared application state and state actions. |
| Browser `fetch`, `AbortController` | GeoJSON/CSV reads and HTTP API request cancellation. |
| Browser `URL`, `URLSearchParams` | URL construction where needed. |
| Python `ThreadingHTTPServer`, `BaseHTTPRequestHandler` | Concurrent local JSON HTTP server. |
| Python `json`, `urllib.parse`, `argparse` | JSON transport, route parsing, and server arguments. |
| pandas `read_csv`, merge/filter/vector arithmetic | Scenario dataset loading and transformation. |
| NetworkX `DiGraph`, `successors`, graph attributes | Directed network representation and adjacency lookup. |
| `heapq` | Priority queues for Dijkstra, UCS, A*, and Greedy. |
| `collections.deque` | FIFO queue for BFS. |
| `itertools.permutations` | Exact TSP visit-order enumeration. |
| `math` trigonometry | Haversine distance and force-layout calculations. |

## 17. How to use this trace while debugging

1. If the form submits unexpected data, start at `createRouteRequest`.
2. If the server returns `invalid_input`, follow `do_POST` -> `calculate_route`
   -> `solve`.
3. If the route differs from expectation, inspect selected optimization weight
   in `optimization_weight`, then graph construction in `load_scenario`, then
   the selected algorithm.
4. If the route is right but playback is wrong, inspect `frontier_steps`,
   `buildSearchActionTimeline`, and `getSearchAction`.
5. If edge labels/formulas disagree with result data, inspect
   `calculateScenarioEdgeCosts` and `getOptimizationFormula`.
