"""Minimal compatibility base for legacy class-based callers."""

from abc import ABC, abstractmethod

import networkx as nx


class BaseSearchAlgorithm(ABC):
    def __init__(
        self,
        graph: nx.DiGraph,
        scenario_id: str,
        optimization: str,
    ):
        self.graph = graph
        self.scenario_id = scenario_id
        self.optimization = optimization

    @abstractmethod
    def solve(self, start_node: str, **kwargs) -> dict:
        """Delegate a request to a canonical function in algorithms/."""
