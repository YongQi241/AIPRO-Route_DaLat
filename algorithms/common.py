from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter
from typing import Any

import networkx as nx


@dataclass
class SearchTrace:
    """Internal search output shared by all algorithms."""

    path_nodes: list[str]
    visited_order: list[str]
    frontier_steps: list[dict[str, Any]]


def reconstruct_path(
    parent: dict[str, str | None],
    goal_node: str,
) -> list[str]:
    """Reconstruct an ordered start-to-goal node path."""

    if goal_node not in parent:
        return []

    path: list[str] = []
    current: str | None = goal_node

    while current is not None:
        path.append(current)
        current = parent[current]

    path.reverse()
    return path


def path_edges(
    graph: nx.DiGraph,
    path_nodes: list[str],
) -> list[str]:
    """Convert an ordered node path into ordered edge IDs."""

    return [
        str(graph[source][target]["edge_id"])
        for source, target in zip(path_nodes, path_nodes[1:])
    ]


def summarize_path(
    graph: nx.DiGraph,
    path_nodes: list[str],
) -> tuple[list[dict[str, Any]], dict[str, float | int]]:
    """Build segment details and aggregate route metrics."""

    segments: list[dict[str, Any]] = []
    total_distance = 0.0
    total_time = 0.0
    total_cost = 0.0
    total_risk = 0.0

    for source, target in zip(path_nodes, path_nodes[1:]):
        edge = graph[source][target]

        congestion = edge.get(
            "congestion_level",
            edge.get("congestion", 0.0),
        )

        segment = {
            "edge_id": str(edge["edge_id"]),
            "from_node": source,
            "to_node": target,
            "distance_km": float(edge.get("distance_km", 0.0)),
            "adjusted_time_min": float(
                edge.get(
                    "adjusted_time_min",
                    edge.get("base_time_min", 0.0),
                )
            ),
            "congestion_level": float(congestion),
            "risk": float(edge.get("risk", 0.0)),
            "route_cost": float(edge.get("route_cost", 0.0)),
            "road_type": edge.get("road_type", "unknown"),
        }
        segments.append(segment)

        total_distance += segment["distance_km"]
        total_time += segment["adjusted_time_min"]
        total_cost += segment["route_cost"]
        total_risk += segment["risk"]

    metrics: dict[str, float | int] = {
        "total_distance_km": round(total_distance, 3),
        "total_time_min": round(total_time, 3),
        "total_cost": round(total_cost, 6),
        "total_risk": round(total_risk, 3),
        "path_edge_count": len(segments),
    }

    return segments, metrics


def make_base_result(
    *,
    algorithm: str,
    start_node: str,
    goal_node: str,
    scenario_id: str | None,
    optimization: str | None,
) -> dict[str, Any]:
    """Create the standard GUI-facing result structure."""

    return {
        "status": "error",
        "algorithm": algorithm,
        "scenario_id": scenario_id,
        "optimization": optimization,
        "start_node": start_node,
        "goal_node": goal_node,
        "path_nodes": [],
        "path_edges": [],
        "visited_order": [],
        "frontier_steps": [],
        "metrics": {},
        "segments": [],
        "explanation": "",
        "optimality_note": "",
        "message": None,
    }


def validate_request(
    graph: nx.DiGraph,
    *,
    algorithm: str,
    start_node: str,
    goal_node: str,
    scenario_id: str | None,
    optimization: str | None,
    started_at: float,
) -> dict[str, Any] | None:
    """Return a finished result for invalid/trivial requests, else None."""

    result = make_base_result(
        algorithm=algorithm,
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
    )

    missing = [
        node_id
        for node_id in (start_node, goal_node)
        if node_id not in graph
    ]

    if missing:
        result.update(
            status="invalid_input",
            explanation=(
                "The request contains node IDs that do not exist "
                "in the directed search graph."
            ),
            message=f"Unknown node ID(s): {', '.join(missing)}",
        )
        return result

    if start_node == goal_node:
        elapsed_ms = (perf_counter() - started_at) * 1000.0
        result.update(
            status="success",
            path_nodes=[start_node],
            visited_order=[start_node],
            frontier_steps=[
                {
                    "current": start_node,
                    "frontier": [],
                    "visited": [start_node],
                }
            ],
            metrics={
                "total_distance_km": 0.0,
                "total_time_min": 0.0,
                "total_cost": 0.0,
                "total_risk": 0.0,
                "path_edge_count": 0,
                "explored_nodes": 1,
                "processing_time_ms": round(elapsed_ms, 3),
            },
            explanation=(
                "The start and destination are the same location, "
                "so no road edges are required."
            ),
            optimality_note="The zero-edge route is optimal.",
            message=None,
        )
        return result

    return None


def finish_result(
    graph: nx.DiGraph,
    *,
    trace: SearchTrace,
    algorithm: str,
    start_node: str,
    goal_node: str,
    scenario_id: str | None,
    optimization: str | None,
    started_at: float,
    explanation: str,
    optimality_note: str,
    weight_used: str | None = None,
) -> dict[str, Any]:
    """Convert a SearchTrace into the standard result contract."""

    elapsed_ms = (perf_counter() - started_at) * 1000.0
    result = make_base_result(
        algorithm=algorithm,
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
    )

    if not trace.path_nodes:
        result.update(
            status="no_path",
            visited_order=trace.visited_order,
            frontier_steps=trace.frontier_steps,
            metrics={
                "explored_nodes": len(trace.visited_order),
                "processing_time_ms": round(elapsed_ms, 3),
            },
            explanation=(
                "The algorithm explored all reachable states but "
                "could not reach the destination. Directed roads or "
                "scenario closures may have disconnected the route."
            ),
            optimality_note=optimality_note,
            message=f"No path from {start_node} to {goal_node}.",
        )
        if weight_used is not None:
            result["weight_used"] = weight_used
        return result

    segments, metrics = summarize_path(graph, trace.path_nodes)
    metrics.update(
        {
            "explored_nodes": len(trace.visited_order),
            "processing_time_ms": round(elapsed_ms, 3),
        }
    )

    result.update(
        status="success",
        path_nodes=trace.path_nodes,
        path_edges=path_edges(graph, trace.path_nodes),
        visited_order=trace.visited_order,
        frontier_steps=trace.frontier_steps,
        metrics=metrics,
        segments=segments,
        explanation=explanation,
        optimality_note=optimality_note,
        message=None,
    )

    if weight_used is not None:
        result["weight_used"] = weight_used

    return result


def require_nonnegative_weight(
    graph: nx.DiGraph,
    weight: str,
) -> None:
    """Validate that every directed edge contains a nonnegative weight."""

    for source, target, data in graph.edges(data=True):
        if weight not in data:
            raise ValueError(
                f"Edge {source!r} -> {target!r} is missing weight "
                f"{weight!r}."
            )

        value = float(data[weight])
        if value < 0:
            raise ValueError(
                f"Edge {source!r} -> {target!r} has negative "
                f"{weight!r}: {value}."
            )
