import heapq
import itertools
from typing import List, Tuple, Dict, Any
from graph_model import Graph, Node
from heuristics import calculate_h, calculate_g_edge

def reconstruct_path(came_from: dict, current: str) -> List[str]:
    """
    Hàm này dùng để truy xuất ngược (backtrack) từ điểm đích về điểm xuất phát
    dựa vào từ điển (dictionary) came_from chứa dấu vết đường đi.
    """
    path = [current]
    while current in came_from:
        current = came_from[current]  # Lùi lại đỉnh trước đó
        path.append(current)
    path.reverse() # Đảo ngược lại để có thứ tự từ Start -> Goal
    return path

def get_path_metrics(graph: Graph, path: List[str], profile: str = "balanced") -> Tuple[float, float, float]:
    """
    Hàm này tính toán tổng chi phí (cost), khoảng cách (distance) và thời gian (time)
    dựa trên lộ trình (path) đã tìm được.
    """
    total_cost = 0.0
    total_dist = 0.0
    total_time = 0.0
    # Duyệt qua từng cặp đỉnh liền kề trong lộ trình
    for i in range(len(path) - 1):
        u = path[i]
        v = path[i+1]
        # Tìm cạnh (edge) nối giữa đỉnh u và đỉnh v
        for edge in graph.get_neighbors(u):
            if edge.to_node == v:
                total_cost += calculate_g_edge(edge, profile)
                total_dist += edge.distance_km
                total_time += edge.time_min
                break
    return total_cost, total_dist, total_time

def a_star_search(graph: Graph, start: str, goal: str, profile: str = "balanced") -> Dict[str, Any]:
    """
    Thuật toán A* (A-Star): Tìm đường đi ngắn nhất tối ưu.
    Công thức đánh giá: f(n) = g(n) + h(n)
    - g(n): Chi phí thực tế đi từ Start đến đỉnh hiện tại.
    - h(n): Chi phí ước lượng (đường chim bay) từ đỉnh hiện tại đến Goal.
    """
    start_node = graph.get_node(start)
    goal_node = graph.get_node(goal)

    if not start_node or not goal_node:
        return {"status": "error", "message": "Không tìm thấy điểm xuất phát hoặc điểm đích"}

    # Hàng đợi ưu tiên (Priority Queue) dùng để chọn đỉnh có f(n) nhỏ nhất ra duyệt trước
    open_set = []
    # (giá trị f(n), node_id)
    heapq.heappush(open_set, (0.0, start))

    came_from = {} # Lưu lại dấu vết đường đi
    g_score = {start: 0.0} # Lưu chi phí g(n) của từng đỉnh. Khởi tạo g(start) = 0
    f_score = {start: calculate_h(start_node, goal_node)} # f(start) = h(start)

    explored = [] # Danh sách các đỉnh đã duyệt qua

    while open_set:
        # Lấy đỉnh có f(n) nhỏ nhất ra khỏi hàng đợi
        _, current = heapq.heappop(open_set)
        explored.append(current) # Đánh dấu đỉnh này đã được duyệt

        # DỪNG: Nếu đỉnh hiện tại chính là đích
        if current == goal:
            path = reconstruct_path(came_from, current)
            cost, dist, time = get_path_metrics(graph, path, profile)
            return {
                "status": "success",
                "path": path,
                "explored": explored,
                "total_cost": cost,
                "total_dist": dist,
                "total_time": time
            }

        # Nếu chưa đến đích, duyệt các đỉnh kề (hàng xóm)
        for edge in graph.get_neighbors(current):
            neighbor = edge.to_node
            neighbor_node = graph.get_node(neighbor)

            # g(n) mới = g(hiện_tại) + chi_phí_cạnh(hiện_tại -> hàng_xóm)
            tentative_g = g_score[current] + calculate_g_edge(edge, profile)

            # CẬP NHẬT: Nếu tìm được đường đi ngắn hơn đến hàng xóm này
            if neighbor not in g_score or tentative_g < g_score[neighbor]:
                came_from[neighbor] = current # Ghi nhận vết
                g_score[neighbor] = tentative_g # Cập nhật g(n)

                # Tính f(n) = g(n) mới + h(n)
                f = tentative_g + calculate_h(neighbor_node, goal_node)
                f_score[neighbor] = f

                # Đưa hàng xóm vào hàng đợi để duyệt ở các bước sau
                heapq.heappush(open_set, (f, neighbor))

    return {"status": "no_path", "explored": explored}


def greedy_bfs(graph: Graph, start: str, goal: str, profile: str = "balanced") -> Dict[str, Any]:
    """
    Greedy Best-First Search (Tìm kiếm tham lam):
    Đặc điểm: CHỈ QUAN TÂM ĐẾN h(n) - Đỉnh nào có ước lượng gần đích nhất thì đi.
    Nhanh nhưng KHÔNG đảm bảo đường đi tìm được là ngắn nhất (tối ưu).
    """
    start_node = graph.get_node(start)
    goal_node = graph.get_node(goal)

    if not start_node or not goal_node:
        return {"status": "error"}

    open_set = []
    # Khởi tạo: Ưu tiên dựa hoàn toàn vào h(n)
    heapq.heappush(open_set, (calculate_h(start_node, goal_node), start))

    came_from = {}
    explored = []
    visited_set = {start} # Tập hợp các đỉnh đã xét, tránh lặp vòng

    while open_set:
        # Luôn chọn đỉnh có h(n) nhỏ nhất
        _, current = heapq.heappop(open_set)
        explored.append(current)

        if current == goal:
            path = reconstruct_path(came_from, current)
            cost, dist, time = get_path_metrics(graph, path, profile)
            return {
                "status": "success",
                "path": path,
                "explored": explored,
                "total_cost": cost,
                "total_dist": dist,
                "total_time": time
            }

        # Xét các hàng xóm
        for edge in graph.get_neighbors(current):
            neighbor = edge.to_node
            if neighbor not in visited_set:
                visited_set.add(neighbor)
                came_from[neighbor] = current

                # Tính h(n) của hàng xóm và ném vào hàng đợi
                neighbor_node = graph.get_node(neighbor)
                h = calculate_h(neighbor_node, goal_node)
                heapq.heappush(open_set, (h, neighbor))

    return {"status": "no_path", "explored": explored}


def hill_climbing(graph: Graph, start: str, goal: str, profile: str = "balanced") -> Dict[str, Any]:
    """
    Hill Climbing (Leo đồi):
    Luôn chọn hàng xóm CÓ h(n) TỐT NHẤT (nhỏ nhất) so với các hàng xóm khác để đi tiếp.
    Lỗi hay gặp: Dễ bị kẹt ở "Local Optimum" (Điểm cực trị địa phương - ngõ cụt), vì thuật toán KHÔNG QUAY LUI.
    """
    start_node = graph.get_node(start)
    goal_node = graph.get_node(goal)

    current = start
    path = [current]
    explored = [current]

    while current != goal:
        neighbors = graph.get_neighbors(current)
        if not neighbors:
            return {"status": "local_optimum", "path": path, "explored": explored, "message": "Bị kẹt ở đỉnh cụt (Local Optimum)."}

        best_neighbor = None
        best_h = float('inf') # Khởi tạo giá trị vô cùng lớn

        # Tìm hàng xóm có h(n) nhỏ nhất (nghĩa là trông có vẻ gần đích nhất)
        for edge in neighbors:
            nxt = edge.to_node
            nxt_node = graph.get_node(nxt)

            if nxt not in path: # Phải né các đỉnh đã đi qua để không đi vòng tròn (Loop)
                h = calculate_h(nxt_node, goal_node)
                if h < best_h:
                    best_h = h
                    best_neighbor = nxt

        # Nếu xung quanh toàn bộ là đường cũ đã đi, không có lối thoát
        if best_neighbor is None:
            return {"status": "local_optimum", "path": path, "explored": explored, "message": "Bị kẹt vòng lặp, không có neighbor tốt hơn."}

        # Tiến bước tới neighbor tốt nhất
        current = best_neighbor
        path.append(current)
        explored.append(current)

    cost, dist, time = get_path_metrics(graph, path, profile)
    return {
        "status": "success",
        "path": path,
        "explored": explored,
        "total_cost": cost,
        "total_dist": dist,
        "total_time": time
    }

def get_shortest_path(graph: Graph, start: str, goal: str, profile: str = "balanced") -> Dict[str, Any]:
    """Hàm phụ trợ: dùng A* để tìm đường đi ngắn nhất giữa 2 điểm bất kỳ"""
    return a_star_search(graph, start, goal, profile)

def nearest_neighbor_tsp(graph: Graph, start: str, visit_nodes: List[str], profile: str = "balanced") -> Dict[str, Any]:
    """
    Nearest Neighbor (Hàng xóm gần nhất - Dành cho bài toán qua nhiều điểm TSP):
    Cách hoạt động:
    Từ điểm hiện tại, đi đến điểm GẦN NHẤT (chi phí thấp nhất) trong số các điểm CHƯA THĂM.
    Lặp lại cho đến khi thăm hết các điểm. (Không chắc chắn tìm được đường đi tổng thể tối ưu nhất)
    """
    unvisited = visit_nodes.copy()
    if start in unvisited:
        unvisited.remove(start)

    current = start
    full_path = []
    total_cost = 0.0
    total_dist = 0.0
    total_time = 0.0

    while unvisited:
        best_next = None
        best_cost = float('inf')
        best_segment_metrics = None

        # Tính đường đi từ điểm HIỆN TẠI tới TẤT CẢ các điểm CHƯA THĂM
        for candidate in unvisited:
            res = get_shortest_path(graph, current, candidate, profile) # Dùng A* để đo đường
            if res["status"] == "success":
                # Tìm ứng viên có chi phí (đường đi) thấp nhất
                if res["total_cost"] < best_cost:
                    best_cost = res["total_cost"]
                    best_next = candidate
                    best_segment_metrics = res

        if best_next is None:
            return {"status": "error", "message": f"Không thể đến các điểm còn lại từ {current}"}

        # Ghép đoạn đường vừa tìm được vào tổng lộ trình
        segment = best_segment_metrics["path"]
        if full_path:
            full_path.extend(segment[1:]) # Bỏ qua đỉnh đầu tiên vì bị trùng
        else:
            full_path.extend(segment)

        # Cộng dồn số liệu
        total_cost += best_segment_metrics["total_cost"]
        total_dist += best_segment_metrics["total_dist"]
        total_time += best_segment_metrics["total_time"]

        # Di chuyển tới điểm đó và loại nó khỏi danh sách chưa thăm
        current = best_next
        unvisited.remove(best_next)

    return {
        "status": "success",
        "path": full_path,
        "total_cost": total_cost,
        "total_dist": total_dist,
        "total_time": total_time
    }

def brute_force_tsp(graph: Graph, start: str, visit_nodes: List[str], profile: str = "balanced") -> Dict[str, Any]:
    """
    Brute Force TSP (Duyệt cạn cho bài toán qua nhiều điểm):
    Cách hoạt động: Lấy tất cả các hoán vị (các cách sắp xếp thứ tự) của các điểm cần thăm.
    Đo đạc chi phí từng cách một, cách nào thấp nhất thì chọn.
    Chắc chắn tìm được đường đi tối ưu nhất, nhưng NẾU SỐ LƯỢNG ĐIỂM NHIỀU SẼ CHẠY RẤT CHẬM (O(N!)).
    """
    nodes_to_permute = [n for n in visit_nodes if n != start]

    best_cost = float('inf')
    best_full_path = []
    best_dist = 0.0
    best_time = 0.0

    # Bước chuẩn bị: Tính trước đường đi giữa TẤT CẢ các cặp điểm (để tái sử dụng cho nhanh)
    all_poi = [start] + nodes_to_permute
    pairwise = {}
    for i in range(len(all_poi)):
        for j in range(len(all_poi)):
            if i != j:
                u = all_poi[i]
                v = all_poi[j]
                res = get_shortest_path(graph, u, v, profile)
                pairwise[(u, v)] = res

    # Duyệt TẤT CẢ CÁC TRƯỜNG HỢP HOÁN VỊ (Ví dụ: A-B-C, A-C-B, B-A-C...)
    for perm in itertools.permutations(nodes_to_permute):
        current_cost = 0.0
        current_dist = 0.0
        current_time = 0.0
        current_path = []

        curr_node = start
        valid = True

        # Tính chi phí cho chuỗi hoán vị này
        for nxt in perm:
            res = pairwise.get((curr_node, nxt))
            if not res or res["status"] != "success":
                valid = False # Bị đứt đường
                break

            segment = res["path"]
            if current_path:
                current_path.extend(segment[1:])
            else:
                current_path.extend(segment)

            current_cost += res["total_cost"]
            current_dist += res["total_dist"]
            current_time += res["total_time"]
            curr_node = nxt # Nhích lên điểm tiếp theo

        # Nếu chuỗi hoán vị này hợp lệ và ngắn hơn các chuỗi đã thử trước đó
        if valid and current_cost < best_cost:
            best_cost = current_cost
            best_full_path = current_path
            best_dist = current_dist
            best_time = current_time

    if best_cost == float('inf'):
         return {"status": "no_path"}

    return {
        "status": "success",
        "path": best_full_path,
        "total_cost": best_cost,
        "total_dist": best_dist,
        "total_time": best_time
    }
