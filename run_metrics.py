import sys
sys.path.append('urban_routing')
from pathlib import Path
from urban_routing.csv_handler import load_graph_from_csv
from urban_routing.algorithms import a_star_search, get_shortest_path

def main():
    data_dir = Path("data/generated_routes_connected")
    nodes_path = data_dir / "nodes_snapped.csv"
    edges_path = data_dir / "edges.csv"
    graph = load_graph_from_csv(str(nodes_path), str(edges_path))
    
    start_node = "DL01"
    goal_node = "DL10" # try a different one
    print("--- Traffic Impact (A* Search) ---")
    res_low = a_star_search(graph, start_node, goal_node, profile="fastest")
    print(f"Low traffic (fastest) {start_node}->{goal_node}: Cost={res_low.get('total_cost'):.2f}, Path={' -> '.join(res_low.get('path', []))}")
    
    res_high = a_star_search(graph, start_node, goal_node, profile="avoid_traffic")
    print(f"High traffic (avoid_traffic) {start_node}->{goal_node}: Cost={res_high.get('total_cost'):.2f}, Path={' -> '.join(res_high.get('path', []))}")

    # calculate initial cost for DL01 -> DL03 -> DL07 -> DL15
    seq = ["DL01", "DL03", "DL07", "DL15"]
    initial_cost = 0
    path = [seq[0]]
    for i in range(len(seq)-1):
        res = get_shortest_path(graph, seq[i], seq[i+1], profile="balanced")
        initial_cost += res["total_cost"]
        path.extend(res["path"][1:])
    print(f"Initial TSP Cost: {initial_cost:.2f}, Path={' -> '.join(path)}")

if __name__ == '__main__':
    main()
