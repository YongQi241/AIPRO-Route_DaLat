# graph_loader.py

from pathlib import Path

import networkx as nx
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "generated"


def parse_bool(series: pd.Series) -> pd.Series:
    """
    Convert CSV boolean values safely.
    Accepts: True, true, 1, yes
    """

    return (
        series.astype(str)
        .str.strip()
        .str.lower()
        .isin({"true", "1", "yes"})
    )


def min_max(series: pd.Series) -> pd.Series:
    """Normalize a numeric column to [0,1]."""

    minimum = series.min()
    maximum = series.max()

    if maximum == minimum:
        return pd.Series(0.0, index=series.index)

    return (series - minimum) / (maximum - minimum)


def load_scenario(
    scenario_id: str,
    optimization: str = "balanced",
    data_dir: str | Path = DATA_DIR,
):
    """
    Load nodes + edges and apply one traffic/weather scenario.
    """

    data_dir = Path(data_dir)

    nodes = pd.read_csv(data_dir / "nodes_snapped.csv")
    edges = pd.read_csv(data_dir / "edges.csv")
    conditions = pd.read_csv(data_dir / "edge_conditions.csv")

    scenario = conditions.loc[
        conditions["scenario_id"] == scenario_id
    ].copy()

    if scenario.empty:
        raise ValueError(f"Unknown scenario_id: {scenario_id}")

    scenario = scenario.rename(
        columns={
            "congestion_level": "scenario_congestion",
            "closed": "scenario_closed",
        }
    )

    edges = edges.merge(
        scenario,
        on="edge_id",
        how="left",
        validate="one_to_one",
        suffixes=("", "_condition"),
    )

    # ---------- Effective values ----------

    edges["effective_congestion"] = (
        edges["scenario_congestion"]
        .fillna(edges["congestion_level"])
    )

    edges["time_multiplier"] = (
        edges["time_multiplier"]
        .fillna(1.0)
    )

    edges["rain_risk"] = edges["rain_risk"].fillna(0)
    edges["fog_risk"] = edges["fog_risk"].fillna(0)
    edges["construction_penalty"] = (
        edges["construction_penalty"].fillna(0)
    )

    base_closed = parse_bool(edges["closed"])

    scenario_closed = parse_bool(
        edges["scenario_closed"].fillna(False)
    )

    edges["effective_closed"] = (
        base_closed | scenario_closed
    )

    # Remove closed roads
    edges = edges.loc[
        ~edges["effective_closed"]
    ].copy()

    # ---------- Derived values ----------

    edges["adjusted_time_min"] = (
        edges["base_time_min"]
        * edges["time_multiplier"]
    )

    edges["total_risk"] = (
        edges["risk_score"]
        + edges["rain_risk"]
        + edges["fog_risk"]
        + edges["construction_penalty"]
    )

    # ---------- Normalize ----------

    edges["distance_norm"] = min_max(
        edges["distance_km"]
    )

    edges["time_norm"] = min_max(
        edges["adjusted_time_min"]
    )

    edges["risk_norm"] = min_max(
        edges["total_risk"]
    )

    edges["congestion_norm"] = (
        edges["effective_congestion"] / 5.0
    )

    profiles = {
        "shortest": (0.80, 0.15, 0.03, 0.02),
        "fastest": (0.10, 0.75, 0.10, 0.05),
        "balanced": (0.20, 0.50, 0.15, 0.15),
        "safest": (0.10, 0.25, 0.10, 0.55),
    }

    if optimization not in profiles:
        raise ValueError("Unknown optimization profile.")

    alpha, beta, gamma, delta = profiles[
        optimization
    ]

    edges["route_cost"] = (
        alpha * edges["distance_norm"]
        + beta * edges["time_norm"]
        + gamma * edges["congestion_norm"]
        + delta * edges["risk_norm"]
    )

    return nodes, edges


def build_graph(
    nodes: pd.DataFrame,
    edges: pd.DataFrame,
) -> nx.DiGraph:
    """
    Build the directed graph used by all algorithms.
    """

    graph = nx.DiGraph()

    # ---------- Nodes ----------

    for node in nodes.itertuples(index=False):
        graph.add_node(
            node.node_id,
            name_vi=node.name_vi,
            name_en=getattr(node, "name_en", ""),
            category=node.category,
            latitude=float(node.latitude),
            longitude=float(node.longitude),
        )

    # ---------- Edges ----------

    for edge in edges.itertuples(index=False):
        graph.add_edge(
            edge.from_node,
            edge.to_node,
            edge_id=edge.edge_id,
            distance_km=float(edge.distance_km),
            base_time_min=float(edge.base_time_min),
            adjusted_time_min=float(edge.adjusted_time_min),
            congestion=float(edge.effective_congestion),
            risk=float(edge.total_risk),
            route_cost=float(edge.route_cost),
            road_type=edge.road_type,
        )

    return graph


def load_graph(
    scenario_id: str = "S0",
    optimization: str = "balanced",
    data_dir: str | Path = DATA_DIR,
):
    """
    Main function used by BFS, DFS, UCS, Dijkstra, and A*.
    """

    nodes, edges = load_scenario(
        scenario_id,
        optimization,
        data_dir,
    )

    graph = build_graph(nodes, edges)

    return graph
