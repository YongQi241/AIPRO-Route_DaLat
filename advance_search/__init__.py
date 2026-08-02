"""Deprecated class-based adapters for the canonical :mod:`algorithms` API."""

from .brute_force_tsp import BruteForceTSP
from .greedy_best_first import GreedyBestFirstSearch
from .hill_climbing import HillClimbingSearch
from .nearest_neighbor import NearestNeighborTSP

__all__ = [
    "BruteForceTSP",
    "GreedyBestFirstSearch",
    "HillClimbingSearch",
    "NearestNeighborTSP",
]
