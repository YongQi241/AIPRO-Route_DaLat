import time
import itertools
import networkx as nx
from typing import List
from base_algorithm import BaseSearchAlgorithm

class BruteForceTSP(BaseSearchAlgorithm):
    def solve(self, start_node: str, visit_nodes: List[str]) -> dict:
        start_time = time.perf_counter()
        
        weight_key = "route_cost" if "route_cost" in next(iter(self.graph.edges(data=True)))[2] else "distance_km"
        
        nodes_to_permute = [n for n in visit_nodes if n != start_node]
        
        best_cost = float('inf')
        best_full_path = []
        best_order = []
        explored_nodes = 0
        
        all_poi = [start_node] + nodes_to_permute
        pairwise_paths = {}
        pairwise_costs = {}
        
        for u in all_poi:
            for v in all_poi:
                if u != v:
                    try:
                        path = nx.shortest_path(self.graph, u, v, weight=weight_key)
                        cost = nx.shortest_path_length(self.graph, u, v, weight=weight_key)
                        pairwise_paths[(u, v)] = path
                        pairwise_costs[(u, v)] = cost
                        explored_nodes += len(path)
                    except nx.NetworkXNoPath:
                        pairwise_costs[(u, v)] = float('inf')
                        
        for perm in itertools.permutations(nodes_to_permute):
            current_cost = 0
            current_node = start_node
            current_full_path = [start_node]
            possible = True
            
            for next_node in perm:
                cost = pairwise_costs.get((current_node, next_node), float('inf'))
                if cost == float('inf'):
                    possible = False
                    break
                
                current_cost += cost
                path = pairwise_paths[(current_node, next_node)]
                current_full_path.extend(path[1:])
                current_node = next_node
                
            if possible and current_cost < best_cost:
                best_cost = current_cost
                best_full_path = current_full_path
                best_order = [start_node] + list(perm)
                
        if best_cost == float('inf'):
            return self._build_failure_result(
                "Brute Force TSP", start_node, None, 
                "No valid path connects all the required locations."
            )

        return self._build_success_result(
            "Brute Force TSP", start_node, best_order[-1], best_full_path, best_order, 
            [], explored_nodes, start_time,
            explanation="Brute force generated all possible permutations to find the strictly optimal visitation order."
        )
