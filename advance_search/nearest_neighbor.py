import time
import networkx as nx
from typing import List
from base_algorithm import BaseSearchAlgorithm

class NearestNeighborTSP(BaseSearchAlgorithm):
    def solve(self, start_node: str, visit_nodes: List[str]) -> dict:
        start_time = time.perf_counter()
        
        weight_key = "route_cost" if "route_cost" in next(iter(self.graph.edges(data=True)))[2] else "distance_km"
        
        unvisited = set(visit_nodes)
        if start_node in unvisited:
            unvisited.remove(start_node)
            
        current = start_node
        full_path = [current]
        visited_order = [current]
        explored_nodes = 0
        
        while unvisited:
            best_next = None
            best_cost = float('inf')
            best_subpath = []
            
            for candidate in unvisited:
                try:
                    subpath = nx.shortest_path(self.graph, current, candidate, weight=weight_key)
                    cost = nx.shortest_path_length(self.graph, current, candidate, weight=weight_key)
                    explored_nodes += len(subpath)
                    
                    if cost < best_cost:
                        best_cost = cost
                        best_next = candidate
                        best_subpath = subpath
                except nx.NetworkXNoPath:
                    continue
                    
            if best_next is None:
                return self._build_failure_result(
                    "Nearest Neighbor", start_node, None, 
                    f"Cannot reach all locations. Disconnected at node {current}."
                )
                
            full_path.extend(best_subpath[1:])
            visited_order.append(best_next)
            current = best_next
            unvisited.remove(best_next)
            
        return self._build_success_result(
            "Nearest Neighbor", start_node, current, full_path, visited_order, 
            [], explored_nodes, start_time, 
            explanation="Nearest Neighbor selected a greedy order for visiting all locations."
        )
