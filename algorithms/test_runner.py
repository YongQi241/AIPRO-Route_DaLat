"""Chay thu cac thuat toan tim duong co ban tren cung mot do thi."""

import sys

from algorithms import solve
from algorithms.astar import astar_search
from algorithms.bfs import bfs_search
from algorithms.dfs import dfs_search
from algorithms.dijkstra import dijkstra_search
from algorithms.graph_loader import build_graph, load_scenario
from algorithms.ucs import ucs_search


SCENARIO_ID = "S0"
OPTIMIZATION = "balanced"
START_NODE = "DL01"
GOAL_NODE = "DL15"
INTERMEDIATE_NODES = ["DL03", "DL07"]
WEIGHT = "route_cost"


def print_result(result: dict) -> None:
    """In cac thong tin chinh cua mot lan tim duong."""

    print(f"Status: {result['status']}")
    print(f"Path nodes: {result.get('path_nodes', [])}")
    print(f"Path edges: {result.get('path_edges', [])}")

    if result["status"] == "success":
        metrics = result.get("metrics", {})
        print(f"Total distance (km): {metrics.get('total_distance_km')}")
        print(f"Total time (min): {metrics.get('total_time_min')}")
        print(f"Total cost: {metrics.get('total_cost')}")
        print(f"Explored nodes: {metrics.get('explored_nodes')}")
    else:
        print(f"Message: {result.get('message')}")


def main() -> None:
    print("Loading data...")

    try:
        nodes, edges = load_scenario(SCENARIO_ID, OPTIMIZATION)
        graph = build_graph(nodes, edges)
    except (FileNotFoundError, ValueError) as error:
        print(f"Cannot load graph: {error}")
        sys.exit(1)

    print(
        f"Graph built with {graph.number_of_nodes()} nodes "
        f"and {graph.number_of_edges()} edges."
    )
    print(f"Route: {START_NODE} -> {GOAL_NODE}")
    print(f"Scenario: {SCENARIO_ID} | Optimization: {OPTIMIZATION}")

    common_arguments = {
        "scenario_id": SCENARIO_ID,
        "optimization": OPTIMIZATION,
    }

    algorithms = [
        (
            "bfs",
            "Breadth-First Search (BFS)",
            lambda start, goal: bfs_search(
                graph, start, goal, **common_arguments
            ),
        ),
        (
            "dfs",
            "Depth-First Search (DFS)",
            lambda start, goal: dfs_search(
                graph, start, goal, **common_arguments
            ),
        ),
        (
            "ucs",
            "Uniform-Cost Search (UCS)",
            lambda start, goal: ucs_search(
                graph,
                start,
                goal,
                weight=WEIGHT,
                **common_arguments,
            ),
        ),
        (
            "dijkstra",
            "Dijkstra",
            lambda start, goal: dijkstra_search(
                graph,
                start,
                goal,
                weight=WEIGHT,
                **common_arguments,
            ),
        ),
        (
            "astar",
            "A*",
            lambda start, goal: astar_search(
                graph,
                start,
                goal,
                weight=WEIGHT,
                **common_arguments,
            ),
        ),
    ]

    for _, algorithm_name, run_algorithm in algorithms:
        print(f"\n--- Testing {algorithm_name} ---")
        print_result(run_algorithm(START_NODE, GOAL_NODE))

    print(
        "\n=== Testing basic algorithms with intermediate nodes ==="
    )
    print(
        "Visit order: "
        + " -> ".join(
            [START_NODE, *INTERMEDIATE_NODES, GOAL_NODE]
        )
    )

    for algorithm_id, algorithm_name, _ in algorithms:
        print(f"\n--- Testing {algorithm_name} with intermediate nodes ---")
        result = solve(
            algorithm=algorithm_id,
            start_node=START_NODE,
            goal_node=GOAL_NODE,
            visit_nodes=INTERMEDIATE_NODES,
            scenario_id=SCENARIO_ID,
            optimization=OPTIMIZATION,
            weight=WEIGHT,
        )
        print_result(result)


if __name__ == "__main__":
    main()
