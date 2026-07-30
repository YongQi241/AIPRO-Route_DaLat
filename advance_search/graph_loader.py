import pandas as pd
import networkx as nx
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "generated_routes_connected"

def parse_bool(series: pd.Series) -> pd.Series:
    """Convert bool-like CSV values safely."""
    return series.astype(str).str.strip().str.lower().isin({"true", "1", "yes"})

def load_scenario(scenario_id: str):
    nodes = pd.read_csv(DATA_DIR / "nodes_snapped.csv")
    
    # Try edges.csv first
    edges_path = DATA_DIR / "edges.csv"
    if not edges_path.exists():
        print("edges.csv not found, cannot run test")
        return None, None
        
    edges = pd.read_csv(edges_path)
    
    # Check if edge_conditions.csv exists
    conditions_path = DATA_DIR / "edge_conditions.csv"
    if conditions_path.exists():
        conditions = pd.read_csv(conditions_path)
        scenario = conditions.loc[conditions["scenario_id"] == scenario_id].copy()
    else:
        # Dummy conditions if not found
        scenario = pd.DataFrame(columns=["scenario_id", "edge_id", "scenario_congestion_level", "scenario_closed", "time_multiplier", "rain_risk", "fog_risk", "construction_penalty"])

    if scenario.empty and conditions_path.exists():
        print(f"Unknown scenario_id: {scenario_id}")
        # Just use base edges
        prepared = edges.copy()
        prepared["effective_congestion"] = prepared.get("congestion_level", 1.0)
        prepared["adjusted_time_min"] = prepared.get("base_time_min", 1.0)
        prepared["total_risk"] = prepared.get("risk_score", 0.0)
    else:
        scenario = scenario.rename(
            columns={
                "congestion_level": "scenario_congestion_level",
                "closed": "scenario_closed",
            }
        )
        prepared = edges.merge(
            scenario,
            on="edge_id",
            how="left",
            suffixes=("", "_condition"),
        )
        prepared["effective_congestion"] = prepared["scenario_congestion_level"].fillna(prepared.get("congestion_level", 1.0))
        prepared["time_multiplier"] = prepared.get("time_multiplier", pd.Series([1.0]*len(prepared))).fillna(1.0)
        prepared["rain_risk"] = prepared.get("rain_risk", pd.Series([0.0]*len(prepared))).fillna(0)
        prepared["fog_risk"] = prepared.get("fog_risk", pd.Series([0.0]*len(prepared))).fillna(0)
        prepared["construction_penalty"] = prepared.get("construction_penalty", pd.Series([0.0]*len(prepared))).fillna(0)
        
        base_closed = parse_bool(prepared.get("closed", pd.Series([False]*len(prepared))))
        scenario_closed = parse_bool(prepared.get("scenario_closed", pd.Series([False]*len(prepared))).fillna(False))
        prepared["effective_closed"] = base_closed | scenario_closed
        
        prepared = prepared.loc[~prepared["effective_closed"]].copy()
        prepared["adjusted_time_min"] = prepared.get("base_time_min", 1.0) * prepared["time_multiplier"]
        prepared["total_risk"] = prepared.get("risk_score", 0.0) + prepared["rain_risk"] + prepared["fog_risk"] + prepared["construction_penalty"]

    return nodes, prepared

def min_max(series: pd.Series) -> pd.Series:
    minimum = series.min()
    maximum = series.max()
    if maximum == minimum:
        return pd.Series(0.0, index=series.index)
    return (series - minimum) / (maximum - minimum)

def add_costs(edges: pd.DataFrame, profile: str) -> pd.DataFrame:
    result = edges.copy()
    
    if "distance_km" not in result: result["distance_km"] = 1.0
    if "adjusted_time_min" not in result: result["adjusted_time_min"] = 1.0

    result["distance_norm"] = min_max(result["distance_km"])
    result["time_norm"] = min_max(result["adjusted_time_min"])
    result["congestion_norm"] = result["effective_congestion"] / 5.0
    result["risk_norm"] = min_max(result["total_risk"])

    profiles = {
        "shortest": (0.80, 0.15, 0.03, 0.02),
        "fastest": (0.10, 0.75, 0.10, 0.05),
        "balanced": (0.20, 0.50, 0.15, 0.15),
        "safest": (0.10, 0.25, 0.10, 0.55),
    }

    if profile not in profiles:
        profile = "balanced"

    alpha, beta, gamma, delta = profiles[profile]
    result["route_cost"] = (
        alpha * result["distance_norm"]
        + beta * result["time_norm"]
        + gamma * result["congestion_norm"]
        + delta * result["risk_norm"]
    )

    return result

def build_graph(nodes: pd.DataFrame, edges: pd.DataFrame) -> nx.DiGraph:
    graph = nx.DiGraph()
    for node in nodes.itertuples(index=False):
        graph.add_node(
            node.node_id,
            name_vi=getattr(node, "name_vi", ""),
            latitude=float(node.latitude) if hasattr(node, "latitude") else 0.0,
            longitude=float(node.longitude) if hasattr(node, "longitude") else 0.0,
        )
    for edge in edges.itertuples(index=False):
        graph.add_edge(
            edge.from_node,
            edge.to_node,
            edge_id=getattr(edge, "edge_id", ""),
            distance_km=float(getattr(edge, "distance_km", 0.0)),
            adjusted_time_min=float(getattr(edge, "adjusted_time_min", 0.0)),
            congestion_level=float(getattr(edge, "effective_congestion", 1.0)),
            risk=float(getattr(edge, "total_risk", 0.0)),
            route_cost=float(getattr(edge, "route_cost", 0.0)),
        )
    return graph
