import time
import networkx as nx
from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod


class BaseSearchAlgorithm(ABC):
    """
    Abstract base class for all search algorithms. 
    Provides shared helper methods to build standardized output results.
    """
    def __init__(self, graph: nx.DiGraph, scenario_id: str, optimization: str):
        self.graph = graph
        self.scenario_id = scenario_id
        self.optimization = optimization

    @abstractmethod
    def solve(self, start_node: str, **kwargs) -> dict:
        """
        Execute the search algorithm and return a standardized result dictionary.
        """
        pass

    def _summarize_path(self, path_nodes: List[str]) -> dict:
        segments = []
        if not path_nodes:
            return {
                "segments": [],
                "total_distance_km": 0.0,
                "total_time_min": 0.0,
                "total_cost": 0.0,
            }

        for source, target in zip(path_nodes, path_nodes[1:]):
            if not self.graph.has_edge(source, target):
                continue
            data = self.graph[source][target]
            segments.append(
                {
                    "edge_id": data.get("edge_id", ""),
                    "from_node": source,
                    "to_node": target,
                    "distance_km": data.get("distance_km", 0.0),
                    "adjusted_time_min": data.get("adjusted_time_min", 0.0),
                    "congestion_level": data.get("congestion_level", 1.0),
                    "risk": data.get("risk", 0.0),
                    "route_cost": data.get("route_cost", 0.0),
                }
            )

        return {
            "segments": segments,
            "total_distance_km": round(sum(item["distance_km"] for item in segments), 3),
            "total_time_min": round(sum(item["adjusted_time_min"] for item in segments), 2),
            "total_cost": round(sum(item["route_cost"] for item in segments), 4),
        }

    def _get_path_edges(self, path_nodes: List[str]) -> List[str]:
        edges = []
        for source, target in zip(path_nodes, path_nodes[1:]):
            if self.graph.has_edge(source, target):
                edges.append(self.graph[source][target].get("edge_id", ""))
        return edges

    def _build_success_result(
        self, alg_name: str, start: str, goal: Optional[str], 
        path: List[str], visited_order: List[str], frontier_steps: List[dict], 
        explored: int, start_time: float, explanation: Optional[str] = None
    ) -> dict:
        path_edges = self._get_path_edges(path)
        summary = self._summarize_path(path)
        
        metrics = {
            "total_distance_km": summary["total_distance_km"],
            "total_time_min": summary["total_time_min"],
            "total_cost": summary["total_cost"],
            "explored_nodes": explored,
            "processing_time_ms": round((time.perf_counter() - start_time) * 1000, 2),
        }
        
        if not explanation:
            explanation = f"Found a valid path using {alg_name} based on the '{self.optimization}' criteria."
            
        return {
            "status": "success",
            "algorithm": alg_name,
            "scenario_id": self.scenario_id,
            "optimization": self.optimization,
            "start_node": start,
            "goal_node": goal,
            "path_nodes": path,
            "path_edges": path_edges,
            "visited_order": visited_order,
            "frontier_steps": frontier_steps,
            "metrics": metrics,
            "segments": summary["segments"],
            "explanation": explanation,
            "message": None,
        }

    def _build_failure_result(self, alg_name: str, start: str, goal: Optional[str], message: str) -> dict:
        return {
            "status": "no_path",
            "algorithm": alg_name,
            "scenario_id": self.scenario_id,
            "start_node": start,
            "goal_node": goal,
            "path_nodes": [],
            "path_edges": [],
            "visited_order": [],
            "metrics": {},
            "segments": [],
            "explanation": "Pathfinding failed.",
            "message": message,
        }
