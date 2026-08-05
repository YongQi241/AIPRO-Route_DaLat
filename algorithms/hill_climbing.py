from __future__ import annotations

from time import perf_counter
from typing import Callable

import networkx as nx

from .astar import straight_line_distance_heuristic
from .common import SearchTrace, finish_result, validate_request


Heuristic = Callable[[nx.DiGraph, str, str], float]


def hill_climbing_search(
    graph: nx.DiGraph,
    start_node: str,
    goal_node: str,
    *,
    heuristic: Heuristic | None = None,
    scenario_id: str | None = None,
    optimization: str | None = None,
) -> dict:
    """Run heuristic hill climbing with local-minimum escape/backtracking."""

    started_at = perf_counter()
    early_result = validate_request(
        graph,
        algorithm="Hill Climbing",
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
        started_at=started_at,
    )
    if early_result is not None:
        return early_result

    estimate = heuristic or straight_line_distance_heuristic
    active_path = [start_node]
    visited_order = [start_node]
    visited = {start_node}
    frontier_steps: list[dict] = []
    escape_moves = 0
    backtracks = 0

    while active_path:
        current = active_path[-1]
        if current == goal_node:
            break

        candidates = []
        for neighbor in graph.successors(current):
            if neighbor in visited:
                continue
            score = float(estimate(graph, neighbor, goal_node))
            if score < 0:
                raise ValueError("Hill Climbing heuristic must be nonnegative.")
            candidates.append((score, str(neighbor)))

        candidates.sort(key=lambda item: (item[0], item[1]))
        frontier_steps.append(
            {
                "current": current,
                "frontier": [
                    {"node": node, "priority": round(score, 6), "h_cost": round(score, 6)}
                    for score, node in candidates
                ],
                "visited": visited_order.copy(),
            }
        )

        if candidates:
            current_score = float(estimate(graph, current, goal_node))
            best_score, next_node = candidates[0]
            if best_score >= current_score:
                escape_moves += 1
            active_path.append(next_node)
            visited.add(next_node)
            visited_order.append(next_node)
            continue

        active_path.pop()
        backtracks += 1

    path_nodes = active_path if active_path[-1:] == [goal_node] else []

    result = finish_result(
        graph,
        trace=SearchTrace(path_nodes, visited_order, frontier_steps),
        algorithm="Hill Climbing",
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
        started_at=started_at,
        explanation=(
            "Hill Climbing preferred the unvisited successor with the "
            "smallest straight-line estimate. When trapped at a local "
            "minimum or dead end, it escaped or backtracked so valid "
            "routes were not discarded prematurely."
        ),
        optimality_note=(
            "The backtracking variant is complete on a finite reachable "
            "graph, but it does not guarantee the shortest or cheapest route."
        ),
        weight_used="heuristic_only",
    )
    result["metrics"]["local_minimum_escapes"] = escape_moves
    result["metrics"]["backtracks"] = backtracks
    result["variant"] = "heuristic hill climbing with backtracking"
    return result
