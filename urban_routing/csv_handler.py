import csv
from pathlib import Path
from graph_model import Node, Edge, Graph

def load_graph_from_csv(nodes_path: str, edges_path: str) -> Graph:
    """
    Hàm đọc dữ liệu từ file CSV và đưa vào cấu trúc đồ thị (Graph).
    """
    graph = Graph()

    # Đọc thông tin các Node (đỉnh)
    with open(nodes_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            node_id = row['node_id']
            name_vi = row.get('name_vi', '')

            try:
                lat = float(row['latitude'])
            except (ValueError, KeyError):
                lat = 0.0

            try:
                lon = float(row['longitude'])
            except (ValueError, KeyError):
                lon = 0.0

            node = Node(node_id=node_id, name=name_vi, latitude=lat, longitude=lon)
            graph.add_node(node)

    # Đọc thông tin các Edge (cạnh)
    with open(edges_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Bỏ qua nếu đường bị đóng
            is_closed = str(row.get('closed', 'False')).strip().lower() in {"true", "1", "yes"}
            if is_closed:
                continue

            from_node = row['from_node']
            to_node = row['to_node']

            try:
                distance = float(row.get('distance_km', 0.0))
            except ValueError:
                distance = 0.0

            try:
                time = float(row.get('base_time_min', 0.0))
            except ValueError:
                time = 0.0

            try:
                congestion = float(row.get('congestion_level', 1.0))
            except ValueError:
                congestion = 1.0

            edge = Edge(
                from_node=from_node,
                to_node=to_node,
                distance_km=distance,
                time_min=time,
                congestion=congestion
            )
            graph.add_edge(edge)

    return graph
