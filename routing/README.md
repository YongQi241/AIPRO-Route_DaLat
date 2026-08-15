# Production routing engine

`routing` is the only route-computation package used by the application. It
loads the scenario-aware directed graph from `data/generated/`, runs the
selected search algorithm, and returns the stable result contract consumed by
the HTTP API and React frontend.

## Package map

| Module | Responsibility |
|---|---|
| `solver.py` | Public dispatcher, request normalization, and profile selection. |
| `graph_loader.py` | Load CSV data and build the NetworkX directed graph. |
| `common.py` | Shared validation, traces, path reconstruction, and metrics. |
| `bfs.py`, `dfs.py`, `ucs.py` | Uninformed graph-search algorithms. |
| `dijkstra.py`, `a_star.py` | Weighted shortest-path algorithms. |
| `greedy_best_first.py`, `hill_climbing.py` | Heuristic search algorithms. |
| `nearest_neighbor.py` | Approximate multi-location routing. |
| `brute_force_tsp.py` | Exact multi-location routing for small target sets. |

New code should enter through `solve()` instead of importing an individual
algorithm module.

## Single-destination example

```python
from routing import solve

result = solve(
    algorithm="astar",
    start_node="DL01",
    goal_node="DL09",
    scenario_id="S0",
    optimization="balanced",
)
```

## Multi-location example

```python
from routing import solve

result = solve(
    algorithm="nearest_neighbor",
    start_node="DL01",
    visit_nodes=["DL03", "DL08", "DL09"],
    scenario_id="S1",
    optimization="time",
)
```

Supported request IDs are `bfs`, `dfs`, `ucs`, `dijkstra`, `astar`, `greedy`,
`hill_climbing`, `nearest_neighbor`, and `brute_force_tsp`. Exact TSP accepts at
most eight unique targets.

## Result contract

Every algorithm returns the same core fields:

- `status`: `success`, `no_path`, `invalid_input`, or `error`;
- `path_nodes` and `path_edges`: ordered final route identifiers;
- `visited_order` and `frontier_steps`: search replay data;
- `metrics` and `segments`: totals and per-edge details;
- `explanation` and `optimality_note`: user-facing reasoning.

For weighted search, UCS stops once its requested goal is settled. Dijkstra
continues settling all reachable nodes and returns
`search_scope: "all_reachable_nodes"`; the selected route remains the optimal
branch from the start to the requested goal.

The frontend must use `path_edges` to select road geometry; it must not infer
route edges from coordinates.

## Validate

From the repository root:

```powershell
python -c "from routing import solve; print(solve(algorithm='astar', start_node='DL01', goal_node='DL09')['status'])"
python -m backend.server
```

See the root `README.md` for the HTTP request contract and complete run guide.
