from __future__ import annotations

from heapq import heappop, heappush
from itertools import count
from time import perf_counter
from typing import Callable

import networkx as nx

from .a_star import straight_line_distance_heuristic
from .common import (
    SearchTrace,
    finish_result,
    reconstruct_path,
    validate_request,
)


Heuristic = Callable[[nx.DiGraph, str, str], float]


def greedy_best_first_search(
    graph: nx.DiGraph,
    start_node: str,
    goal_node: str,
    *,
    heuristic: Heuristic | None = None,
    scenario_id: str | None = None,
    optimization: str | None = None,
) -> dict:
    """
    Greedy Best-First Search for a directed graph.

    The frontier priority is only h(n), the estimated remaining distance.
    The cumulative route cost is deliberately ignored, so this algorithm can
    be fast but does not guarantee the shortest, fastest, or cheapest route.
    """

    started_at = perf_counter()
    early_result = validate_request(
        graph,
        algorithm="Greedy Best-First",
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
        started_at=started_at,
    )
    if early_result is not None:
        return early_result

    heuristic_function = heuristic or straight_line_distance_heuristic
    heuristic_name = getattr(
        heuristic_function,
        "__name__",
        "custom_heuristic",
    )

    tie_breaker = count()
    start_h = _heuristic_value(
        heuristic_function,
        graph,
        start_node,
        goal_node,
    )

    frontier: list[tuple[float, int, str]] = [
        (start_h, next(tie_breaker), start_node)
    ]
    discovered = {start_node}
    parent: dict[str, str | None] = {start_node: None}
    visited_order: list[str] = []
    frontier_steps: list[dict] = []
    path_nodes: list[str] = []

    while frontier:
        current_h, _, current = heappop(frontier)
        visited_order.append(current)

        if current == goal_node:
            path_nodes = reconstruct_path(parent, goal_node)
            frontier_steps.append(
                {
                    "current": current,
                    "current_h": round(current_h, 6),
                    "current_values": {
                        "h_cost": round(current_h, 6),
                        "priority": round(current_h, 6),
                    },
                    "selection_rule": "lowest_h_cost",
                    "frontier": _frontier_snapshot(frontier),
                    "visited": visited_order.copy(),
                }
            )
            break

        # DiGraph.successors() preserves road direction.
        for neighbor in graph.successors(current):
            if neighbor in discovered:
                continue

            discovered.add(neighbor)
            parent[neighbor] = current
            neighbor_h = _heuristic_value(
                heuristic_function,
                graph,
                neighbor,
                goal_node,
            )
            heappush(
                frontier,
                (neighbor_h, next(tie_breaker), neighbor),
            )

        frontier_steps.append(
            {
                "current": current,
                "current_h": round(current_h, 6),
                "current_values": {
                    "h_cost": round(current_h, 6),
                    "priority": round(current_h, 6),
                },
                "selection_rule": "lowest_h_cost",
                "frontier": _frontier_snapshot(frontier),
                "visited": visited_order.copy(),
            }
        )

    result = finish_result(
        graph,
        trace=SearchTrace(
            path_nodes=path_nodes,
            visited_order=visited_order,
            frontier_steps=frontier_steps,
        ),
        algorithm="Greedy Best-First",
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
        started_at=started_at,
        explanation=(
            "Greedy Best-First Search repeatedly expanded the frontier "
            "node with the smallest estimated remaining distance to the "
            "destination."
        ),
        optimality_note=(
            "No optimality guarantee: the priority contains only h(n) "
            "and ignores the cost already travelled."
        ),
        weight_used="heuristic_only",
    )
    result["heuristic"] = heuristic_name
    return result


def _heuristic_value(
    heuristic: Heuristic,
    graph: nx.DiGraph,
    current: str,
    goal: str,
) -> float:
    value = float(heuristic(graph, current, goal))
    if value < 0:
        raise ValueError("Greedy heuristic values must be nonnegative.")
    return value


def _frontier_snapshot(
    frontier: list[tuple[float, int, str]],
) -> list[dict]:
    """Return the Greedy frontier ordered by h(n)."""

    return [
        {
            "node": node,
            "priority": round(priority, 6),
            "h_cost": round(priority, 6),
        }
        for priority, _, node in sorted(
            frontier,
            key=lambda item: (item[0], item[1]),
        )
    ]
