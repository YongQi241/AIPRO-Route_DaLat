"""Legacy callable wrapper around the canonical geometric heuristics."""

import networkx as nx

from algorithms.astar import (
    haversine_km,
    straight_line_distance_heuristic,
    travel_time_heuristic,
    zero_heuristic,
)


class Heuristic:
    def __init__(
        self,
        graph: nx.DiGraph,
        goal_node: str,
        optimization: str = "balanced",
        max_speed_kph: float = 60.0,
    ):
        if goal_node not in graph:
            raise ValueError(f"Unknown goal node: {goal_node}")
        self.graph = graph
        self.goal_node = goal_node
        self.optimization = optimization
        self.max_speed_kph = max_speed_kph

    haversine_km = staticmethod(haversine_km)

    def calculate(self, current_node: str) -> float:
        if current_node not in self.graph:
            return float("inf")
        if self.optimization in {"shortest", "distance"}:
            return straight_line_distance_heuristic(
                self.graph, current_node, self.goal_node
            )
        if self.optimization in {"fastest", "time"}:
            return travel_time_heuristic(
                self.graph,
                current_node,
                self.goal_node,
                maximum_speed_kph=self.max_speed_kph,
            )
        return zero_heuristic(self.graph, current_node, self.goal_node)

    def __call__(self, current_node: str) -> float:
        return self.calculate(current_node)
