from __future__ import annotations

import networkx as nx

from .common import build_human_explanation
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
    raise ValueError(f"Cấu hình tối ưu không xác định: {optimization}")


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
        result["explanation"] = build_human_explanation(
            graph,
            result["path_nodes"],
            algorithm_explanation=(
                "Tìm kiếm chi phí đồng nhất mở rộng các nút theo "
                f"{selected_weight} tích lũy tăng dần và trả về tuyến "
                "có chi phí thấp nhất."
            ),
            weight_used=selected_weight,
        )
    return result
