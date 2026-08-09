# Da Lat Tourism Route Algorithms

This package implements the algorithm layer for the Da Lat tourism route
project. It loads a scenario-aware **directed** graph, runs route-search
algorithms, and returns stable `node_id` and `edge_id` values for the GUI.

The GUI should use `result["path_edges"]` to highlight the route in
`edges.geojson`.

## Project structure

```text
project/
├── algorithms/
│   ├── __init__.py
│   ├── common.py
│   ├── graph_loader.py
│   ├── bfs.py
│   ├── dfs.py
│   ├── ucs.py
│   ├── dijkstra.py
│   ├── astar.py
│   ├── greedy_best_first.py
│   ├── nearest_neighbor.py
│   ├── multi_location.py       # compatibility import
│   └── solver.py
├── data/
│   ├── nodes_snapped.csv
│   ├── edges.csv
│   └── edge_conditions.csv
├── example_usage.py
├── requirements.txt
└── README.md
```

The algorithm modules need the three CSV files above. GeoJSON files can remain
in `data/` for the display/GUI member.

## 1. Installation

```powershell
cd D:\path\to\your\project
py -m pip install -r requirements.txt
```

Recommended virtual environment:

```powershell
cd D:\path\to\your\project
py -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

In VS Code, select the virtual-environment interpreter:

```text
Ctrl+Shift+P → Python: Select Interpreter → .venv\Scripts\python.exe
```

## 2. Graph and scenario behavior

`graph_loader.py` performs the following steps:

1. Loads `nodes_snapped.csv`, `edges.csv`, and `edge_conditions.csv`.
2. Selects one `scenario_id`, such as `S0`, `S1`, or `S2`.
3. Applies scenario congestion, time multiplier, risk, and closure values.
4. Falls back to base edge values when a scenario value is missing.
5. Removes closed edges before search begins.
6. Calculates adjusted travel time and composite route cost.
7. Builds a `networkx.DiGraph`.

Road direction must always be respected. An edge from `DL01` to `DL02` does
not automatically create an edge from `DL02` to `DL01`.

## 3. Main solver functions

The recommended GUI entry point is the unified `solve(...)` function:

```python
from algorithms import solve
```

It dispatches to either:

- a single start-to-goal algorithm;
- an ordered route through intermediate stops for BFS, DFS, UCS, Dijkstra,
  and A*;
- Nearest Neighbor for a fast approximate multi-location order.
- Hill Climbing for local point-to-point search.
- Brute Force TSP for an exact multi-location order of up to eight targets.

The package also keeps the explicit functions:

```python
from algorithms import solve_route, solve_multi_location
```

## 4. Single-route example

```python
from algorithms import solve

result = solve(
    algorithm="astar",
    start_node="DL01",
    goal_node="DL15",
    scenario_id="S1",
    optimization="fastest",
    data_dir="data",
)

if result["status"] == "success":
    print(result["path_nodes"])
    print(result["path_edges"])
    print(result["metrics"])
else:
    print(result["message"])
```

Core algorithms can also visit intermediate locations in the exact supplied
order:

```python
result = solve(
    algorithm="astar",
    start_node="DL01",
    goal_node="DL15",
    visit_nodes=["DL03", "DL07"],
    scenario_id="S0",
    optimization="balanced",
)
```

This produces the fixed visit order `DL01 -> DL03 -> DL07 -> DL15`. Each leg
is solved by the selected algorithm, then the paths, traces, segments, and
metrics are combined. The core does not reorder or globally optimize these
intermediate locations.

Supported single-route algorithm names and aliases:

```text
bfs
dfs
ucs
uniform_cost
dijkstra
astar
a*
greedy
greedy_best_first
gbfs
```

Supported optimization profiles:

```text
shortest
fastest
balanced
safest
```

## 5. Greedy Best-First Search

Greedy Best-First Search uses only a heuristic estimate `h(n)` to decide which
frontier node to expand next. By default, it uses straight-line Haversine
distance from the node to the goal.

```python
from algorithms import solve

result = solve(
    algorithm="greedy_best_first",
    start_node="DL01",
    goal_node="DL15",
    scenario_id="S0",
    optimization="balanced",
    data_dir="data",
)
```

The result includes:

```python
result["heuristic"]
result["visited_order"]
result["frontier_steps"]
```

A Greedy frontier item has this structure:

```python
{
    "node": "DL04",
    "priority": 3.25,
    "h_cost": 3.25,
}
```

Greedy Best-First can reach the destination quickly, but it ignores the cost
already travelled. Therefore, it does not guarantee the shortest, fastest,
safest, or lowest-cost route.

Direct module use:

```python
from algorithms.graph_loader import load_graph
from algorithms.greedy_best_first import greedy_best_first_search

graph = load_graph("S0", "balanced", "data")

result = greedy_best_first_search(
    graph,
    "DL01",
    "DL15",
    scenario_id="S0",
    optimization="balanced",
)
```

## 6. Nearest Neighbor multi-location route

Nearest Neighbor is used when the user selects several locations. At every
step, the algorithm:

1. Runs Dijkstra from the current location to each unvisited location.
2. Measures each reachable route using the selected weight.
3. Chooses the location with the lowest score.
4. Appends that Dijkstra leg to the full route.
5. Repeats until every requested location has been visited.

```python
from algorithms import solve

result = solve(
    algorithm="nearest_neighbor",
    start_node="DL01",
    visit_nodes=["DL03", "DL08", "DL15"],
    scenario_id="S1",
    optimization="balanced",
    data_dir="data",
    return_to_start=False,
)

if result["status"] == "success":
    print("Visit order:", result["visit_order"])
    print("Full path:", result["path_nodes"])
    print("Edge IDs:", result["path_edges"])
    print("Metrics:", result["metrics"])
else:
    print(result["message"])
```

Accepted aliases:

```text
nearest_neighbor
nearest-neighbor
nearest neighbor
nn
```

To return to the starting location after visiting all destinations:

```python
result = solve(
    algorithm="nearest_neighbor",
    start_node="DL01",
    visit_nodes=["DL03", "DL08", "DL15"],
    return_to_start=True,
)
```

Nearest Neighbor output adds:

```python
result["visit_nodes"]       # requested locations
result["visit_order"]       # selected order, including start
result["selection_steps"]   # candidate scores at each choice
result["legs"]              # Dijkstra result for every selected leg
result["return_to_start"]
```

Example selection step:

```python
{
    "current": "DL01",
    "remaining_before": ["DL03", "DL08", "DL15"],
    "candidates": [
        {"node": "DL03", "reachable": True, "score": 0.42},
        {"node": "DL08", "reachable": True, "score": 0.76},
        {"node": "DL15", "reachable": False, "score": None},
    ],
    "selected": "DL03",
    "selected_score": 0.42,
}
```

Nearest Neighbor is an approximation. It chooses the best next stop locally,
but it does not guarantee the globally best complete visiting order.

## 7. Algorithm guarantees

| Algorithm | Priority/search value | Guarantee |
|---|---|---|
| BFS | Number of graph edges | Fewest simplified directed edges |
| DFS | Stack traversal order | First route found; no route-quality guarantee |
| UCS | `route_cost` | Lowest nonnegative composite cost |
| Dijkstra | Selected edge weight | Lowest selected nonnegative weight |
| A* | `g(n) + h(n)` | Optimal when the heuristic is admissible |
| Greedy Best-First | `h(n)` only | No optimality guarantee |
| Nearest Neighbor | Cheapest next Dijkstra leg | Approximate visit order only |
| Hill Climbing | Best heuristic successor with local-minimum escape and backtracking | Complete on finite reachable graphs; not optimal |
| Brute Force TSP | Every feasible target permutation | Globally optimal for the selected weight, capped at eight targets |

## 8. Optimization-to-weight mapping

Unless `weight=` is supplied explicitly, `solver.py` uses:

```text
shortest → distance_km
fastest  → adjusted_time_min
balanced → route_cost
safest   → route_cost
```

Supported weighted-search values are:

```text
distance_km
adjusted_time_min
route_cost
risk
```

Override the default weight:

```python
result = solve(
    algorithm="dijkstra",
    start_node="DL01",
    goal_node="DL15",
    optimization="balanced",
    weight="risk",
)
```

The same override works for Nearest Neighbor:

```python
result = solve(
    algorithm="nearest_neighbor",
    start_node="DL01",
    visit_nodes=["DL03", "DL08", "DL15"],
    weight="distance_km",
)
```

## 9. Standard single-route result

```python
{
    "status": "success",  # success | no_path | invalid_input | error
    "algorithm": "Greedy Best-First",
    "scenario_id": "S1",
    "optimization": "fastest",
    "start_node": "DL01",
    "goal_node": "DL15",
    "path_nodes": ["DL01", "DL04", "DL15"],
    "path_edges": ["E001", "E024"],
    "visited_order": ["DL01", "DL04", "DL15"],
    "frontier_steps": [],
    "metrics": {
        "total_distance_km": 10.2,
        "total_time_min": 24.8,
        "total_cost": 1.42,
        "total_risk": 0.0,
        "path_edge_count": 2,
        "explored_nodes": 3,
        "processing_time_ms": 0.8,
    },
    "segments": [],
    "explanation": "...",
    "optimality_note": "...",
    "message": None,
}
```

Always check `result["status"]` before drawing the final path.

## 10. GUI integration

```text
GUI request
    ↓
solve(...)
    ↓
solver.py selects the algorithm
    ↓
standard result with path_nodes, path_edges, metrics, and traces
    ↓
GUI filters edges.geojson by result["path_edges"]
```

Example dispatcher function in the GUI:

```python
from algorithms import solve


def calculate_route(request: dict) -> dict:
    return solve(
        algorithm=request["algorithm"],
        start_node=request["start_node"],
        goal_node=request.get("goal_node"),
        visit_nodes=request.get("visit_nodes"),
        scenario_id=request.get("scenario_id", "S0"),
        optimization=request.get("optimization", "balanced"),
        data_dir=request.get("data_dir", "data"),
        weight=request.get("weight"),
        return_to_start=request.get("return_to_start", False),
    )
```

## 11. Troubleshooting

### `SyntaxError` after typing `py -m pip ...`

You entered a terminal command at Python's `>>>` prompt. Exit Python:

```python
exit()
```

Then run the installation command in Command Prompt, PowerShell, or the VS Code
terminal.

### `Import "pandas" could not be resolved`

VS Code is probably using a different Python interpreter. Select the
interpreter where the packages were installed, preferably `.venv`.

### `ModuleNotFoundError: algorithms`

Run Python from the project root, which is the directory containing the
`algorithms` folder:

```powershell
cd D:\path\to\your\project
python example_usage.py
```

### Relative-import error

Do not run a package file directly like this:

```powershell
python algorithms\greedy_best_first.py
```

Run `example_usage.py`, import the package, or use a module command from the
project root.

## 12. Run the examples

```powershell
python example_usage.py
```

The example demonstrates both Greedy Best-First and Nearest Neighbor.


## Support modules

The package also requires these files inside the `algorithms/` directory:

- `__init__.py` — makes `algorithms` a Python package and exports the public API.
- `common.py` — contains path reconstruction, metrics, validation, and the
  standard result builder shared by BFS, DFS, UCS, Dijkstra, A*, and Greedy.
- `multi_location.py` — provides the public multi-location dispatcher and
  exports `nearest_neighbor_route`.

Do not delete these files. The expected import is:

```python
from algorithms import (
    solve,
    solve_route,
    solve_multi_location,
    multi_location_route,
)
```

## Required support modules

Keep these files inside the `algorithms/` directory:

- `__init__.py` makes `algorithms` a Python package and exports its public API.
- `common.py` contains shared validation, path reconstruction, metrics, and
  standardized result helpers.
- `multi_location.py` exposes the multi-location dispatcher and Nearest
  Neighbor route function.

Example imports:

```python
from algorithms import (
    solve,
    solve_route,
    solve_multi_location,
    multi_location_route,
)
```
