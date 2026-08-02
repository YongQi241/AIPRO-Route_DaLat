# Advanced Search Compatibility Package

`algorithms/` is the canonical implementation package.

The old `advance_search/` package duplicated graph loading, heuristics, result
formatting, Greedy Best-First, and Nearest Neighbor. The two stacks consequently
accepted different scenarios and returned different result contracts.

This directory now contains small class-based adapters for legacy imports:

- `GreedyBestFirstSearch` delegates to the canonical Greedy implementation;
- `HillClimbingSearch` delegates to canonical Hill Climbing;
- `NearestNeighborTSP` delegates to canonical Nearest Neighbor;
- `BruteForceTSP` delegates to canonical exact TSP;
- the graph loader and heuristic modules delegate to `algorithms/`.

New code should use the primary functional API:

```python
from algorithms import solve

result = solve(
    algorithm="hill_climbing",
    start_node="DL01",
    goal_node="DL09",
    scenario_id="S0",
    optimization="balanced",
)
```

Exact multi-location example:

```python
result = solve(
    algorithm="brute_force_tsp",
    start_node="DL01",
    visit_nodes=["DL03", "DL08", "DL09"],
    scenario_id="S0",
    optimization="balanced",
)
```

Brute Force TSP is limited to eight unique targets to bound factorial runtime.

Run the compatibility smoke script from the repository root:

```powershell
python -m advance_search.test_runner
```
