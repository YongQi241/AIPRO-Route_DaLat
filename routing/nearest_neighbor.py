from __future__ import annotations

from time import perf_counter
from typing import Any

import networkx as nx

from .dijkstra import SUPPORTED_WEIGHTS, dijkstra_search


METRIC_FOR_WEIGHT = {
    "distance_km": "total_distance_km",
    "adjusted_time_min": "total_time_min",
    "route_cost": "total_cost",
    "risk": "total_risk",
}


def nearest_neighbor_route(
    graph: nx.DiGraph,
    start_node: str,
    visit_nodes: list[str],
    *,
    weight: str = "route_cost",
    return_to_start: bool = False,
    scenario_id: str | None = None,
    optimization: str | None = None,
) -> dict[str, Any]:
    """
    Build an approximate multi-location route using nearest neighbor.

    At each stage, Dijkstra is run from the current location to every
    unvisited requested location. The reachable candidate with the smallest
    selected weight becomes the next stop.

    This is a heuristic for visit ordering, not an exact travelling-salesperson
    solver, so it does not guarantee the globally best complete tour.
    """

    started_at = perf_counter()
    ordered_targets = _unique_nodes(visit_nodes)

    if weight not in SUPPORTED_WEIGHTS:
        return _invalid_result(
            start_node=start_node,
            visit_nodes=ordered_targets,
            scenario_id=scenario_id,
            optimization=optimization,
            message=(
                f"Trọng số Láng giềng gần nhất không được hỗ trợ: {weight}. "
                f"Hãy chọn một trong {sorted(SUPPORTED_WEIGHTS)}"
            ),
        )

    missing = sorted(
        {
            node
            for node in [start_node, *ordered_targets]
            if node not in graph
        }
    )
    if missing:
        return _invalid_result(
            start_node=start_node,
            visit_nodes=ordered_targets,
            scenario_id=scenario_id,
            optimization=optimization,
            message=f"Mã nút không xác định: {', '.join(missing)}",
        )

    remaining = [
        node for node in ordered_targets if node != start_node
    ]
    current = start_node
    visit_order = [start_node]
    full_path_nodes = [start_node]
    full_path_edges: list[str] = []
    all_segments: list[dict[str, Any]] = []
    all_visited: list[str] = []
    leg_results: list[dict[str, Any]] = []
    selection_steps: list[dict[str, Any]] = []

    while remaining:
        candidates: list[tuple[float, str, dict[str, Any]]] = []
        candidate_summary: list[dict[str, Any]] = []

        for candidate in remaining:
            result = dijkstra_search(
                graph,
                current,
                candidate,
                weight=weight,
                scenario_id=scenario_id,
                optimization=optimization,
                stop_at_goal=True,
            )

            if result["status"] != "success":
                candidate_summary.append(
                    {
                        "node": candidate,
                        "reachable": False,
                        "score": None,
                    }
                )
                continue

            score = float(
                result["metrics"][METRIC_FOR_WEIGHT[weight]]
            )
            candidates.append((score, candidate, result))
            candidate_summary.append(
                {
                    "node": candidate,
                    "reachable": True,
                    "score": round(score, 6),
                }
            )

        if not candidates:
            return _no_path_result(
                started_at=started_at,
                start_node=start_node,
                ordered_targets=ordered_targets,
                visit_order=visit_order,
                remaining=remaining,
                current=current,
                full_path_nodes=full_path_nodes,
                full_path_edges=full_path_edges,
                all_segments=all_segments,
                all_visited=all_visited,
                leg_results=leg_results,
                selection_steps=selection_steps,
                scenario_id=scenario_id,
                optimization=optimization,
                weight=weight,
            )

        score, next_node, best_result = min(
            candidates,
            key=lambda item: (item[0], item[1]),
        )

        selection_steps.append(
            {
                "current": current,
                "remaining_before": remaining.copy(),
                "candidates": sorted(
                    candidate_summary,
                    key=lambda item: (
                        not item["reachable"],
                        float("inf")
                        if item["score"] is None
                        else item["score"],
                        item["node"],
                    ),
                ),
                "selected": next_node,
                "selected_score": round(score, 6),
            }
        )

        _append_leg(
            best_result,
            full_path_nodes,
            full_path_edges,
            all_segments,
            all_visited,
            leg_results,
        )
        visit_order.append(next_node)
        remaining.remove(next_node)
        current = next_node

    if return_to_start and current != start_node:
        return_result = dijkstra_search(
            graph,
            current,
            start_node,
            weight=weight,
            scenario_id=scenario_id,
            optimization=optimization,
            stop_at_goal=True,
        )

        if return_result["status"] != "success":
            return _no_path_result(
                started_at=started_at,
                start_node=start_node,
                ordered_targets=ordered_targets,
                visit_order=visit_order,
                remaining=[start_node],
                current=current,
                full_path_nodes=full_path_nodes,
                full_path_edges=full_path_edges,
                all_segments=all_segments,
                all_visited=all_visited,
                leg_results=leg_results,
                selection_steps=selection_steps,
                scenario_id=scenario_id,
                optimization=optimization,
                weight=weight,
                return_failure=True,
            )

        return_score = float(
            return_result["metrics"][METRIC_FOR_WEIGHT[weight]]
        )
        selection_steps.append(
            {
                "current": current,
                "remaining_before": [start_node],
                "candidates": [
                    {
                        "node": start_node,
                        "reachable": True,
                        "score": round(return_score, 6),
                    }
                ],
                "selected": start_node,
                "selected_score": round(return_score, 6),
                "return_to_start": True,
            }
        )
        _append_leg(
            return_result,
            full_path_nodes,
            full_path_edges,
            all_segments,
            all_visited,
            leg_results,
        )
        visit_order.append(start_node)

    elapsed_ms = (perf_counter() - started_at) * 1000.0

    return {
        "status": "success",
        "algorithm": "Nearest Neighbor",
        "scenario_id": scenario_id,
        "optimization": optimization,
        "start_node": start_node,
        "visit_nodes": ordered_targets,
        "visit_order": visit_order,
        "path_nodes": full_path_nodes,
        "path_edges": full_path_edges,
        "visited_order": all_visited,
        # For multi-location animation, these are stop-selection steps.
        "frontier_steps": selection_steps,
        "selection_steps": selection_steps,
        "metrics": _route_metrics(
            all_segments,
            full_path_edges,
            visit_order,
            elapsed_ms,
        ),
        "segments": all_segments,
        "legs": leg_results,
        "explanation": (
            "Láng giềng gần nhất liên tục chọn địa điểm chưa thăm có điểm "
            f"Dijkstra {weight} khả dụng thấp nhất từ điểm dừng hiện tại."
        ),
        "optimality_note": (
            "Đây là phương pháp xấp xỉ. Nó tối ưu cục bộ từng lựa chọn tiếp "
            "theo và không bảo đảm thứ tự ghé thăm hoàn chỉnh tốt nhất toàn cục."
        ),
        "message": None,
        "weight_used": weight,
        "return_to_start": return_to_start,
    }


def _append_leg(
    leg: dict[str, Any],
    full_path_nodes: list[str],
    full_path_edges: list[str],
    all_segments: list[dict[str, Any]],
    all_visited: list[str],
    leg_results: list[dict[str, Any]],
) -> None:
    full_path_nodes.extend(leg["path_nodes"][1:])
    full_path_edges.extend(leg["path_edges"])
    all_segments.extend(leg["segments"])
    all_visited.extend(leg["visited_order"])
    leg_results.append(leg)


def _route_metrics(
    segments: list[dict[str, Any]],
    path_edges: list[str],
    visit_order: list[str],
    elapsed_ms: float,
) -> dict[str, float | int]:
    return {
        "total_distance_km": round(
            sum(float(item["distance_km"]) for item in segments),
            3,
        ),
        "total_time_min": round(
            sum(float(item["adjusted_time_min"]) for item in segments),
            3,
        ),
        "total_cost": round(
            sum(float(item["route_cost"]) for item in segments),
            6,
        ),
        "total_risk": round(
            sum(float(item["risk"]) for item in segments),
            3,
        ),
        "path_edge_count": len(path_edges),
        "visited_location_count": len(visit_order),
        "processing_time_ms": round(elapsed_ms, 3),
    }


def _unique_nodes(nodes: list[str]) -> list[str]:
    return list(dict.fromkeys(str(node) for node in nodes))


def _invalid_result(
    *,
    start_node: str,
    visit_nodes: list[str],
    scenario_id: str | None,
    optimization: str | None,
    message: str,
) -> dict[str, Any]:
    return {
        "status": "invalid_input",
        "algorithm": "Nearest Neighbor",
        "scenario_id": scenario_id,
        "optimization": optimization,
        "start_node": start_node,
        "visit_nodes": visit_nodes,
        "visit_order": [],
        "path_nodes": [],
        "path_edges": [],
        "visited_order": [],
        "frontier_steps": [],
        "selection_steps": [],
        "metrics": {},
        "segments": [],
        "legs": [],
        "explanation": "Yêu cầu đa địa điểm không hợp lệ.",
        "optimality_note": "Chưa tính được tuyến đường.",
        "message": message,
    }


def _no_path_result(
    *,
    started_at: float,
    start_node: str,
    ordered_targets: list[str],
    visit_order: list[str],
    remaining: list[str],
    current: str,
    full_path_nodes: list[str],
    full_path_edges: list[str],
    all_segments: list[dict[str, Any]],
    all_visited: list[str],
    leg_results: list[dict[str, Any]],
    selection_steps: list[dict[str, Any]],
    scenario_id: str | None,
    optimization: str | None,
    weight: str,
    return_failure: bool = False,
) -> dict[str, Any]:
    elapsed_ms = (perf_counter() - started_at) * 1000.0
    message = (
        f"Không thể quay lại từ {current} về {start_node}."
        if return_failure
        else (
            f"Không thể tiếp tục từ {current}; các đích không thể đến: "
            f"{remaining}"
        )
    )

    return {
        "status": "no_path",
        "algorithm": "Nearest Neighbor",
        "scenario_id": scenario_id,
        "optimization": optimization,
        "start_node": start_node,
        "visit_nodes": ordered_targets,
        "visit_order": visit_order,
        "unreachable_nodes": remaining,
        "path_nodes": full_path_nodes,
        "path_edges": full_path_edges,
        "visited_order": all_visited,
        "frontier_steps": selection_steps,
        "selection_steps": selection_steps,
        "metrics": _route_metrics(
            all_segments,
            full_path_edges,
            visit_order,
            elapsed_ms,
        ),
        "segments": all_segments,
        "legs": leg_results,
        "explanation": (
            "Đã trả về tuyến một phần, nhưng đồ thị có hướng không có đường "
            "tiếp tục hợp lệ tới mọi địa điểm được yêu cầu."
        ),
        "optimality_note": (
            "Láng giềng gần nhất là phương pháp xấp xỉ và không bảo đảm tối "
            "ưu toàn cục."
        ),
        "message": message,
        "weight_used": weight,
    }
