from __future__ import annotations

from itertools import permutations
from math import factorial
from time import perf_counter
from typing import Any

import networkx as nx

from .common import path_edges, summarize_path
from .dijkstra import SUPPORTED_WEIGHTS, dijkstra_search


DEFAULT_MAX_TARGETS = 8


def brute_force_tsp_route(
    graph: nx.DiGraph,
    start_node: str,
    visit_nodes: list[str],
    *,
    weight: str = "route_cost",
    return_to_start: bool = False,
    max_targets: int = DEFAULT_MAX_TARGETS,
    scenario_id: str | None = None,
    optimization: str | None = None,
) -> dict[str, Any]:
    """Enumerate visit orders and return the globally cheapest feasible one."""

    started_at = perf_counter()
    targets = list(dict.fromkeys(str(node) for node in visit_nodes if str(node) != start_node))
    error = _validate(graph, start_node, targets, weight, max_targets)
    if error:
        return _empty_result(
            "invalid_input", start_node, targets, scenario_id, optimization, error
        )

    points = [start_node, *targets]
    legs: dict[tuple[str, str], dict[str, Any]] = {}
    for source in points:
        for target in points:
            if source == target:
                continue
            result = dijkstra_search(
                graph, source, target, weight=weight,
                scenario_id=scenario_id, optimization=optimization,
            )
            if result["status"] == "success":
                legs[(source, target)] = result

    best: tuple[float, tuple[str, ...], list[dict[str, Any]]] | None = None
    evaluated = 0
    for order in permutations(targets):
        ordered_points = [start_node, *order]
        if return_to_start:
            ordered_points.append(start_node)
        selected_legs = []
        score = 0.0
        for source, target in zip(ordered_points, ordered_points[1:]):
            leg = legs.get((source, target))
            if leg is None:
                break
            selected_legs.append(leg)
            score += float(leg["metrics"][_metric_for(weight)])
        else:
            evaluated += 1
            candidate = (score, order, selected_legs)
            if best is None or candidate[:2] < best[:2]:
                best = candidate

    if best is None:
        return _empty_result(
            "no_path", start_node, targets, scenario_id, optimization,
            "No visit order connects every requested location.",
        )

    score, order, selected_legs = best
    full_path = [start_node]
    visited_order: list[str] = []
    for leg in selected_legs:
        full_path.extend(leg["path_nodes"][1:])
        visited_order.extend(leg["visited_order"])
    segments, metrics = summarize_path(graph, full_path)
    metrics.update(
        permutations_evaluated=evaluated,
        permutations_possible=factorial(len(targets)),
        processing_time_ms=round((perf_counter() - started_at) * 1000, 3),
    )
    visit_order = [start_node, *order]
    if return_to_start:
        visit_order.append(start_node)

    return {
        "status": "success",
        "algorithm": "Brute Force TSP",
        "scenario_id": scenario_id,
        "optimization": optimization,
        "start_node": start_node,
        "visit_nodes": targets,
        "visit_order": visit_order,
        "path_nodes": full_path,
        "path_edges": path_edges(graph, full_path),
        "visited_order": visited_order,
        "frontier_steps": [],
        "selection_steps": [],
        "metrics": metrics,
        "segments": segments,
        "legs": selected_legs,
        "explanation": (
            f"Brute Force TSP evaluated every feasible visit order and "
            f"selected the minimum-{weight} route."
        ),
        "optimality_note": "Globally optimal for the selected targets and weight.",
        "message": None,
        "weight_used": weight,
        "return_to_start": return_to_start,
        "objective_value": round(score, 6),
    }


def _metric_for(weight: str) -> str:
    return {
        "distance_km": "total_distance_km",
        "adjusted_time_min": "total_time_min",
        "route_cost": "total_cost",
        "risk": "total_risk",
    }[weight]


def _validate(graph, start, targets, weight, max_targets):
    if weight not in SUPPORTED_WEIGHTS:
        return f"Unsupported weight: {weight}."
    missing = sorted(node for node in [start, *targets] if node not in graph)
    if missing:
        return f"Unknown node ID(s): {', '.join(missing)}"
    if not targets:
        return "Brute Force TSP requires at least one visit node."
    if len(targets) > max_targets:
        return (
            f"Brute Force TSP accepts at most {max_targets} targets "
            f"({len(targets)} supplied) to prevent factorial runtime."
        )
    return None


def _empty_result(status, start, targets, scenario, optimization, message):
    return {
        "status": status, "algorithm": "Brute Force TSP",
        "scenario_id": scenario, "optimization": optimization,
        "start_node": start, "visit_nodes": targets, "visit_order": [],
        "path_nodes": [], "path_edges": [], "visited_order": [],
        "frontier_steps": [], "selection_steps": [], "metrics": {},
        "segments": [], "legs": [],
        "explanation": "The exact multi-location route could not be computed.",
        "optimality_note": "No route was computed.", "message": message,
    }
