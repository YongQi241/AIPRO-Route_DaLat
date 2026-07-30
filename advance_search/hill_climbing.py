import time
from base_algorithm import BaseSearchAlgorithm
from heuristic import Heuristic

class HillClimbingSearch(BaseSearchAlgorithm):
    def solve(self, start_node: str, goal_node: str) -> dict:
        start_time = time.perf_counter()
        h = Heuristic(self.graph, goal_node, self.optimization)
        
        current = start_node
        path = [current]
        visited = {current}
        explored_nodes = 1
        frontier_steps = []
        
        while current != goal_node:
            neighbors = list(self.graph.neighbors(current))
            if not neighbors:
                return self._build_failure_result("Hill Climbing", start_node, goal_node, "Local maximum reached. No neighbors available.")
                
            best_neighbor = None
            best_h = float('inf')
            
            for neighbor in neighbors:
                if neighbor not in visited:
                    neighbor_h = h(neighbor)
                    if neighbor_h < best_h:
                        best_h = neighbor_h
                        best_neighbor = neighbor

            frontier_steps.append({
                "current": current,
                "frontier": neighbors,
                "visited": list(visited)
            })
                        
            if best_neighbor is None or best_h >= h(current):
                return self._build_failure_result(
                    "Hill Climbing", start_node, goal_node, 
                    "Local maximum reached. No neighbor has a strictly better heuristic value."
                )
                
            current = best_neighbor
            path.append(current)
            visited.add(current)
            explored_nodes += 1

        return self._build_success_result(
            "Hill Climbing", start_node, goal_node, path, list(visited), 
            frontier_steps, explored_nodes, start_time
        )
