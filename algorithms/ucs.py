from __future__ import annotations

import networkx as nx

from .dijkstra import dijkstra_search


def optimization_weight(optimization: str) -> str:
    """Map optimization profiles to the edge weight used by UCS."""

    profile = optimization.strip().lower()
    if profile in {"shortest", "distance"}:
        return "distance_km"
    if profile in {"fastest", "time"}:
        return "adjusted_time_min"
    if profile in {"balanced", "cost", "safest"}:
        return "route_cost"
    raise ValueError(f"Unknown optimization profile: {optimization}")


def ucs_search(
    graph: nx.DiGraph,
    start_node: str,
    goal_node: str,
    *,
    weight: str | None = None,
    scenario_id: str | None = None,
    optimization: str = "balanced",
) -> dict:
    """Run uniform-cost search and return the shared result contract."""

    selected_weight = weight or optimization_weight(optimization)
    result = dijkstra_search(
        graph,
        start_node,
        goal_node,
        weight=selected_weight,
        scenario_id=scenario_id,
        optimization=optimization,
    )
    result["algorithm"] = "UCS"
    if result["status"] == "success":
        result["explanation"] = (
            "Uniform-Cost Search expanded nodes by increasing cumulative "
            f"{selected_weight} and returned the least-cost route."
        )
    return result
