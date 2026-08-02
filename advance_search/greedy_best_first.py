"""Backward-compatible class adapter for the canonical Greedy search."""

from .base_algorithm import BaseSearchAlgorithm
from algorithms.greedy_best_first import greedy_best_first_search


class GreedyBestFirstSearch(BaseSearchAlgorithm):
    def solve(self, start_node: str, goal_node: str) -> dict:
        return greedy_best_first_search(
            self.graph,
            start_node,
            goal_node,
            scenario_id=self.scenario_id,
            optimization=self.optimization,
        )
