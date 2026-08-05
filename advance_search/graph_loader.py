"""Compatibility access to the canonical graph loader.

New code should import from :mod:`algorithms.graph_loader`.
"""

from algorithms.graph_loader import (
    DATA_DIR,
    build_graph,
    load_graph,
    load_scenario as _load_scenario,
    min_max,
    parse_bool,
)


def load_scenario(scenario_id: str, optimization: str = "balanced"):
    return _load_scenario(
        scenario_id=scenario_id,
        optimization=optimization,
        data_dir=DATA_DIR,
    )


def add_costs(edges, profile: str):
    """Retained for old callers; canonical loading already adds costs."""

    required = {"route_cost", "adjusted_time_min"}
    if not required.issubset(edges.columns):
        raise ValueError(
            "Costs are now calculated by load_scenario(); load the graph "
            "with the desired optimization profile instead."
        )
    return edges.copy()


__all__ = [
    "DATA_DIR", "add_costs", "build_graph", "load_graph",
    "load_scenario", "min_max", "parse_bool",
]
