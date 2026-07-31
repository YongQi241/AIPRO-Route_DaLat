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
    Single GUI-facing function for one start and one destination.

    algorithm:
        bfs, dfs, ucs, dijkstra, astar / a*, greedy
    """

    normalized_algorithm = algorithm.strip().lower()
    aliases = {
        "a*": "astar",
        "uniform_cost": "ucs",
        "uniform-cost": "ucs",
        "greedy_best_first": "greedy",
        "gbfs": "greedy",
    }
    normalized_algorithm = aliases.get(
        normalized_algorithm,
        normalized_algorithm,
    )

    try:
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

        if normalized_algorithm == "greedy":
            return greedy_best_first_search(
                graph,
                start_node,
                goal_node,
                **common,
            )

        raise ValueError(
            "Unknown algorithm. Choose bfs, dfs, ucs, dijkstra, "
            "astar, or greedy."
        )

    except (
        FileNotFoundError,
        ValueError,
        KeyError,
        pd.errors.ParserError,
        pd.errors.MergeError,
    ) as error:
        return {
            "status": "invalid_input",
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
            ),
            "optimality_note": "No route was computed.",
            "message": str(error),
        }
    except Exception as error:
        # Defensive service boundary so a GUI receives a readable result.
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
            "explanation": (
                "An unexpected error occurred while computing the route."
            ),
            "optimality_note": "No route was computed.",
            "message": f"{type(error).__name__}: {error}",
        }


def solve_multi_location(
    start_node: str,
    visit_nodes: list[str],
    scenario_id: str = "S0",
    optimization: str = "balanced",
    *,
    data_dir: str | Path = "data",
    weight: str | None = None,
) -> dict[str, Any]:
    """GUI-facing nearest-neighbor multi-location route."""

    try:
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
            scenario_id=scenario_id,
            optimization=optimization,
        )

    except Exception as error:
        return {
            "status": "invalid_input",
            "algorithm": "Nearest Neighbor",
            "scenario_id": scenario_id,
            "optimization": optimization,
            "start_node": start_node,
            "visit_nodes": visit_nodes,
            "path_nodes": [],
            "path_edges": [],
            "visited_order": [],
            "frontier_steps": [],
            "metrics": {},
            "segments": [],
            "explanation": (
                "The multi-location request or dataset is invalid."
            ),
            "optimality_note": "No route was computed.",
            "message": f"{type(error).__name__}: {error}",
        }