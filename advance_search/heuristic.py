import networkx as nx
from math import asin, cos, radians, sin, sqrt

class Heuristic:
    """
    Lớp thiết kế Hàm Heuristic cho thuật toán A* theo chuẩn OOP.
    Hỗ trợ nhiều tiêu chí tối ưu hóa: 'shortest', 'fastest', 'balanced', 'safest'.
    """

    def __init__(self, graph: nx.DiGraph, goal_node: str, optimization: str = "balanced", max_speed_kph: float = 60.0):
        """
        Khởi tạo đối tượng Heuristic.
        
        Args:
            graph (nx.DiGraph): Đồ thị NetworkX chứa thông tin lat/lon của các nodes.
            goal_node (str): ID của điểm đến.
            optimization (str): Tiêu chí tối ưu ('shortest', 'fastest', 'balanced', 'safest').
            max_speed_kph (float): Tốc độ tối đa lý tưởng (mặc định 60km/h cho Đà Lạt).
        """
        self.graph = graph
        self.goal_node = goal_node
        self.optimization = optimization
        self.max_speed_kph = max_speed_kph
        
        # Lấy tọa độ của điểm đích một lần khi khởi tạo để tái sử dụng
        if goal_node not in self.graph.nodes:
            raise ValueError(f"Goal node {goal_node} not found in the graph.")
            
        goal_data = self.graph.nodes[self.goal_node]
        if "latitude" not in goal_data or "longitude" not in goal_data:
            raise KeyError(f"Node {goal_node} does not have 'latitude' or 'longitude' attributes.")
            
        self.goal_lat = goal_data["latitude"]
        self.goal_lon = goal_data["longitude"]

    @staticmethod
    def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Tính khoảng cách đường chim bay (km) giữa 2 tọa độ GPS bằng công thức Haversine.
        
        Args:
            lat1, lon1: Vĩ độ và kinh độ của điểm thứ nhất.
            lat2, lon2: Vĩ độ và kinh độ của điểm thứ hai.
            
        Returns:
            float: Khoảng cách tính bằng km.
        """
        radius_km = 6371.0
        d_lat = radians(lat2 - lat1)
        d_lon = radians(lon2 - lon1)
        
        value = (
            sin(d_lat / 2) ** 2
            + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
        )
        return 2 * radius_km * asin(sqrt(value))

    def calculate(self, current_node: str) -> float:
        """
        Tính giá trị heuristic ước lượng từ current_node tới điểm đích.
        
        Args:
            current_node (str): ID của node hiện tại cần ước lượng khoảng cách tới đích.
            
        Returns:
            float: Giá trị heuristic tùy theo tiêu chí tối ưu hóa.
        """
        if current_node not in self.graph.nodes:
            return float('inf')
            
        current_data = self.graph.nodes[current_node]
        current_lat = current_data.get("latitude")
        current_lon = current_data.get("longitude")
        
        if current_lat is None or current_lon is None:
            return float('inf')
        
        # 1. Khoảng cách đường chim bay (km)
        direct_km = self.haversine_km(current_lat, current_lon, self.goal_lat, self.goal_lon)
        
        # 2. Thời gian lý tưởng nhất (phút)
        best_time_min = (direct_km / self.max_speed_kph) * 60.0
        
        # Trả về giá trị Heuristic tùy theo tiêu chí
        if self.optimization == "shortest":
            return direct_km
            
        elif self.optimization == "fastest":
            return best_time_min
            
        elif self.optimization in ["balanced", "safest"]:
            # Dùng 10% khoảng cách chim bay làm ước lượng cơ sở để đảm bảo tính Admissible
            return direct_km * 0.1 

        return 0.0

    def __call__(self, current_node: str) -> float:
        """
        Cho phép gọi trực tiếp instance như một hàm.
        VD: 
            h = Heuristic(graph, "DL15", "fastest")
            h_value = h("DL01")
        """
        return self.calculate(current_node)
