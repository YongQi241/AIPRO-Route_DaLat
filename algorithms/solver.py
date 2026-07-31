from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from .astar import astar_search
from .bfs import bfs_search
from .dfs import dfs_search
from .dijkstra import dijkstra_search
from .graph_loader import load_graph
from .greedy_best_first import greedy_best_first_search
from .multi_location import nearest_neighbor_route
from .ucs import ucs_search


ALGORITHM_ALIASES = {
    "a*": "astar",
    "a_star": "astar",
    "uniform_cost": "ucs",
    "uniform-cost": "ucs",
    "uniform cost": "ucs",
    "greedy_best_first": "greedy",
    "greedy-best-first": "greedy",
    "greedy best first": "greedy",
    "gbfs": "greedy",
    "nearest_neighbor": "nearest_neighbor",
    "nearest-neighbor": "nearest_neighbor",
    "nearest neighbor": "nearest_neighbor",
    "nn": "nearest_neighbor",
}

SINGLE_ROUTE_ALGORITHMS = {
    "bfs",
    "dfs",
    "ucs",
    "dijkstra",
    "astar",
    "greedy",
}

MULTI_ROUTE_ALGORITHMS = {"nearest_neighbor"}


def normalize_algorithm(algorithm: str) -> str:
    """Normalize GUI labels and common aliases to internal names."""

    normalized = algorithm.strip().lower()
    return ALGORITHM_ALIASES.get(normalized, normalized)


def optimization_weight(optimization: str) -> str:
    """Map a GUI optimization profile to a concrete edge weight."""

    profile = optimization.strip().lower()

    if profile == "shortest":
        return "distance_km"
    if profile == "fastest":
        return "adjusted_time_min"
    if profile in {"balanced", "safest"}:
        return "route_cost"

    raise ValueError(
        "Unknown optimization. Choose shortest, fastest, balanced, "
        "or safest."
    )


def solve_route(
    start_node: str,
    goal_node: str,
    algorithm: str,
    scenario_id: str = "S0",
    optimization: str = "balanced",
    *,
    data_dir: str | Path = "data",
    weight: str | None = None,
    maximum_speed_kph: float = 60.0,
) -> dict[str, Any]:
    """
    Solve one start-to-destination route for the GUI.

    Supported algorithms:
        bfs, dfs, ucs, dijkstra, astar / a*, greedy / gbfs

    Nearest Neighbor is a multi-location method; call
    solve_multi_location(...) or solve(...) with visit_nodes instead.
    """

    normalized_algorithm = normalize_algorithm(algorithm)

    try:
        if normalized_algorithm in MULTI_ROUTE_ALGORITHMS:
            raise ValueError(
                "Nearest Neighbor requires visit_nodes. Use "
                "solve_multi_location(...) instead of solve_route(...)."
            )

        if normalized_algorithm not in SINGLE_ROUTE_ALGORITHMS:
            raise ValueError(
                "Unknown algorithm. Choose bfs, dfs, ucs, dijkstra, "
                "astar, or greedy."
            )

        graph = load_graph(
            scenario_id=scenario_id,
            optimization=optimization,
            data_dir=data_dir,
        )
        selected_weight = weight or optimization_weight(optimization)

        common = {
            "scenario_id": scenario_id,
            "optimization": optimization,
        }

        if normalized_algorithm == "bfs":
            return bfs_search(
                graph,
                start_node,
                goal_node,
                **common,
            )

        if normalized_algorithm == "dfs":
            return dfs_search(
                graph,
                start_node,
                goal_node,
                **common,
            )

        if normalized_algorithm == "ucs":
            return ucs_search(
                graph,
                start_node,
                goal_node,
                **common,
            )

        if normalized_algorithm == "dijkstra":
            return dijkstra_search(
                graph,
                start_node,
                goal_node,
                weight=selected_weight,
                **common,
            )

        if normalized_algorithm == "astar":
            return astar_search(
                graph,
                start_node,
                goal_node,
                weight=selected_weight,
                maximum_speed_kph=maximum_speed_kph,
                **common,
            )

        # The only remaining valid single-route algorithm is Greedy.
        return greedy_best_first_search(
            graph,
            start_node,
            goal_node,
            **common,
        )

    except (
        FileNotFoundError,
        ValueError,
        KeyError,
        pd.errors.ParserError,
        pd.errors.MergeError,
    ) as error:
        return _single_error_result(
            status="invalid_input",
            algorithm=algorithm,
            scenario_id=scenario_id,
            optimization=optimization,
            start_node=start_node,
            goal_node=goal_node,
            message=str(error),
        )
    except Exception as error:
        # Defensive service boundary: the GUI receives a readable result.
        return _single_error_result(
            status="error",
            algorithm=algorithm,
            scenario_id=scenario_id,
            optimization=optimization,
            start_node=start_node,
            goal_node=goal_node,
            message=f"{type(error).__name__}: {error}",
        )


def solve_multi_location(
    start_node: str,
    visit_nodes: list[str],
    scenario_id: str = "S0",
    optimization: str = "balanced",
    *,
    algorithm: str = "nearest_neighbor",
    data_dir: str | Path = "data",
    weight: str | None = None,
    return_to_start: bool = False,
) -> dict[str, Any]:
    """Solve a multi-location route with Nearest Neighbor."""

    normalized_algorithm = normalize_algorithm(algorithm)

    try:
        if normalized_algorithm not in MULTI_ROUTE_ALGORITHMS:
            raise ValueError(
                "The only supported multi-location algorithm is "
                "nearest_neighbor."
            )

        graph = load_graph(
            scenario_id=scenario_id,
            optimization=optimization,
            data_dir=data_dir,
        )
        selected_weight = weight or optimization_weight(optimization)

        return nearest_neighbor_route(
            graph,
            start_node,
            visit_nodes,
            weight=selected_weight,
            return_to_start=return_to_start,
            scenario_id=scenario_id,
            optimization=optimization,
        )

    except Exception as error:
        return _multi_error_result(
            algorithm=algorithm,
            scenario_id=scenario_id,
            optimization=optimization,
            start_node=start_node,
            visit_nodes=visit_nodes,
            message=f"{type(error).__name__}: {error}",
        )


def solve(
    *,
    algorithm: str,
    start_node: str,
    goal_node: str | None = None,
    visit_nodes: list[str] | None = None,
    scenario_id: str = "S0",
    optimization: str = "balanced",
    data_dir: str | Path = "data",
    weight: str | None = None,
    maximum_speed_kph: float = 60.0,
    return_to_start: bool = False,
) -> dict[str, Any]:
    """
    Unified dispatcher for GUI integration.

    Single-route algorithms require goal_node.
    Nearest Neighbor requires visit_nodes.
    """

    normalized_algorithm = normalize_algorithm(algorithm)

    if normalized_algorithm in MULTI_ROUTE_ALGORITHMS:
        if visit_nodes is None:
            return _multi_error_result(
                algorithm=algorithm,
                scenario_id=scenario_id,
                optimization=optimization,
                start_node=start_node,
                visit_nodes=[],
                message="Nearest Neighbor requires visit_nodes.",
            )

        return solve_multi_location(
            start_node=start_node,
            visit_nodes=visit_nodes,
            scenario_id=scenario_id,
            optimization=optimization,
            algorithm=normalized_algorithm,
            data_dir=data_dir,
            weight=weight,
            return_to_start=return_to_start,
        )

    if goal_node is None:
        return _single_error_result(
            status="invalid_input",
            algorithm=algorithm,
            scenario_id=scenario_id,
            optimization=optimization,
            start_node=start_node,
            goal_node="",
            message=f"Algorithm {algorithm!r} requires goal_node.",
        )

    return solve_route(
        start_node=start_node,
        goal_node=goal_node,
        algorithm=normalized_algorithm,
        scenario_id=scenario_id,
        optimization=optimization,
        data_dir=data_dir,
        weight=weight,
        maximum_speed_kph=maximum_speed_kph,
    )


def _single_error_result(
    *,
    status: str,
    algorithm: str,
    scenario_id: str,
    optimization: str,
    start_node: str,
    goal_node: str,
    message: str,
) -> dict[str, Any]:
    return {
        "status": status,
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
        "explanation": (
            "The route request or dataset configuration is invalid."
            if status == "invalid_input"
            else "An unexpected error occurred while computing the route."
        ),
        "optimality_note": "No route was computed.",
        "message": message,
    }


def _multi_error_result(
    *,
    algorithm: str,
    scenario_id: str,
    optimization: str,
    start_node: str,
    visit_nodes: list[str],
    message: str,
) -> dict[str, Any]:
    return {
        "status": "invalid_input",
        "algorithm": algorithm,
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
        "explanation": (
            "The multi-location request or dataset configuration is "
            "invalid."
        ),
        "optimality_note": "No route was computed.",
        "message": message,
    }
