from typing import Dict, List, Optional

class Node:
    def __init__(self, node_id: str, name: str, latitude: float, longitude: float):
        self.node_id = node_id
        self.name = name
        self.latitude = latitude
        self.longitude = longitude

    def __repr__(self):
        return f"Node({self.node_id}, '{self.name}')"


class Edge:
    def __init__(self, from_node: str, to_node: str, distance_km: float, time_min: float, congestion: float):
        self.from_node = from_node
        self.to_node = to_node
        self.distance_km = distance_km
        self.time_min = time_min
        self.congestion = congestion

    def __repr__(self):
        return f"Edge({self.from_node} -> {self.to_node}, d={self.distance_km}, t={self.time_min}, c={self.congestion})"


class Graph:
    def __init__(self):
        self.nodes: Dict[str, Node] = {}
        self.edges: Dict[str, List[Edge]] = {}

    def add_node(self, node: Node):
        self.nodes[node.node_id] = node
        if node.node_id not in self.edges:
            self.edges[node.node_id] = []

    def add_edge(self, edge: Edge):
        if edge.from_node in self.edges:
            self.edges[edge.from_node].append(edge)

    def get_node(self, node_id: str) -> Optional[Node]:
        return self.nodes.get(node_id)

    def get_neighbors(self, node_id: str) -> List[Edge]:
        return self.edges.get(node_id, [])

    def print_stats(self):
        num_edges = sum(len(neighbors) for neighbors in self.edges.values())
        print(f"Graph loaded: {len(self.nodes)} nodes, {num_edges} edges.")
