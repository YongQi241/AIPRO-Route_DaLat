"""Backward-compatible class adapter for canonical exact TSP."""

from .base_algorithm import BaseSearchAlgorithm
from algorithms.brute_force_tsp import brute_force_tsp_route
from algorithms.solver import optimization_weight


class BruteForceTSP(BaseSearchAlgorithm):
    def solve(self, start_node: str, visit_nodes: list[str]) -> dict:
        return brute_force_tsp_route(
            self.graph,
            start_node,
            visit_nodes,
            weight=optimization_weight(self.optimization),
            scenario_id=self.scenario_id,
            optimization=self.optimization,
        )
