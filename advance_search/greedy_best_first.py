import time
import heapq
from base_algorithm import BaseSearchAlgorithm
from heuristic import Heuristic

class GreedyBestFirstSearch(BaseSearchAlgorithm):
    def solve(self, start_node: str, goal_node: str) -> dict:
        start_time = time.perf_counter()
        h = Heuristic(self.graph, goal_node, self.optimization)
        
        pq = []
        heapq.heappush(pq, (h(start_node), start_node))
        
        came_from = {start_node: None}
        visited = set()
        frontier_steps = []
        explored_nodes = 0
        
        while pq:
            _, current = heapq.heappop(pq)
            
            if current in visited:
                continue
            
            visited.add(current)
            explored_nodes += 1
            
            if current == goal_node:
                break
                
            frontier_nodes = []
            for neighbor in self.graph.neighbors(current):
                if neighbor not in visited and neighbor not in [n for _, n in pq]:
                    came_from[neighbor] = current
                    frontier_nodes.append(neighbor)
                    heapq.heappush(pq, (h(neighbor), neighbor))
                    
            frontier_steps.append({
                "current": current,
                "frontier": frontier_nodes,
                "visited": list(visited)
            })

        if goal_node not in visited:
            return self._build_failure_result("Greedy Best-First", start_node, goal_node, "No path found from start to goal.")

        path = []
        curr = goal_node
        while curr is not None:
            path.append(curr)
            curr = came_from.get(curr)
        path.reverse()
        
        return self._build_success_result(
            "Greedy Best-First", start_node, goal_node, path, list(visited), 
            frontier_steps, explored_nodes, start_time
        )
