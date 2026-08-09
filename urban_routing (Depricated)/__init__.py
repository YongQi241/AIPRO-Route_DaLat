"""Educational routing implementation recovered from its feature branch.

The production application uses :mod:`routing`. This package remains separate
because it demonstrates graph structures and algorithms without NetworkX.
"""

from .algorithms import (
    a_star_search,
    brute_force_tsp,
    greedy_bfs,
    hill_climbing,
    nearest_neighbor_tsp,
)
from .csv_handler import load_graph_from_csv
from .graph_model import Edge, Graph, Node

__all__ = [
    "Edge",
    "Graph",
    "Node",
    "a_star_search",
    "brute_force_tsp",
    "greedy_bfs",
    "hill_climbing",
    "load_graph_from_csv",
    "nearest_neighbor_tsp",
]
