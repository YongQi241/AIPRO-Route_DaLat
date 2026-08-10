from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from .a_star import a_star_search
from .bfs import bfs_search
from .brute_force_tsp import brute_force_tsp_route
from .dfs import dfs_search
from .dijkstra import dijkstra_search
from .graph_loader import DATA_DIR, OPTIMIZATION_PROFILES, load_graph
from .greedy_best_first import greedy_best_first_search
from .hill_climbing import hill_climbing_search
from .nearest_neighbor import nearest_neighbor_route
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
    "hill-climbing": "hill_climbing",
    "hill climbing": "hill_climbing",
    "brute_force": "brute_force_tsp",
    "brute-force": "brute_force_tsp",
    "brute force": "brute_force_tsp",
    "tsp": "brute_force_tsp",
}

SINGLE_ROUTE_ALGORITHMS = {
    "bfs",
    "dfs",
    "ucs",
    "dijkstra",
    "astar",
    "greedy",
    "hill_climbing",
}

MULTI_ROUTE_ALGORITHMS = {"nearest_neighbor", "brute_force_tsp"}


def _is_true(value: Any) -> bool:
    return str(value).strip().lower() in {"true", "1", "yes"}


def _attach_scenario_edge_costs(
    result: dict[str, Any],
    graph: Any,
    data_dir: str | Path,
    scenario_id: str,
    optimization: str,
) -> dict[str, Any]:
    """Expose local scenario costs used by the graph for UI edge labels."""

    alpha, beta, gamma, delta = OPTIMIZATION_PROFILES[optimization]
    weights = {
        "distance": alpha,
        "time": beta,
        "congestion": gamma,
        "risk": delta,
    }
    graph_edges = {
        str(data["edge_id"]): data for _, _, data in graph.edges(data=True)
    }
    result["edge_costs"] = {
        edge_id: round(float(data.get("route_cost", 0.0)), 6)
        for edge_id, data in graph_edges.items()
    }

    edges = pd.read_csv(Path(data_dir) / "edges.csv")
    conditions = pd.read_csv(Path(data_dir) / "edge_conditions.csv")
    scenario_rows = conditions.loc[
        conditions["scenario_id"] == scenario_id
    ]
    condition_by_edge = {
        str(row.edge_id): row for row in scenario_rows.itertuples(index=False)
    }
    scenario_closed = {
        str(row.edge_id)
        for row in scenario_rows.itertuples(index=False)
        if _is_true(row.closed)
    }
    base_closed = {
        str(row.edge_id)
        for row in edges.itertuples(index=False)
        if _is_true(row.closed)
    }
    result["closed_edge_ids"] = sorted(base_closed | scenario_closed)
    details: dict[str, dict[str, Any]] = {}
    for row in edges.itertuples(index=False):
        edge_id = str(row.edge_id)
        condition = condition_by_edge.get(edge_id)
        data = graph_edges.get(edge_id)
        closed = edge_id in base_closed or edge_id in scenario_closed
        detail: dict[str, Any] = {
            "closed": closed,
            "distance_km": float(row.distance_km),
            "base_time_min": float(row.base_time_min),
            "base_congestion": float(row.congestion_level),
            "base_risk": float(row.risk_score),
            "scenario_name": (
                str(condition.scenario_name) if condition is not None else scenario_id
            ),
            "scenario_congestion": (
                float(condition.congestion_level)
                if condition is not None
                else float(row.congestion_level)
            ),
            "time_multiplier": (
                float(condition.time_multiplier) if condition is not None else 1.0
            ),
            "rain_risk": (
                float(condition.rain_risk) if condition is not None else 0.0
            ),
            "fog_risk": (
                float(condition.fog_risk) if condition is not None else 0.0
            ),
            "construction_penalty": (
                float(condition.construction_penalty)
                if condition is not None
                else 0.0
            ),
        }
        if data is not None:
            normalized = {
                "distance": float(data["distance_norm"]),
                "time": float(data["time_norm"]),
                "congestion": float(data["congestion_norm"]),
                "risk": float(data["risk_norm"]),
            }
            detail.update(
                {
                    "adjusted_time_min": float(data["adjusted_time_min"]),
                    "effective_congestion": float(data["congestion"]),
                    "total_risk": float(data["risk"]),
                    "normalized": normalized,
                    "contributions": {
                        key: weights[key] * normalized[key] for key in weights
                    },
                    "route_cost": float(data["route_cost"]),
                }
            )
        details[edge_id] = detail

    result["edge_cost_details"] = details
    result["edge_cost_formula"] = {
        "optimization": optimization,
        "expression": (
            "cost = α·distance_norm + β·time_norm + "
            "γ·congestion_norm + δ·risk_norm"
        ),
        "weights": weights,
    }
    result["edge_cost_kind"] = "scenario_route_cost"
    return result


def normalize_algorithm(algorithm: str) -> str:
    """Normalize GUI labels and common aliases to internal names."""

    normalized = algorithm.strip().lower()
    return ALGORITHM_ALIASES.get(normalized, normalized)


def optimization_weight(optimization: str) -> str:
    """Map a GUI optimization profile to a concrete edge weight."""

    profile = optimization.strip().lower()

    if profile in {"shortest", "distance"}:
        return "distance_km"
    if profile in {"fastest", "time"}:
        return "adjusted_time_min"
    if profile in {"balanced", "safest", "cost"}:
        return "route_cost"

    raise ValueError(
        "Tiêu chí tối ưu không xác định. Hãy chọn shortest/distance, "
        "fastest/time, balanced/cost hoặc safest."
    )


def normalize_optimization(optimization: str) -> str:
    """Accept both API/UI names and the graph loader's profile names."""

    aliases = {
        "distance": "shortest",
        "time": "fastest",
        "cost": "balanced",
    }
    normalized = optimization.strip().lower()
    return aliases.get(normalized, normalized)


def get_scenario_edge_costs(
    scenario_id: str = "S0",
    optimization: str = "balanced",
    *,
    data_dir: str | Path = DATA_DIR,
) -> dict[str, Any]:
    """Calculate edge costs without running a route-search algorithm."""

    loader_optimization = normalize_optimization(optimization)
    graph = load_graph(
        scenario_id=scenario_id,
        optimization=loader_optimization,
        data_dir=data_dir,
    )
    return _attach_scenario_edge_costs(
        {
            "status": "success",
            "scenario_id": scenario_id,
            "optimization": optimization,
        },
        graph,
        data_dir,
        scenario_id,
        loader_optimization,
    )


def solve_route(
    start_node: str,
    goal_node: str,
    algorithm: str,
    scenario_id: str = "S0",
    optimization: str = "balanced",
    *,
    data_dir: str | Path = DATA_DIR,
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
                "Thuật toán đa địa điểm cần địa điểm trung gian hoặc điểm đến."
            )

        if normalized_algorithm not in SINGLE_ROUTE_ALGORITHMS:
            raise ValueError(
                "Thuật toán không xác định. Hãy chọn BFS, DFS, UCS, Dijkstra, "
                "A*, Tham Lam ưu tiên tốt nhất hoặc Leo đồi."
            )

        loader_optimization = normalize_optimization(optimization)
        graph = load_graph(
            scenario_id=scenario_id,
            optimization=loader_optimization,
            data_dir=data_dir,
        )
        selected_weight = weight or optimization_weight(optimization)
        finish = lambda result: _attach_scenario_edge_costs(
            result, graph, data_dir, scenario_id, loader_optimization
        )

        common = {
            "scenario_id": scenario_id,
            "optimization": optimization,
        }

        if normalized_algorithm == "bfs":
            result = bfs_search(
                graph,
                start_node,
                goal_node,
                **common,
            )
            return finish(result)

        if normalized_algorithm == "dfs":
            return finish(dfs_search(
                graph,
                start_node,
                goal_node,
                **common,
            ))

        if normalized_algorithm == "ucs":
            return finish(ucs_search(
                graph,
                start_node,
                goal_node,
                **common,
            ))

        if normalized_algorithm == "dijkstra":
            return finish(dijkstra_search(
                graph,
                start_node,
                goal_node,
                weight=selected_weight,
                **common,
            ))

        if normalized_algorithm == "astar":
            return finish(a_star_search(
                graph,
                start_node,
                goal_node,
                weight=selected_weight,
                maximum_speed_kph=maximum_speed_kph,
                **common,
            ))

        if normalized_algorithm == "greedy":
            return finish(greedy_best_first_search(
                graph, start_node, goal_node, **common,
            ))

        return finish(hill_climbing_search(
            graph, start_node, goal_node, **common,
        ))

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
    data_dir: str | Path = DATA_DIR,
    weight: str | None = None,
    return_to_start: bool = False,
) -> dict[str, Any]:
    """Solve a multi-location route with Nearest Neighbor."""

    normalized_algorithm = normalize_algorithm(algorithm)

    try:
        if normalized_algorithm not in MULTI_ROUTE_ALGORITHMS:
            raise ValueError(
                "Hãy chọn Láng giềng gần nhất hoặc TSP chính xác cho tuyến "
                "đa địa điểm."
            )

        loader_optimization = normalize_optimization(optimization)
        graph = load_graph(
            scenario_id=scenario_id,
            optimization=loader_optimization,
            data_dir=data_dir,
        )
        selected_weight = weight or optimization_weight(optimization)
        finish = lambda result: _attach_scenario_edge_costs(
            result, graph, data_dir, scenario_id, loader_optimization
        )

        if normalized_algorithm == "nearest_neighbor":
            return finish(nearest_neighbor_route(
                graph,
                start_node,
                visit_nodes,
                weight=selected_weight,
                return_to_start=return_to_start,
                scenario_id=scenario_id,
                optimization=optimization,
            ))

        return finish(brute_force_tsp_route(
            graph,
            start_node,
            visit_nodes,
            weight=selected_weight,
            return_to_start=return_to_start,
            scenario_id=scenario_id,
            optimization=optimization,
        ))

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
    data_dir: str | Path = DATA_DIR,
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
                message=f"{algorithm} cần trường visit_nodes.",
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
            message=f"Thuật toán {algorithm!r} cần trường goal_node.",
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
            "Yêu cầu định tuyến hoặc cấu hình tập dữ liệu không hợp lệ."
            if status == "invalid_input"
            else "Đã xảy ra lỗi không mong đợi khi tính tuyến đường."
        ),
        "optimality_note": "Chưa tính được tuyến đường.",
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
            "Yêu cầu đa địa điểm hoặc cấu hình tập dữ liệu không hợp lệ."
        ),
        "optimality_note": "Chưa tính được tuyến đường.",
        "message": message,
    }
