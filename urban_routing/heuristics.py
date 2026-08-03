import math
from graph_model import Node, Edge

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Tính khoảng cách đường chim bay (Haversine) giữa 2 tọa độ GPS.
    Trả về đơn vị km.
    """
    R = 6371.0  # Bán kính Trái Đất (km)
    
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def calculate_h(node_current: Node, node_goal: Node) -> float:
    """
    Hàm Heuristic h(n): Ước lượng chi phí từ n đến đích.
    Dùng khoảng cách đường chim bay làm cơ sở ước lượng.
    """
    if not node_current or not node_goal:
        return 0.0
    return haversine_distance(
        node_current.latitude, node_current.longitude,
        node_goal.latitude, node_goal.longitude
    )

def get_weights_by_profile(profile: str):
    """
    Trả về bộ trọng số (w_dist, w_time, w_cong) tương ứng với từng chiến thuật (profile).
    """
    if profile == "shortest":
        # Ưu tiên tuyệt đối quãng đường ngắn (80% trọng số cho khoảng cách)
        return (0.8, 0.1, 0.1)
    elif profile == "fastest":
        # Ưu tiên tuyệt đối thời gian đi (80% trọng số cho thời gian)
        return (0.1, 0.8, 0.1)
    elif profile == "avoid_traffic":
        # Ưu tiên né kẹt xe, đường xa tí cũng được (80% trọng số cho độ kẹt xe)
        return (0.1, 0.1, 0.8)
    else:
        # "balanced" - Điểm cân bằng
        return (0.4, 0.4, 0.2)

def calculate_g_edge(edge: Edge, profile: str = "balanced") -> float:
    """
    Hàm chi phí g(n): Kết hợp quãng đường, thời gian và mức độ kẹt xe tùy theo chiến thuật.
    """
    w_dist, w_time, w_cong = get_weights_by_profile(profile)
    
    # Mức độ kẹt xe thường từ 1-5, chia 5 để lấy tỉ lệ (0.2 -> 1.0)
    cong_norm = edge.congestion / 5.0
    cost = (w_dist * edge.distance_km) + (w_time * edge.time_min) + (w_cong * cong_norm)
    return cost
