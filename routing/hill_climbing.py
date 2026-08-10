from __future__ import annotations

from time import perf_counter
from typing import Callable

import networkx as nx

from .a_star import straight_line_distance_heuristic
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

        current_score = float(estimate(graph, current, goal_node))
        candidates = []
        for neighbor in graph.successors(current):
            if neighbor in visited:
                continue
            score = float(estimate(graph, neighbor, goal_node))
            if score < 0:
                raise ValueError("Giá trị ước lượng Leo đồi phải không âm.")
            candidates.append((score, str(neighbor)))

        candidates.sort(key=lambda item: (item[0], item[1]))
        frontier_steps.append(
            {
                "current": current,
                "current_values": {
                    "h_cost": round(current_score, 6),
                    "priority": round(current_score, 6),
                },
                "selection_rule": "lowest_neighbor_h_cost",
                "frontier": [
                    {"node": node, "priority": round(score, 6), "h_cost": round(score, 6)}
                    for score, node in candidates
                ],
                "visited": visited_order.copy(),
            }
        )

        if candidates:
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
            "Leo đồi ưu tiên nút kế tiếp chưa thăm có ước lượng đường thẳng "
            "nhỏ nhất. Khi mắc kẹt tại cực tiểu cục bộ hoặc ngõ cụt, thuật "
            "toán thoát ra hoặc quay lui để không loại bỏ tuyến hợp lệ quá sớm."
        ),
        optimality_note=(
            "Biến thể có quay lui là đầy đủ trên đồ thị hữu hạn khả dụng, "
            "nhưng không bảo đảm tuyến ngắn nhất hoặc rẻ nhất."
        ),
        weight_used="heuristic_only",
    )
    result["metrics"]["local_minimum_escapes"] = escape_moves
    result["metrics"]["backtracks"] = backtracks
    result["variant"] = "leo đồi theo hàm ước lượng có quay lui"
    return result
