import sys

from graph_loader import load_scenario, add_costs, build_graph
from greedy_best_first import GreedyBestFirstSearch
from hill_climbing import HillClimbingSearch
from nearest_neighbor import NearestNeighborTSP
from brute_force_tsp import BruteForceTSP


if __name__ == "__main__":
    print("Loading data...")
    nodes, edges = load_scenario("S0")
    if nodes is None:
        sys.exit(1)
        
    edges = add_costs(edges, "balanced")
    graph = build_graph(nodes, edges)
    print(f"Graph built with {graph.number_of_nodes()} nodes and {graph.number_of_edges()} edges.")
    
    start_node = "DL01"
    goal_node = "DL15"
    
    print("\n--- Testing Greedy Best-First Search ---")
    greedy_solver = GreedyBestFirstSearch(graph, "S0", "balanced")
    res_greedy = greedy_solver.solve(start_node, goal_node)
    print(f"Status: {res_greedy['status']}")
    print(f"Path: {res_greedy['path_nodes']}")
    print(f"Cost: {res_greedy['metrics'].get('total_cost')}")
    
    print("\n--- Testing Hill Climbing ---")
    hill_solver = HillClimbingSearch(graph, "S0", "balanced")
    res_hill = hill_solver.solve(start_node, goal_node)
    print(f"Status: {res_hill['status']}")
    print(f"Path: {res_hill['path_nodes']}")
    if res_hill['status'] == 'no_path':
        print(f"Message: {res_hill['message']}")
    else:
        print(f"Cost: {res_hill['metrics'].get('total_cost')}")
    
    visit_nodes = ["DL03", "DL15", "DL07"]
    print(f"\n--- Testing Nearest Neighbor (Multi-location) ---")
    nn_solver = NearestNeighborTSP(graph, "S0", "balanced")
    res_nn = nn_solver.solve(start_node, visit_nodes)
    print(f"Status: {res_nn['status']}")
    print(f"Visited Order: {res_nn['visited_order']}")
    print(f"Cost: {res_nn['metrics'].get('total_cost')}")
    
    print(f"\n--- Testing Brute Force TSP (Multi-location) ---")
    bf_solver = BruteForceTSP(graph, "S0", "balanced")
    res_bf = bf_solver.solve(start_node, visit_nodes)
    print(f"Status: {res_bf['status']}")
    print(f"Visited Order: {res_bf['visited_order']}")
    print(f"Cost: {res_bf['metrics'].get('total_cost')}")
