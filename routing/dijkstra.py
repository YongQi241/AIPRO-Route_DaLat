from __future__ import annotations

from heapq import heappop, heappush
from itertools import count
from time import perf_counter

import networkx as nx

from .common import (
    SearchTrace,
    finish_result,
    reconstruct_path,
    require_nonnegative_weight,
    validate_request,
)


SUPPORTED_WEIGHTS = {
    "distance_km",
    "adjusted_time_min",
    "route_cost",
    "risk",
}


def dijkstra_search(
    graph: nx.DiGraph,
    start_node: str,
    goal_node: str,
    *,
    weight: str = "distance_km",
    scenario_id: str | None = None,
    optimization: str | None = None,
) -> dict:
    """
    Explicit Dijkstra search with visualization history.

    Supported weights:
        distance_km, adjusted_time_min, route_cost, risk
    """

    started_at = perf_counter()
    early_result = validate_request(
        graph,
        algorithm="Dijkstra",
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
        started_at=started_at,
    )
    if early_result is not None:
        return early_result

    if weight not in SUPPORTED_WEIGHTS:
        raise ValueError(
            f"Unsupported Dijkstra weight: {weight}. "
            f"Choose one of {sorted(SUPPORTED_WEIGHTS)}"
        )

    require_nonnegative_weight(graph, weight)

    tie_breaker = count()
    frontier: list[tuple[float, int, str]] = [
        (0.0, next(tie_breaker), start_node)
    ]
    distance = {start_node: 0.0}
    parent: dict[str, str | None] = {start_node: None}
    settled: set[str] = set()
    visited_order: list[str] = []
    frontier_steps: list[dict] = []
    path_nodes: list[str] = []

    while frontier:
        current_distance, _, current = heappop(frontier)

        if current in settled:
            continue
        if current_distance > distance.get(current, float("inf")):
            continue

        settled.add(current)
        visited_order.append(current)

        if current == goal_node:
            path_nodes = reconstruct_path(parent, goal_node)
            frontier_steps.append(
                {
                    "current": current,
                    "frontier": _frontier_snapshot(
                        frontier,
                        settled,
                        distance,
                    ),
                    "visited": visited_order.copy(),
                }
            )
            break

        for neighbor in graph.successors(current):
            edge_weight = float(graph[current][neighbor][weight])
            candidate = current_distance + edge_weight

            if candidate < distance.get(neighbor, float("inf")):
                distance[neighbor] = candidate
                parent[neighbor] = current
                heappush(
                    frontier,
                    (candidate, next(tie_breaker), neighbor),
                )

        frontier_steps.append(
            {
                "current": current,
                "frontier": _frontier_snapshot(
                    frontier,
                    settled,
                    distance,
                ),
                "visited": visited_order.copy(),
            }
        )

    return finish_result(
        graph,
        trace=SearchTrace(
            path_nodes=path_nodes,
            visited_order=visited_order,
            frontier_steps=frontier_steps,
        ),
        algorithm="Dijkstra",
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
        started_at=started_at,
        explanation=(
            f"Dijkstra expanded nodes in increasing cumulative "
            f"{weight} and selected the minimum-{weight} route."
        ),
        optimality_note=(
            f"Optimal for {weight} because every selected edge "
            "weight is nonnegative."
        ),
        weight_used=weight,
    )


def _frontier_snapshot(
    frontier: list[tuple[float, int, str]],
    settled: set[str],
    distance: dict[str, float],
) -> list[dict]:
    """Return one best active entry per frontier node."""

    active: dict[str, float] = {}

    for priority, _, node in frontier:
        if node in settled:
            continue
        if priority != distance.get(node):
            continue
        active[node] = priority

    return [
        {
            "node": node,
            "priority": round(priority, 6),
            "distance": round(priority, 6),
        }
        for node, priority in sorted(
            active.items(),
            key=lambda item: (item[1], item[0]),
        )
    ]
