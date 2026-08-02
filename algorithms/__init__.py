"""Da Lat tourism route search algorithms."""

from .astar import astar_search
from .bfs import bfs_search
from .common import (
    SearchTrace,
    finish_result,
    make_base_result,
    path_edges,
    reconstruct_path,
    require_nonnegative_weight,
    summarize_path,
    validate_request,
)
from .dfs import dfs_search
from .dijkstra import dijkstra_search
from .graph_loader import build_graph, load_graph, load_scenario
from .greedy_best_first import greedy_best_first_search
from .multi_location import multi_location_route, nearest_neighbor_route
from .solver import solve, solve_multi_location, solve_route
from .ucs import ucs_search

__all__ = [
    "SearchTrace",
    "astar_search",
    "bfs_search",
    "build_graph",
    "dfs_search",
    "dijkstra_search",
    "finish_result",
    "greedy_best_first_search",
    "load_graph",
    "load_scenario",
    "make_base_result",
    "multi_location_route",
    "nearest_neighbor_route",
    "path_edges",
    "reconstruct_path",
    "require_nonnegative_weight",
    "solve",
    "solve_multi_location",
    "solve_route",
    "summarize_path",
    "ucs_search",
    "validate_request",
]
