from __future__ import annotations

from heapq import heappop, heappush
from itertools import count
from math import asin, cos, radians, sin, sqrt
from time import perf_counter
from typing import Callable

import networkx as nx

from .common import (
    SearchTrace,
    finish_result,
    reconstruct_path,
    require_nonnegative_weight,
    validate_request,
)
from .dijkstra import SUPPORTED_WEIGHTS


Heuristic = Callable[[nx.DiGraph, str, str], float]


def haversine_km(
    latitude_1: float,
    longitude_1: float,
    latitude_2: float,
    longitude_2: float,
) -> float:
    """Great-circle distance between two latitude/longitude points."""

    earth_radius_km = 6371.0
    delta_latitude = radians(latitude_2 - latitude_1)
    delta_longitude = radians(longitude_2 - longitude_1)

    value = (
        sin(delta_latitude / 2.0) ** 2
        + cos(radians(latitude_1))
        * cos(radians(latitude_2))
        * sin(delta_longitude / 2.0) ** 2
    )

    return 2.0 * earth_radius_km * asin(sqrt(value))


def straight_line_distance_heuristic(
    graph: nx.DiGraph,
    current: str,
    goal: str,
) -> float:
    """Optimistic straight-line distance in kilometers."""

    current_data = graph.nodes[current]
    goal_data = graph.nodes[goal]

    return haversine_km(
        float(current_data["latitude"]),
        float(current_data["longitude"]),
        float(goal_data["latitude"]),
        float(goal_data["longitude"]),
    )


def travel_time_heuristic(
    graph: nx.DiGraph,
    current: str,
    goal: str,
    *,
    maximum_speed_kph: float = 60.0,
) -> float:
    """
    Optimistic straight-line travel time.

    maximum_speed_kph must be at least as high as any modeled route speed
    for the heuristic to remain admissible.
    """

    if maximum_speed_kph <= 0:
        raise ValueError("maximum_speed_kph must be greater than zero.")

    direct_distance = straight_line_distance_heuristic(
        graph,
        current,
        goal,
    )
    return direct_distance / maximum_speed_kph * 60.0


def zero_heuristic(
    graph: nx.DiGraph,
    current: str,
    goal: str,
) -> float:
    """Always admissible; makes A* behave like Dijkstra."""

    del graph, current, goal
    return 0.0


def default_heuristic(
    weight: str,
    maximum_speed_kph: float,
) -> Heuristic:
    """
    Select a safe default heuristic for the chosen weight.

    route_cost and risk have no reliable geometric lower bound, so their
    safe default is zero.
    """

    if weight == "distance_km":
        return straight_line_distance_heuristic

    if weight == "adjusted_time_min":
        return lambda graph, current, goal: travel_time_heuristic(
            graph,
            current,
            goal,
            maximum_speed_kph=maximum_speed_kph,
        )

    return zero_heuristic


def astar_search(
    graph: nx.DiGraph,
    start_node: str,
    goal_node: str,
    *,
    weight: str = "adjusted_time_min",
    heuristic: Heuristic | None = None,
    maximum_speed_kph: float = 60.0,
    scenario_id: str | None = None,
    optimization: str | None = None,
) -> dict:
    """A* search with g, h, and f frontier values for GUI animation."""

    started_at = perf_counter()
    early_result = validate_request(
        graph,
        algorithm="A*",
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
        started_at=started_at,
    )
    if early_result is not None:
        return early_result

    if weight not in SUPPORTED_WEIGHTS:
        raise ValueError(
            f"Unsupported A* weight: {weight}. "
            f"Choose one of {sorted(SUPPORTED_WEIGHTS)}"
        )

    require_nonnegative_weight(graph, weight)
    heuristic_function = heuristic or default_heuristic(
        weight,
        maximum_speed_kph,
    )

    tie_breaker = count()
    g_score = {start_node: 0.0}
    h_start = float(
        heuristic_function(graph, start_node, goal_node)
    )
    frontier: list[tuple[float, int, str]] = [
        (h_start, next(tie_breaker), start_node)
    ]
    parent: dict[str, str | None] = {start_node: None}
    closed: set[str] = set()
    visited_order: list[str] = []
    frontier_steps: list[dict] = []
    path_nodes: list[str] = []

    while frontier:
        current_f, _, current = heappop(frontier)

        expected_f = g_score.get(current, float("inf")) + float(
            heuristic_function(graph, current, goal_node)
        )
        if current_f > expected_f:
            continue
        if current in closed:
            continue

        closed.add(current)
        visited_order.append(current)

        if current == goal_node:
            path_nodes = reconstruct_path(parent, goal_node)
            frontier_steps.append(
                {
                    "current": current,
                    "frontier": _frontier_snapshot(
                        graph,
                        frontier,
                        closed,
                        g_score,
                        goal_node,
                        heuristic_function,
                    ),
                    "visited": visited_order.copy(),
                }
            )
            break

        for neighbor in graph.successors(current):
            edge_weight = float(graph[current][neighbor][weight])
            tentative_g = g_score[current] + edge_weight

            if tentative_g < g_score.get(neighbor, float("inf")):
                parent[neighbor] = current
                g_score[neighbor] = tentative_g
                h_score = float(
                    heuristic_function(graph, neighbor, goal_node)
                )
                f_score = tentative_g + h_score
                heappush(
                    frontier,
                    (f_score, next(tie_breaker), neighbor),
                )

                # Allows reopening when a better route is found.
                closed.discard(neighbor)

        frontier_steps.append(
            {
                "current": current,
                "frontier": _frontier_snapshot(
                    graph,
                    frontier,
                    closed,
                    g_score,
                    goal_node,
                    heuristic_function,
                ),
                "visited": visited_order.copy(),
            }
        )

    heuristic_name = (
        getattr(heuristic_function, "__name__", "custom_heuristic")
    )

    return finish_result(
        graph,
        trace=SearchTrace(
            path_nodes=path_nodes,
            visited_order=visited_order,
            frontier_steps=frontier_steps,
        ),
        algorithm="A*",
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
        started_at=started_at,
        explanation=(
            f"A* combined cumulative {weight} with the "
            f"{heuristic_name} estimate to guide the search."
        ),
        optimality_note=(
            "A* is optimal when the supplied heuristic never "
            "overestimates the remaining selected weight. The default "
            "heuristics are designed to be safe under the documented "
            "speed assumption; route_cost and risk use a zero heuristic."
        ),
        weight_used=weight,
    )


def _frontier_snapshot(
    graph: nx.DiGraph,
    frontier: list[tuple[float, int, str]],
    closed: set[str],
    g_score: dict[str, float],
    goal_node: str,
    heuristic: Heuristic,
) -> list[dict]:
    """Return one current best g/h/f entry per active node."""

    active: dict[str, tuple[float, float, float]] = {}

    for _, _, node in frontier:
        if node in closed or node not in g_score:
            continue

        g_value = float(g_score[node])
        h_value = float(heuristic(graph, node, goal_node))
        f_value = g_value + h_value

        previous = active.get(node)
        if previous is None or f_value < previous[2]:
            active[node] = (g_value, h_value, f_value)

    return [
        {
            "node": node,
            "priority": round(values[2], 6),
            "g_cost": round(values[0], 6),
            "h_cost": round(values[1], 6),
            "f_cost": round(values[2], 6),
        }
        for node, values in sorted(
            active.items(),
            key=lambda item: (item[1][2], item[0]),
        )
    ]
