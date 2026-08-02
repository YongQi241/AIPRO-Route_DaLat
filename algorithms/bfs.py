# bfs.py

from collections import deque
from time import perf_counter

import networkx as nx


def reconstruct_path(
    graph: nx.DiGraph,
    parent: dict[str, str | None],
    start_node: str,
    goal_node: str,
) -> tuple[list[str], list[str]]:
    """
    Reconstruct the ordered node path and edge-ID path.

    Returns:
        path_nodes: ["DL01", "DL04", "DL15"]
        path_edges: ["E001", "E024"]
    """

    if goal_node not in parent:
        return [], []

    path_nodes = []
    current = goal_node

    while current is not None:
        path_nodes.append(current)
        current = parent[current]

    path_nodes.reverse()

    if not path_nodes or path_nodes[0] != start_node:
        return [], []

    path_edges = []

    for source, target in zip(
        path_nodes,
        path_nodes[1:],
    ):
        path_edges.append(
            graph[source][target]["edge_id"]
        )

    return path_nodes, path_edges


def summarize_path(
    graph: nx.DiGraph,
    path_nodes: list[str],
) -> tuple[list[dict], dict]:
    """
    Calculate route segments and total metrics.
    """

    segments = []

    total_distance = 0.0
    total_time = 0.0
    total_cost = 0.0
    total_risk = 0.0

    for source, target in zip(
        path_nodes,
        path_nodes[1:],
    ):
        edge = graph[source][target]

        segment = {
            "edge_id": edge["edge_id"],
            "from_node": source,
            "to_node": target,
            "distance_km": edge["distance_km"],
            "adjusted_time_min": edge["adjusted_time_min"],
            "congestion_level": edge["congestion"],
            "risk": edge["risk"],
            "route_cost": edge["route_cost"],
        }

        segments.append(segment)

        total_distance += edge["distance_km"]
        total_time += edge["adjusted_time_min"]
        total_cost += edge["route_cost"]
        total_risk += edge["risk"]

    metrics = {
        "total_distance_km": round(total_distance, 3),
        "total_time_min": round(total_time, 2),
        "total_cost": round(total_cost, 4),
        "total_risk": round(total_risk, 3),
    }

    return segments, metrics


def bfs_search(
    graph: nx.DiGraph,
    start_node: str,
    goal_node: str,
) -> dict:
    """
    Perform Breadth-First Search on a directed graph.

    BFS minimizes the number of graph edges.
    It does not minimize distance, time, congestion, or route cost.
    """

    start_time = perf_counter()

    # ---------- Input validation ----------

    if start_node not in graph:
        return {
            "status": "invalid_input",
            "algorithm": "BFS",
            "start_node": start_node,
            "goal_node": goal_node,
            "path_nodes": [],
            "path_edges": [],
            "visited_order": [],
            "frontier_steps": [],
            "metrics": {},
            "segments": [],
            "explanation": "The selected start node does not exist.",
            "message": f"Unknown start node: {start_node}",
        }

    if goal_node not in graph:
        return {
            "status": "invalid_input",
            "algorithm": "BFS",
            "start_node": start_node,
            "goal_node": goal_node,
            "path_nodes": [],
            "path_edges": [],
            "visited_order": [],
            "frontier_steps": [],
            "metrics": {},
            "segments": [],
            "explanation": "The selected goal node does not exist.",
            "message": f"Unknown goal node: {goal_node}",
        }

    if start_node == goal_node:
        processing_time_ms = (
            perf_counter() - start_time
        ) * 1000

        return {
            "status": "success",
            "algorithm": "BFS",
            "start_node": start_node,
            "goal_node": goal_node,
            "path_nodes": [start_node],
            "path_edges": [],
            "visited_order": [start_node],
            "frontier_steps": [
                {
                    "current": start_node,
                    "frontier": [],
                    "visited": [start_node],
                }
            ],
            "metrics": {
                "total_distance_km": 0.0,
                "total_time_min": 0.0,
                "total_cost": 0.0,
                "total_risk": 0.0,
                "explored_nodes": 1,
                "path_edge_count": 0,
                "processing_time_ms": round(
                    processing_time_ms,
                    3,
                ),
            },
            "segments": [],
            "explanation": (
                "The start and destination are the same node, "
                "so no road edges are required."
            ),
            "message": None,
        }

    # ---------- BFS state ----------

    frontier = deque([start_node])
    discovered = {start_node}

    parent: dict[str, str | None] = {
        start_node: None
    }

    visited_order = []
    frontier_steps = []

    found = False

    # ---------- Search ----------

    while frontier:
        current = frontier.popleft()
        visited_order.append(current)

        if current == goal_node:
            frontier_steps.append(
                {
                    "current": current,
                    "frontier": list(frontier),
                    "visited": visited_order.copy(),
                }
            )

            found = True
            break

        # DiGraph.successors() respects edge direction.
        for neighbor in graph.successors(current):
            if neighbor not in discovered:
                discovered.add(neighbor)
                parent[neighbor] = current
                frontier.append(neighbor)

        frontier_steps.append(
            {
                "current": current,
                "frontier": list(frontier),
                "visited": visited_order.copy(),
            }
        )

    processing_time_ms = (
        perf_counter() - start_time
    ) * 1000

    # ---------- No path ----------

    if not found:
        return {
            "status": "no_path",
            "algorithm": "BFS",
            "start_node": start_node,
            "goal_node": goal_node,
            "path_nodes": [],
            "path_edges": [],
            "visited_order": visited_order,
            "frontier_steps": frontier_steps,
            "metrics": {
                "explored_nodes": len(visited_order),
                "processing_time_ms": round(
                    processing_time_ms,
                    3,
                ),
            },
            "segments": [],
            "explanation": (
                "BFS explored every reachable node but could not "
                "reach the destination. Scenario road closures may "
                "have disconnected the directed graph."
            ),
            "message": (
                f"No path from {start_node} "
                f"to {goal_node}."
            ),
        }

    # ---------- Build successful result ----------

    path_nodes, path_edges = reconstruct_path(
        graph=graph,
        parent=parent,
        start_node=start_node,
        goal_node=goal_node,
    )

    segments, route_metrics = summarize_path(
        graph,
        path_nodes,
    )

    route_metrics.update(
        {
            "explored_nodes": len(visited_order),
            "path_edge_count": len(path_edges),
            "processing_time_ms": round(
                processing_time_ms,
                3,
            ),
        }
    )

    return {
        "status": "success",
        "algorithm": "BFS",
        "start_node": start_node,
        "goal_node": goal_node,
        "path_nodes": path_nodes,
        "path_edges": path_edges,
        "visited_order": visited_order,
        "frontier_steps": frontier_steps,
        "metrics": route_metrics,
        "segments": segments,
        "explanation": (
            "BFS selected a route containing the fewest simplified "
            "graph edges. This does not guarantee the shortest "
            "distance or fastest travel time."
        ),
        "message": None,
    }


if __name__ == "__main__":
    from graph_loader import load_graph

    graph = load_graph(
        scenario_id="S0",
        optimization="balanced",
        data_dir="data",
    )

    result = bfs_search(
        graph=graph,
        start_node="DL01",
        goal_node="DL15",
    )

    print("Status:", result["status"])
    print("Path nodes:", result["path_nodes"])
    print("Path edges:", result["path_edges"])
    print("Visited order:", result["visited_order"])
    print("Metrics:", result["metrics"])
    print("Explanation:", result["explanation"])