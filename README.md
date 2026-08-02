# Da Lat Route Search

A full-stack route-search visualizer for the Da Lat road network. The React
frontend now calls a unified Python HTTP API, which loads the scenario-aware
directed graph and dispatches BFS, DFS, UCS, Dijkstra, A*, Greedy Best-First,
Nearest Neighbor, Hill Climbing, or exact Brute-Force TSP.

The UI replays the complete search trace after the API responds. It is not a
live-streaming search.

## Run guide

Requirements: Python 3.10+, Node.js 18+, and npm.

From the repository root, install everything once:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
npm install
```

Then run the application in two terminals.

Terminal 1 — backend:

```powershell
.\.venv\Scripts\Activate.ps1
python -m backend.server
```

Terminal 2 — frontend:

```powershell
npm run dev
```

Open `http://localhost:5173`. The backend runs at
`http://127.0.0.1:8000`; its status can be checked at
`http://127.0.0.1:8000/api/health`.

On macOS or Linux, replace the PowerShell activation command with:

```bash
source .venv/bin/activate
```

No environment variable is required locally. Vite automatically forwards
`/api/*` requests to the Python backend.

## What was unified

Previously, the frontend and algorithms existed beside each other but were not
connected:

- the frontend used `data/mock-result.json` for one hard-coded route;
- there was no HTTP backend;
- the UI scenario list did not match the dataset;
- UI optimization values (`distance`, `time`, and `cost`) were rejected by the
  Python graph loader;
- the algorithms assumed data files existed in `data/`, although the actual
  generated files live in `data/generated_routes_connected/`;
- the old condition template assigned identical values to every edge in a
  scenario;
- `algorithms/ucs.py` contained a duplicate dispatcher and imported itself,
  causing a circular import that prevented the algorithm package from loading;
- intermediate stops could be submitted with algorithms that silently ignored
  them.

The integration now provides:

- a Python JSON API in `backend/server.py`;
- `POST /api/routes/solve` as the single frontend/backend route contract;
- `GET /api/health` for health checks;
- Vite proxying from `/api` to `http://127.0.0.1:8000`;
- frontend API-first behavior with a development-only fixture fallback;
- data paths resolved from the project location, independent of the shell's
  current directory;
- reproducible, varied edge conditions generated into `edge_conditions.csv`;
- shared optimization aliases;
- matching `S0`–`S4` UI scenarios;
- a working UCS module;
- Nearest Neighbor in the algorithm selector for routes with intermediate
  locations;
- structured validation errors rather than silently dropping intermediate
  stops.

## Architecture

```text
Browser
  |
  | POST /api/routes/solve
  v
Vite dev proxy (development only)
  |
  v
backend/server.py
  |
  v
algorithms/solver.py
  |-- graph_loader.py -> scenario-aware NetworkX DiGraph
  |-- bfs.py
  |-- dfs.py
  |-- ucs.py
  |-- dijkstra.py
  |-- astar.py
  |-- greedy_best_first.py
  |-- nearest_neighbor.py
  |-- hill_climbing.py
  `-- brute_force_tsp.py
  |
  v
Standard result JSON
  |
  v
Zustand store -> SVG search replay, final route, metrics, and explanation
```

The API is deliberately thin. Validation and transport belong to
`backend/server.py`; graph construction and route logic remain in
`algorithms/`.

### Custom backend URL

Copy `.env.example` to `.env` and set:

```dotenv
VITE_ROUTE_API_URL=https://example.com/api/routes/solve
```

Use this when the frontend and backend are deployed on different origins.
The server includes permissive CORS headers, which can be restricted for a
production deployment.

## API reference

### Health check

```http
GET /api/health
```

Response:

```json
{
  "status": "ok",
  "service": "dalat-route-api",
  "version": "2.0"
}
```

Backend-supported algorithms can be inspected without reading source code:

```http
GET /api/algorithms
```

This returns the display name, request ID, route mode, and the eight-target
limit for Exact TSP. It is also useful for confirming that a running backend
process has been restarted after algorithm changes.

### Solve a route

```http
POST /api/routes/solve
Content-Type: application/json
```

Single-destination request:

```json
{
  "algorithm": "astar",
  "start_node": "DL01",
  "goal_node": "DL09",
  "visit_nodes": [],
  "scenario_id": "S0",
  "optimization": "balanced"
}
```

Multi-location request:

```json
{
  "algorithm": "nearest_neighbor",
  "start_node": "DL01",
  "goal_node": "DL09",
  "visit_nodes": ["DL03", "DL08", "DL09"],
  "scenario_id": "S1",
  "optimization": "time",
  "return_to_start": false
}
```

For multi-location algorithms, `visit_nodes` is the complete target set. The frontend
automatically appends the selected destination to the intermediate locations.

### Request fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `algorithm` | string | Yes | `bfs`, `dfs`, `ucs`, `dijkstra`, `astar`, `greedy`, `hill_climbing`, `nearest_neighbor`, or `brute_force_tsp` |
| `start_node` | string | Yes | Starting graph node ID |
| `goal_node` | string | Single-route | Destination node ID |
| `visit_nodes` | string[] | Multi-location | Locations to visit; use `[]` for a single route |
| `scenario_id` | string | No | Defaults to `S0` |
| `optimization` | string | No | Defaults to `balanced` |
| `return_to_start` | boolean | No | Multi-location only; defaults to `false` |

### Optimization aliases

| API/UI value | Graph profile | Weight used by weighted algorithms |
|---|---|---|
| `distance` or `shortest` | `shortest` | `distance_km` |
| `time` or `fastest` | `fastest` | `adjusted_time_min` |
| `balanced` or `cost` | `balanced` | `route_cost` |
| `safest` | `safest` | `route_cost` using the safest profile |

BFS and DFS follow graph traversal order rather than minimizing a numeric
weight. Greedy uses its heuristic. The selected scenario still determines
which edges and effective conditions enter the graph.

### Scenarios

The bundled condition template contains:

| ID | Dataset name | UI label |
|---|---|---|
| `S0` | `weekday_normal` | Weekday normal |
| `S1` | `weekend_busy` | Weekend busy |
| `S2` | `evening_rush` | Evening rush |
| `S3` | `heavy_rain` | Heavy rain |
| `S4` | `dense_fog` | Dense fog |

Conditions are generated reproducibly with seed `2026`. Run
`python data/generate_edge_conditions.py` to rebuild `edge_conditions.csv`
from the current edges dataset.

### Result contract

Successful algorithms return the same core fields:

```json
{
  "status": "success",
  "algorithm": "A*",
  "scenario_id": "S0",
  "optimization": "balanced",
  "start_node": "DL01",
  "goal_node": "DL09",
  "path_nodes": ["DL01", "DL02", "DL05", "DL09"],
  "path_edges": ["E001", "E010", "E020"],
  "visited_order": ["DL01", "DL02"],
  "frontier_steps": [],
  "metrics": {
    "total_distance_km": 4.2,
    "total_time_min": 8.5
  },
  "segments": [],
  "explanation": "Algorithm-specific explanation.",
  "optimality_note": "Algorithm-specific guarantee."
}
```

Exact paths and metrics depend on the dataset, scenario, and optimization.
Multi-location results also return `visit_order`, `selection_steps`, and `legs`.
Hill Climbing uses a practical backtracking variant: it prefers improving
heuristic moves, escapes local minima when necessary, and reports
`local_minimum_escapes` and `backtracks` in its metrics. It is complete on the
finite reachable graph but does not guarantee an optimal route.

Possible `status` values:

- `success`: a route was found;
- `no_path`: input was valid, but the directed graph contains no route;
- `invalid_input`: fields, node IDs, scenario, or algorithm combination is
  invalid;
- `error`: an unexpected calculation error occurred.

Algorithm-level failures still use HTTP 200 because they are valid API
responses consumed by the visualization. Malformed JSON and non-object request
bodies use HTTP 400. Unknown endpoints use HTTP 404.

## Frontend behavior

`src/services/routeService.js` posts to `/api/routes/solve` by default.

In development only, if the local API cannot be reached and no custom
`VITE_ROUTE_API_URL` is configured, the service falls back to
`data/mock-result.json`. That fallback supports only `DL01` to `DL09` with no
intermediate locations. Production builds do not hide API connectivity errors.

The returned result is stored in Zustand. If it contains `frontier_steps` or
`visited_order`, playback starts and the SVG layers replay the recorded trace.
The frontend does not recalculate routes.

The graph workspace has two layouts:

- **Map** uses the original geographic coordinates and road geometry.
- **Graph** ignores coordinates and uses a deterministic force-directed layout
  that spreads nodes and connections evenly across the canvas.

Graph layout retains every directed connection, cycle, cross-link, and
self-loop. Opposing directed edges curve away from each other so both remain
visible. Search playback and final-route glows work in either layout.

Intermediate locations are valid with Nearest Neighbor and Brute Force TSP.
The UI displays a clear warning if stops are present with a single-route
algorithm, and the API independently rejects that combination. Exact TSP is
limited to eight targets to prevent accidental factorial workloads.

## Project structure

```text
.
|-- backend/
|   |-- __init__.py
|   `-- server.py
|-- algorithms/
|   |-- solver.py
|   |-- graph_loader.py
|   |-- bfs.py
|   |-- dfs.py
|   |-- ucs.py
|   |-- dijkstra.py
|   |-- astar.py
|   |-- greedy_best_first.py
|   |-- nearest_neighbor.py
|   |-- hill_climbing.py
|   `-- brute_force_tsp.py
|-- data/
|   |-- generated_routes_connected/
|   |   |-- nodes_snapped.csv
|   |   |-- edges.csv
|   |   |-- edge_conditions.csv
|   |   |-- nodes_snapped.geojson
|   |   `-- edges.geojson
|   `-- mock-result.json
|-- src/
|   |-- components/
|   |-- hooks/
|   |-- services/routeService.js
|   |-- store/useAppStore.js
|   |-- App.jsx
|   `-- main.jsx
|-- requirements.txt
|-- package.json
`-- vite.config.js
```

## Validation and build commands

Build the frontend:

```powershell
npm run build
```

Quick API/solver smoke test:

```powershell
python -c "from backend.server import calculate_route; print(calculate_route({'algorithm':'astar','start_node':'DL01','goal_node':'DL09','visit_nodes':[],'scenario_id':'S0','optimization':'balanced'})['status'])"
```

Manual HTTP test after starting the backend:

```powershell
$body = @{
  algorithm = 'astar'
  start_node = 'DL01'
  goal_node = 'DL09'
  visit_nodes = @()
  scenario_id = 'S0'
  optimization = 'balanced'
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/api/routes/solve `
  -ContentType 'application/json' `
  -Body $body
```

## Deployment notes

`python -m backend.server` uses Python's threaded standard-library HTTP server.
It keeps the project dependency-light and is appropriate for local development,
demonstrations, and coursework. For a public production deployment, place the
same `calculate_route()` boundary behind a production ASGI/WSGI framework,
restrict CORS to the frontend origin, add request-size/time limits, and run it
behind TLS.

The Vite production build creates `dist/`. Serve that directory with a static
host and set `VITE_ROUTE_API_URL` at build time if the API is not available
under the same `/api` origin.

## Troubleshooting

### The frontend shows the fixture or an API error

Make sure `python -m backend.server` is running on port 8000. Check:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

### `ModuleNotFoundError: pandas` or `networkx`

Activate the intended virtual environment and run:

```powershell
python -m pip install -r requirements.txt
```

### Unknown scenario

Use `S0` through `S4`, or add a complete scenario to the active conditions CSV.

### No route

The graph is directed. A reverse path is not guaranteed, and scenario closures
can disconnect otherwise reachable nodes.

### Intermediate locations are rejected

Choose Nearest Neighbor or Brute Force TSP. BFS, DFS, UCS, Dijkstra, A*,
Greedy, and Hill Climbing are single-destination searches and intentionally
reject `visit_nodes`.
