from __future__ import annotations

from collections.abc import Callable
from typing import Any

import networkx as nx

from .common import make_base_result


LegSolver = Callable[[str, str], dict[str, Any]]


def solve_ordered_route(
    graph: nx.DiGraph,
    start_node: str,
    goal_node: str,
    intermediate_nodes: list[str],
    *,
    algorithm: str,
    solve_leg: LegSolver,
    scenario_id: str | None = None,
    optimization: str | None = None,
) -> dict[str, Any]:
    """Run one point-to-point algorithm through fixed ordered stops."""

    result = make_base_result(
        algorithm=algorithm,
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
    )
    result.update(
        visit_nodes=list(intermediate_nodes),
        visit_order=[],
        legs=[],
    )

    invalid_nodes = [
        node
        for node in intermediate_nodes
        if not isinstance(node, str) or not node.strip()
    ]
    if invalid_nodes:
        result.update(
            status="invalid_input",
            explanation=(
                "Every intermediate location must be a non-empty node ID."
            ),
            optimality_note="No route was computed.",
            message=(
                "intermediate_nodes must contain only non-empty node ID "
                "strings."
            ),
        )
        return result

    route_points = [start_node, *intermediate_nodes, goal_node]
    missing = sorted({node for node in route_points if node not in graph})
    if missing:
        result.update(
            status="invalid_input",
            explanation=(
                "The ordered route contains locations that do not exist "
                "in the directed search graph."
            ),
            optimality_note="No route was computed.",
            message=f"Unknown node ID(s): {', '.join(missing)}",
        )
        return result

    full_path_nodes = [start_node]
    full_path_edges: list[str] = []
    all_segments: list[dict[str, Any]] = []
    all_visited: list[str] = []
    all_frontier_steps: list[dict[str, Any]] = []
    leg_results: list[dict[str, Any]] = []
    completed_stops = [start_node]

    for leg_index, (leg_start, leg_goal) in enumerate(
        zip(route_points, route_points[1:])
    ):
        leg = solve_leg(leg_start, leg_goal)
        leg_results.append(leg)

        previous_visited = all_visited.copy()
        all_visited.extend(leg.get("visited_order", []))
        for frame in leg.get("frontier_steps", []):
            annotated_frame = dict(frame)
            annotated_frame.update(
                leg_index=leg_index,
                leg_start=leg_start,
                leg_goal=leg_goal,
                visited=[
                    *previous_visited,
                    *frame.get("visited", []),
                ],
            )
            all_frontier_steps.append(annotated_frame)

        if leg.get("status") != "success":
            result.update(
                status=leg.get("status", "no_path"),
                visit_order=completed_stops,
                visited_order=all_visited,
                frontier_steps=all_frontier_steps,
                metrics={
                    "explored_nodes": len(all_visited),
                    "processing_time_ms": round(
                        sum(
                            float(item.get("metrics", {}).get(
                                "processing_time_ms", 0.0
                            ))
                            for item in leg_results
                        ),
                        3,
                    ),
                },
                legs=leg_results,
                explanation=(
                    "The algorithm could not complete every leg of the "
                    "requested ordered route."
                ),
                optimality_note="No complete route was computed.",
                message=(
                    f"Could not complete leg {leg_start} -> {leg_goal}: "
                    f"{leg.get('message') or 'no path found.'}"
                ),
                failed_leg={"from_node": leg_start, "to_node": leg_goal},
            )
            return result

        full_path_nodes.extend(leg.get("path_nodes", [])[1:])
        full_path_edges.extend(leg.get("path_edges", []))
        all_segments.extend(leg.get("segments", []))
        completed_stops.append(leg_goal)

    processing_time_ms = sum(
        float(leg.get("metrics", {}).get("processing_time_ms", 0.0))
        for leg in leg_results
    )
    metrics: dict[str, float | int] = {
        "total_distance_km": round(
            sum(float(segment.get("distance_km", 0.0)) for segment in all_segments),
            3,
        ),
        "total_time_min": round(
            sum(
                float(segment.get("adjusted_time_min", 0.0))
                for segment in all_segments
            ),
            3,
        ),
        "total_cost": round(
            sum(float(segment.get("route_cost", 0.0)) for segment in all_segments),
            6,
        ),
        "total_risk": round(
            sum(float(segment.get("risk", 0.0)) for segment in all_segments),
            3,
        ),
        "path_edge_count": len(full_path_edges),
        "explored_nodes": len(all_visited),
        "processing_time_ms": round(processing_time_ms, 3),
    }

    algorithm_name = (
        leg_results[0].get("algorithm", algorithm)
        if leg_results
        else algorithm
    )
    optimality_note = (
        leg_results[0].get("optimality_note", "")
        if leg_results
        else ""
    )
    result.update(
        status="success",
        algorithm=algorithm_name,
        visit_order=route_points,
        path_nodes=full_path_nodes,
        path_edges=full_path_edges,
        visited_order=all_visited,
        frontier_steps=all_frontier_steps,
        metrics=metrics,
        segments=all_segments,
        legs=leg_results,
        explanation=(
            f"{algorithm_name} solved each leg in the requested fixed "
            "intermediate-location order: " + " -> ".join(route_points) + "."
        ),
        optimality_note=(
            optimality_note
            + " The intermediate-location order was supplied by the user "
            "and was not reordered or globally optimized."
        ).strip(),
        message=None,
    )

    if leg_results and "weight_used" in leg_results[0]:
        result["weight_used"] = leg_results[0]["weight_used"]

    return result
