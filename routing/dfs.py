from __future__ import annotations

from time import perf_counter

import networkx as nx

from .common import (
    SearchTrace,
    finish_result,
    reconstruct_path,
    validate_request,
)


def dfs_search(
    graph: nx.DiGraph,
    start_node: str,
    goal_node: str,
    *,
    scenario_id: str | None = None,
    optimization: str | None = None,
) -> dict:
    """
    Iterative Depth-First Search with visited/frontier tracking.

    DFS returns the first route found according to graph insertion order.
    It does not guarantee a shortest or lowest-cost route.
    """

    started_at = perf_counter()
    early_result = validate_request(
        graph,
        algorithm="DFS",
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
        started_at=started_at,
    )
    if early_result is not None:
        return early_result

    stack = [(start_node, None)]
    discovered = set()
    parent: dict[str, str | None] = {}
    visited_order: list[str] = []
    frontier_steps: list[dict] = []
    path_nodes: list[str] = []

    while stack:
        current, curr_parent = stack.pop()

        if current in discovered:
            continue

        discovered.add(current)
        parent[current] = curr_parent
        visited_order.append(current)

        if current == goal_node:
            path_nodes = reconstruct_path(parent, goal_node)
            frontier_steps.append(
                {
                    "current": current,
                    "selection_rule": "lifo_stack",
                    # Next stack item appears first for the GUI.
                    "frontier": [item[0] for item in reversed(stack)],
                    "visited": visited_order.copy(),
                }
            )
            break

        # Reverse insertion preserves the graph's first-neighbor-first order
        # when values are later removed from the end of the stack.
        neighbors = list(graph.successors(current))
        for neighbor in reversed(neighbors):
            if neighbor not in discovered:
                stack.append((neighbor, current))

        frontier_steps.append(
            {
                "current": current,
                "selection_rule": "lifo_stack",
                "frontier": [item[0] for item in reversed(stack)],
                "visited": visited_order.copy(),
            }
        )

    return finish_result(
        graph,
        trace=SearchTrace(
            path_nodes=path_nodes,
            visited_order=visited_order,
            frontier_steps=frontier_steps,
        ),
        algorithm="DFS",
        start_node=start_node,
        goal_node=goal_node,
        scenario_id=scenario_id,
        optimization=optimization,
        started_at=started_at,
        explanation=(
            "DFS đi sâu nhất có thể theo một nhánh trước khi quay lui và "
            "trả về tuyến đầu tiên tìm được."
        ),
        optimality_note=(
            "DFS không bảo đảm chất lượng tuyến. Kết quả phụ thuộc vào thứ "
            "tự chèn các nút láng giềng có hướng."
        ),
    )
