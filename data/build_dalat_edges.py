from __future__ import annotations

from pathlib import Path
from typing import Any

import geopandas as gpd
import networkx as nx
import numpy as np
import osmnx as ox
import pandas as pd
from shapely.geometry import LineString
from shapely.ops import unary_union


BASE_DIR = Path(__file__).resolve().parent
INPUT_FILE = BASE_DIR / "nodes.geojson"
OUTPUT_DIR = BASE_DIR / "generated_routes_connected"
OUTPUT_DIR.mkdir(exist_ok=True)

# Local alternative links added in addition to the connectivity backbone.
LOCAL_NEIGHBORS = 3

# Padding around the outermost tourist locations.
BBOX_MARGIN_DEGREES = 0.03

# Modeling assumptions, not official posted speed limits.
ASSUMED_SPEEDS_KPH = {
    "living_street": 15,
    "residential": 20,
    "service": 15,
    "unclassified": 20,
    "tertiary": 30,
    "secondary": 40,
    "primary": 50,
}
FALLBACK_SPEED_KPH = 25

ox.settings.use_cache = True
ox.settings.log_console = True
ox.settings.requests_timeout = 180


def normalize_highway_values(values: pd.Series) -> str:
    road_types: set[str] = set()
    for value in values.dropna():
        if isinstance(value, (list, tuple, set)):
            road_types.update(str(item) for item in value)
        else:
            road_types.add(str(value))
    return "|".join(sorted(road_types)) or "unknown"


def canonical_pair(a: int, b: int) -> tuple[int, int]:
    return (a, b) if a < b else (b, a)


def build_pair_set(locations: gpd.GeoDataFrame) -> set[tuple[int, int]]:
    """
    Build an undirected pair set containing:
      1. a minimum-spanning-tree backbone, which guarantees connectivity;
      2. LOCAL_NEIGHBORS geographic links per location for route alternatives.
    """
    n = len(locations)
    latitudes = locations["latitude"].to_numpy()
    longitudes = locations["longitude"].to_numpy()

    complete_graph = nx.Graph()
    complete_graph.add_nodes_from(range(n))

    distance_matrix = np.zeros((n, n), dtype=float)

    for i in range(n):
        distances = np.asarray(
            ox.distance.great_circle(
                latitudes[i],
                longitudes[i],
                latitudes,
                longitudes,
            ),
            dtype=float,
        )
        distance_matrix[i] = distances

        for j in range(i + 1, n):
            complete_graph.add_edge(i, j, weight=float(distances[j]))

    spanning_tree = nx.minimum_spanning_tree(
        complete_graph,
        weight="weight",
    )

    selected_pairs = {
        canonical_pair(int(i), int(j))
        for i, j in spanning_tree.edges()
    }

    for i in range(n):
        nearest_indices = np.argsort(distance_matrix[i])
        added = 0
        for j in nearest_indices:
            j = int(j)
            if j == i:
                continue
            selected_pairs.add(canonical_pair(i, j))
            added += 1
            if added >= LOCAL_NEIGHBORS:
                break

    return selected_pairs


def build_route_record(
    road_graph: nx.MultiDiGraph,
    source: pd.Series,
    destination: pd.Series,
) -> dict[str, Any]:
    origin_road_node = int(source["road_node"])
    destination_road_node = int(destination["road_node"])

    # Two POIs can occasionally snap to the same road node.
    if origin_road_node == destination_road_node:
        straight_line_m = float(
            ox.distance.great_circle(
                source["latitude"],
                source["longitude"],
                destination["latitude"],
                destination["longitude"],
            )
        )
        distance_m = max(straight_line_m, 1.0)
        assumed_connector_speed_kph = 15.0
        travel_time_s = distance_m / (assumed_connector_speed_kph * 1000 / 3600)
        geometry = LineString(
            [
                (source["longitude"], source["latitude"]),
                (destination["longitude"], destination["latitude"]),
            ]
        )

        return {
            "from_node": source["node_id"],
            "to_node": destination["node_id"],
            "from_name": source["name_vi"],
            "to_name": destination["name_vi"],
            "distance_km": round(distance_m / 1000, 3),
            "base_time_min": round(travel_time_s / 60, 2),
            "average_speed_kph": assumed_connector_speed_kph,
            "road_type": "same_snapped_road_node",
            "one_way_share": 0.0,
            "direction": "directed",
            "congestion_level": 1,
            "risk_score": 0,
            "closed": False,
            "backbone_edge": False,
            "data_source": "POI connector",
            "geometry": geometry,
        }

    route = ox.routing.shortest_path(
        road_graph,
        origin_road_node,
        destination_road_node,
        weight="travel_time",
    )

    if route is None:
        raise nx.NetworkXNoPath(
            f"No route from {source['node_id']} to {destination['node_id']} "
            "after snapping to the strongly connected road component."
        )

    route_edges = ox.routing.route_to_gdf(
        road_graph,
        route,
        weight="travel_time",
    )

    distance_m = float(route_edges["length"].sum())
    travel_time_s = float(route_edges["travel_time"].sum())

    if distance_m <= 0 or travel_time_s <= 0:
        raise ValueError(
            f"Invalid route metrics from {source['node_id']} "
            f"to {destination['node_id']}."
        )

    geometry = unary_union(route_edges.geometry.tolist())
    average_speed_kph = (
        (distance_m / 1000) / (travel_time_s / 3600)
    )

    one_way_share = None
    if "oneway" in route_edges.columns:
        one_way_values = route_edges["oneway"].fillna(False).astype(bool)
        one_way_share = float(one_way_values.mean())

    return {
        "from_node": source["node_id"],
        "to_node": destination["node_id"],
        "from_name": source["name_vi"],
        "to_name": destination["name_vi"],
        "distance_km": round(distance_m / 1000, 3),
        "base_time_min": round(travel_time_s / 60, 2),
        "average_speed_kph": round(average_speed_kph, 1),
        "road_type": normalize_highway_values(
            route_edges["highway"]
            if "highway" in route_edges.columns
            else pd.Series(dtype=object)
        ),
        "one_way_share": (
            round(one_way_share, 3)
            if one_way_share is not None
            else None
        ),
        "direction": "directed",
        "congestion_level": 1,
        "risk_score": 0,
        "closed": False,
        "backbone_edge": False,
        "data_source": "OpenStreetMap + modeled speeds",
        "geometry": geometry,
    }


def main() -> None:
    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Place nodes.geojson beside this script: {INPUT_FILE}"
        )

    locations = gpd.read_file(INPUT_FILE)

    required_columns = {
        "node_id",
        "name_vi",
        "category",
        "geometry",
    }
    missing_columns = required_columns.difference(locations.columns)
    if missing_columns:
        raise KeyError(
            f"Missing columns: {sorted(missing_columns)}. "
            f"Available: {locations.columns.tolist()}"
        )

    if locations.crs is None:
        locations = locations.set_crs("EPSG:4326")
    else:
        locations = locations.to_crs("EPSG:4326")

    if not locations.geometry.geom_type.eq("Point").all():
        raise ValueError("All location geometries must be Points.")

    if locations["node_id"].duplicated().any():
        duplicate_ids = locations.loc[
            locations["node_id"].duplicated(keep=False),
            "node_id",
        ].tolist()
        raise ValueError(f"Duplicate node IDs: {duplicate_ids}")

    locations = locations.reset_index(drop=True)
    locations["longitude"] = locations.geometry.x
    locations["latitude"] = locations.geometry.y

    min_lon, min_lat, max_lon, max_lat = locations.total_bounds
    bbox = (
        min_lon - BBOX_MARGIN_DEGREES,
        min_lat - BBOX_MARGIN_DEGREES,
        max_lon + BBOX_MARGIN_DEGREES,
        max_lat + BBOX_MARGIN_DEGREES,
    )

    print("1/6 Downloading the Da Lat driving network...")
    downloaded_graph = ox.graph.graph_from_bbox(
        bbox,
        network_type="drive",
        simplify=True,
        retain_all=False,
        truncate_by_edge=True,
    )

    downloaded_graph = ox.routing.add_edge_speeds(
        downloaded_graph,
        hwy_speeds=ASSUMED_SPEEDS_KPH,
        fallback=FALLBACK_SPEED_KPH,
    )
    downloaded_graph = ox.routing.add_edge_travel_times(downloaded_graph)

    downloaded_nodes = downloaded_graph.number_of_nodes()
    downloaded_edges = downloaded_graph.number_of_edges()

    print("2/6 Keeping the largest strongly connected road component...")
    road_graph = ox.truncate.largest_component(
        downloaded_graph,
        strongly=True,
    )

    strong_nodes = road_graph.number_of_nodes()
    strong_edges = road_graph.number_of_edges()

    if strong_nodes == 0:
        raise RuntimeError("The strongly connected road component is empty.")

    ox.io.save_graphml(
        road_graph,
        OUTPUT_DIR / "dalat_road_network_strong.graphml",
    )

    print("3/6 Snapping every tourist location to that component...")
    nearest_road_nodes, snap_distances = ox.distance.nearest_nodes(
        road_graph,
        X=locations["longitude"].to_numpy(),
        Y=locations["latitude"].to_numpy(),
        return_dist=True,
    )

    locations["road_node"] = nearest_road_nodes
    locations["snap_distance_m"] = np.round(snap_distances, 1)

    duplicate_snaps = (
        locations.groupby("road_node")["node_id"]
        .apply(list)
        .loc[lambda series: series.map(len) > 1]
        .to_dict()
    )

    node_columns = [
        "node_id",
        "osm_id",
        "name_vi",
        "name_en",
        "category",
        "opening_hours",
        "latitude",
        "longitude",
        "road_node",
        "snap_distance_m",
    ]
    existing_node_columns = [
        column for column in node_columns if column in locations.columns
    ]

    locations[existing_node_columns].to_csv(
        OUTPUT_DIR / "nodes_snapped.csv",
        index=False,
        encoding="utf-8-sig",
    )
    locations.to_file(
        OUTPUT_DIR / "nodes_snapped.geojson",
        driver="GeoJSON",
    )

    print("4/6 Building MST backbone plus local alternatives...")
    selected_pairs = build_pair_set(locations)

    # Identify which pairs are backbone pairs for reporting.
    complete_for_mst = nx.Graph()
    complete_for_mst.add_nodes_from(range(len(locations)))
    for i in range(len(locations)):
        for j in range(i + 1, len(locations)):
            distance = float(
                ox.distance.great_circle(
                    locations.iloc[i]["latitude"],
                    locations.iloc[i]["longitude"],
                    locations.iloc[j]["latitude"],
                    locations.iloc[j]["longitude"],
                )
            )
            complete_for_mst.add_edge(i, j, weight=distance)

    mst = nx.minimum_spanning_tree(complete_for_mst, weight="weight")
    backbone_pairs = {
        canonical_pair(int(i), int(j))
        for i, j in mst.edges()
    }

    edge_records: list[dict[str, Any]] = []
    failed_routes: list[str] = []

    # Add both directions for every selected undirected pair.
    for pair_number, (i, j) in enumerate(sorted(selected_pairs), start=1):
        source = locations.iloc[i]
        destination = locations.iloc[j]

        for a, b in ((source, destination), (destination, source)):
            try:
                record = build_route_record(road_graph, a, b)
                record["backbone_edge"] = canonical_pair(i, j) in backbone_pairs
                edge_records.append(record)
            except Exception as exc:
                failed_routes.append(
                    f"{a['node_id']} -> {b['node_id']}: "
                    f"{type(exc).__name__}: {exc}"
                )

        if pair_number % 10 == 0 or pair_number == len(selected_pairs):
            print(
                f"  Processed {pair_number}/{len(selected_pairs)} "
                "tourist-location pairs"
            )

    if failed_routes:
        failure_file = OUTPUT_DIR / "failed_routes.txt"
        failure_file.write_text(
            "\n".join(failed_routes),
            encoding="utf-8",
        )
        raise RuntimeError(
            f"{len(failed_routes)} routes failed. "
            f"See {failure_file}."
        )

    if not edge_records:
        raise RuntimeError("No tourism edges were generated.")

    edges = gpd.GeoDataFrame(
        edge_records,
        geometry="geometry",
        crs=road_graph.graph["crs"],
    )

    edges = edges.drop_duplicates(
        subset=["from_node", "to_node"],
        keep="first",
    ).reset_index(drop=True)

    edges.insert(
        0,
        "edge_id",
        [f"E{i:03d}" for i in range(1, len(edges) + 1)],
    )

    edges.drop(columns="geometry").to_csv(
        OUTPUT_DIR / "edges.csv",
        index=False,
        encoding="utf-8-sig",
    )
    edges.to_file(
        OUTPUT_DIR / "edges.geojson",
        driver="GeoJSON",
    )

    print("5/6 Validating the simplified tourism graph...")
    tourism_graph = nx.from_pandas_edgelist(
        edges,
        source="from_node",
        target="to_node",
        edge_attr=True,
        create_using=nx.DiGraph,
    )
    tourism_graph.add_nodes_from(locations["node_id"].tolist())

    weakly_connected = nx.is_weakly_connected(tourism_graph)
    strongly_connected = nx.is_strongly_connected(tourism_graph)

    if not strongly_connected:
        components = list(nx.strongly_connected_components(tourism_graph))
        component_lines = [
            f"Component {index}: {sorted(component)}"
            for index, component in enumerate(components, start=1)
        ]
        component_file = OUTPUT_DIR / "tourism_components.txt"
        component_file.write_text(
            "\n".join(component_lines),
            encoding="utf-8",
        )
        raise RuntimeError(
            "The generated graph is unexpectedly not strongly connected. "
            f"See {component_file}."
        )

    print("6/6 Creating scenario templates...")
    scenario_definitions = {
        "S0": ("weekday_normal", 1.00, 1, 0, 0),
        "S1": ("weekend_busy", 1.35, 4, 0, 0),
        "S2": ("evening_rush", 1.60, 5, 0, 0),
        "S3": ("heavy_rain", 1.30, 3, 4, 0),
        "S4": ("dense_fog", 1.20, 2, 0, 4),
    }

    condition_rows: list[dict[str, Any]] = []
    for edge in edges.itertuples(index=False):
        for scenario_id, values in scenario_definitions.items():
            scenario_name, multiplier, congestion, rain, fog = values
            condition_rows.append(
                {
                    "scenario_id": scenario_id,
                    "scenario_name": scenario_name,
                    "edge_id": edge.edge_id,
                    "congestion_level": congestion,
                    "time_multiplier": multiplier,
                    "rain_risk": rain,
                    "fog_risk": fog,
                    "construction_penalty": 0,
                    "closed": False,
                    "notes": "Template value—review manually",
                }
            )

    pd.DataFrame(condition_rows).to_csv(
        OUTPUT_DIR / "edge_conditions_template.csv",
        index=False,
        encoding="utf-8-sig",
    )

    report_lines = [
        "Da Lat connected route dataset report",
        "======================================",
        f"Tourist nodes: {len(locations)}",
        f"Selected undirected location pairs: {len(selected_pairs)}",
        f"MST backbone pairs: {len(backbone_pairs)}",
        f"Generated directed edges: {len(edges)}",
        f"Weakly connected: {weakly_connected}",
        f"Strongly connected: {strongly_connected}",
        "",
        f"Downloaded road nodes: {downloaded_nodes}",
        f"Downloaded road edges: {downloaded_edges}",
        f"Strong-component road nodes: {strong_nodes}",
        f"Strong-component road edges: {strong_edges}",
        f"Maximum snap distance: {locations['snap_distance_m'].max():.1f} m",
        f"Median snap distance: {locations['snap_distance_m'].median():.1f} m",
        f"Duplicate snapped-road-node groups: {duplicate_snaps or 'None'}",
    ]

    (OUTPUT_DIR / "connectivity_report.txt").write_text(
        "\n".join(report_lines),
        encoding="utf-8",
    )

    print()
    print("\n".join(report_lines))
    print(f"\nFiles saved in: {OUTPUT_DIR.resolve()}")


if __name__ == "__main__":
    main()