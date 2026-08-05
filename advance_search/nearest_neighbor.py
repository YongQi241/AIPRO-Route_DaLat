"""Backward-compatible class adapter for canonical Nearest Neighbor."""

from .base_algorithm import BaseSearchAlgorithm
from algorithms.nearest_neighbor import nearest_neighbor_route
from algorithms.solver import optimization_weight


class NearestNeighborTSP(BaseSearchAlgorithm):
    def solve(self, start_node: str, visit_nodes: list[str]) -> dict:
        return nearest_neighbor_route(
            self.graph,
            start_node,
            visit_nodes,
            weight=optimization_weight(self.optimization),
            scenario_id=self.scenario_id,
            optimization=self.optimization,
        )
