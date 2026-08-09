from __future__ import annotations

from collections import deque
from time import perf_counter

import networkx as nx

from .common import SearchTrace, finish_result, reconstruct_path, validate_request


def bfs_search(
    graph: nx.DiGraph,
    start_node: str,
    goal_node: str,
    *,
    scenario_id: str | None = None,
    optimization: str | None = None,
) -> dict:
    """Find a directed route with the fewest graph edges."""

    started_at = perf_counter()
    early_result = validate_request(
        graph,
        algorithm="BFS",
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
        started_at=started_at,
    )
    if early_result is not None:
        return early_result

    frontier = deque([start_node])
    discovered = {start_node}
    parent: dict[str, str | None] = {start_node: None}
    visited_order: list[str] = []
    frontier_steps: list[dict] = []
    path_nodes: list[str] = []

    while frontier:
        current = frontier.popleft()
        visited_order.append(current)

        if current == goal_node:
            path_nodes = reconstruct_path(parent, goal_node)
        else:
            for neighbor in graph.successors(current):
                if neighbor in discovered:
                    continue
                discovered.add(neighbor)
                parent[neighbor] = current
                frontier.append(neighbor)

        frontier_steps.append(
            {
                "current": current,
                "selection_rule": "fifo_queue",
                "frontier": list(frontier),
                "visited": visited_order.copy(),
            }
        )
        if path_nodes:
            break

    return finish_result(
        graph,
        trace=SearchTrace(path_nodes, visited_order, frontier_steps),
        algorithm="BFS",
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
        started_at=started_at,
        explanation=(
            "BFS explored the directed graph level by level and selected "
            "a route containing the fewest graph edges."
        ),
        optimality_note=(
            "Optimal for edge count, but not necessarily for distance, "
            "time, risk, or route cost."
        ),
        weight_used="edge_count",
    )
