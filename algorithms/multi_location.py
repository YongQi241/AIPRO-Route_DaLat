from __future__ import annotations

from typing import Any

import networkx as nx

from .nearest_neighbor import nearest_neighbor_route


SUPPORTED_MULTI_LOCATION_ALGORITHMS = {
    "nearest_neighbor",
    "nearest-neighbor",
    "nearest neighbor",
    "nn",
}


def multi_location_route(
    graph: nx.DiGraph,
    start_node: str,
    visit_nodes: list[str],
    *,
    algorithm: str = "nearest_neighbor",
    weight: str = "route_cost",
    return_to_start: bool = False,
    scenario_id: str | None = None,
    optimization: str | None = None,
) -> dict[str, Any]:
    """
    Dispatch a multi-location route request.

    Currently supported:
        Nearest Neighbor

    This function accepts a prepared NetworkX DiGraph. For CSV-based GUI
    requests, use solve_multi_location(...) or solve(...) from solver.py.
    """

    normalized = algorithm.strip().lower()

    if normalized not in SUPPORTED_MULTI_LOCATION_ALGORITHMS:
        return {
            "status": "invalid_input",
            "algorithm": algorithm,
            "scenario_id": scenario_id,
            "optimization": optimization,
            "start_node": start_node,
            "visit_nodes": list(visit_nodes),
            "visit_order": [],
            "path_nodes": [],
            "path_edges": [],
            "visited_order": [],
            "frontier_steps": [],
            "selection_steps": [],
            "metrics": {},
            "segments": [],
            "legs": [],
            "explanation": (
                "The requested multi-location algorithm is not supported."
            ),
            "optimality_note": "No route was computed.",
            "message": (
                "Choose nearest_neighbor, nearest-neighbor, "
                "nearest neighbor, or nn."
            ),
        }

    return nearest_neighbor_route(
        graph=graph,
        start_node=start_node,
        visit_nodes=visit_nodes,
        weight=weight,
        return_to_start=return_to_start,
        scenario_id=scenario_id,
        optimization=optimization,
    )


__all__ = [
    "SUPPORTED_MULTI_LOCATION_ALGORITHMS",
    "multi_location_route",
    "nearest_neighbor_route",
]
