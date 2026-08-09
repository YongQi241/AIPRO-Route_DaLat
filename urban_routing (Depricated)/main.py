import sys
from pathlib import Path

from .algorithms import (
    a_star_search,
    brute_force_tsp,
    greedy_bfs,
    hill_climbing,
    nearest_neighbor_tsp,
)
from .csv_handler import load_graph_from_csv


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def print_result(title: str, res: dict):
    print(f"\n{'='*50}")
    print(f" {title} ")
    print(f"{'='*50}")

    if res.get("status") == "success":
        # Print explored nodes if available
        if "explored" in res:
            # Chỉ in tối đa 20 đỉnh đầu để đỡ rối mắt, bạn có thể chỉnh lại nếu muốn
            print(f"[*] Explored Nodes ({len(res['explored'])}): {res['explored'][:20]}{'...' if len(res['explored'])>20 else ''}")

        print(f"[*] Final Route ({len(res['path'])} nodes): {' -> '.join(res['path'])}")
        print(f"[*] Total Cost (f(n)): {res['total_cost']:.4f}")
        print(f"[*] Estimated Distance: {res['total_dist']:.4f} km")
        print(f"[*] Estimated Time: {res['total_time']:.4f} mins")
    else:
        print(f"[!] Lỗi/Không tìm thấy đường. Trạng thái: {res.get('status')}")
        if "message" in res:
            print(f"Lý do: {res['message']}")
        if "explored" in res:
            print(f"[*] Explored Nodes ({len(res['explored'])}): {res['explored'][:20]}{'...' if len(res['explored'])>20 else ''}")
            if "path" in res:
                 print(f"[*] Path reached before failure: {' -> '.join(res['path'])}")

def main():
    base_dir = Path(__file__).resolve().parent.parent
    data_dir = base_dir / "data" / "generated"
    nodes_path = data_dir / "nodes_snapped.csv"
    edges_path = data_dir / "edges.csv"

    print(f"Đang tải dữ liệu từ {data_dir}...")
    try:
        graph = load_graph_from_csv(str(nodes_path), str(edges_path))
        graph.print_stats()
    except Exception as e:
        print(f"Lỗi tải dữ liệu: {e}")
        sys.exit(1)

    start_node = "DL01"
    goal_node = "DL15"

    print(f"\n{'#'*60}")
    print(f" PHẦN 1: BÀI TOÁN 2 ĐIỂM ({start_node} đến {goal_node})")
    print(f"{'#'*60}")

    profiles = ["balanced", "shortest", "fastest", "avoid_traffic"]

    print("\n[ THỬ NGHIỆM CÁC CHIẾN THUẬT (PROFILES) VỚI THUẬT TOÁN A* ]")
    for prof in profiles:
        res_astar = a_star_search(graph, start_node, goal_node, profile=prof)
        print_result(f"A* Search (Chiến thuật: {prof.upper()})", res_astar)

    print("\n[ SO SÁNH VỚI CÁC THUẬT TOÁN KHÁC (Dùng chiến thuật mặc định 'balanced') ]")
    res_greedy = greedy_bfs(graph, start_node, goal_node, profile="balanced")
    print_result("Greedy Best-First Search", res_greedy)

    res_hill = hill_climbing(graph, start_node, goal_node, profile="balanced")
    print_result("Hill Climbing", res_hill)


    visit_nodes = ["DL03", "DL07", "DL15"]
    print(f"\n{'#'*60}")
    print(f" PHẦN 2: BÀI TOÁN NHIỀU ĐIỂM (Start: {start_node}, Visit: {visit_nodes})")
    print(f"{'#'*60}")

    res_nn = nearest_neighbor_tsp(graph, start_node, visit_nodes)
    print_result("Nearest Neighbor (TSP)", res_nn)

    res_bf = brute_force_tsp(graph, start_node, visit_nodes)
    print_result("Brute Force (TSP)", res_bf)

if __name__ == "__main__":
    main()
