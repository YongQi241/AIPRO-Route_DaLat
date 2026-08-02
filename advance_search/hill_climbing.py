"""Backward-compatible class adapter for canonical Hill Climbing."""

from .base_algorithm import BaseSearchAlgorithm
from algorithms.hill_climbing import hill_climbing_search


class HillClimbingSearch(BaseSearchAlgorithm):
    def solve(self, start_node: str, goal_node: str) -> dict:
        return hill_climbing_search(
            self.graph,
            start_node,
            goal_node,
            scenario_id=self.scenario_id,
            optimization=self.optimization,
        )
