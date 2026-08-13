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

from generate_edge_conditions import generate_edge_conditions


BASE_DIR = Path(__file__).resolve().parent
INPUT_FILE = BASE_DIR / "nodes.geojson"
OUTPUT_DIR = BASE_DIR / "generated"
OUTPUT_DIR.mkdir(exist_ok=True)

# Target number of directed edges in the final output (about 2x the number
# of undirected location pairs, since each pair becomes two directed edges).
# The MST backbone is always kept in full to guarantee connectivity, so if
# the backbone alone already needs more edges than this target, the target
# is not reachable and the backbone size wins instead.
TARGET_TOTAL_EDGES = 60

# Padding around the outermost tourist locations.
BBOX_MARGIN_DEGREES = 0.03

# Douglas-Peucker tolerance (in degrees) used to thin route-line vertices.
# Coordinates here are lat/lon (EPSG:4326), so this is a rough approximation:
# at Da Lat's latitude, ~0.00005 deg is roughly 5 meters. Increase for
# coarser/lighter geometry, decrease to keep more shape detail.
SIMPLIFY_TOLERANCE_DEGREES = 0.00001

# Every edge's geometry is the real routed road path, with a short
# straight "connector" segment stitched onto each end so the line always
# starts and ends exactly at the tourist location's own coordinates
# rather than at the road node it snapped to. Speed assumed for those
# connector segments (and for the same-snapped-node fallback below).
CONNECTOR_SPEED_KPH = 15.0

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


def build_pair_set(
    locations: gpd.GeoDataFrame,
    target_total_edges: int = TARGET_TOTAL_EDGES,
) -> set[tuple[int, int]]:
    """
    Build an undirected pair set containing:
      1. a minimum-spanning-tree backbone, which guarantees connectivity;
      2. the shortest remaining geographic links, added one at a time,
         until the pair count reaches target_total_edges / 2 (each
         undirected pair becomes two directed edges later).

    If the backbone alone already needs more pairs than the target allows,
    the backbone wins and no extra links are added -- connectivity is
    never sacrificed to hit the target.
    """
    n = len(locations)
    latitudes = locations["latitude"].to_numpy()
    longitudes = locations["longitude"].to_numpy()

    complete_graph = nx.Graph()
    complete_graph.add_nodes_from(range(n))

    distance_matrix = np.zeros((n, n), dtype=float)
    candidate_pairs: list[tuple[float, int, int]] = []

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
            distance = float(distances[j])
            complete_graph.add_edge(i, j, weight=distance)
            candidate_pairs.append((distance, i, j))

    spanning_tree = nx.minimum_spanning_tree(
        complete_graph,
        weight="weight",
    )

    selected_pairs = {
        canonical_pair(int(i), int(j))
        for i, j in spanning_tree.edges()
    }

    target_pairs = max(len(selected_pairs), target_total_edges // 2)

    if len(selected_pairs) < target_pairs:
        candidate_pairs.sort(key=lambda item: item[0])
        for _distance, i, j in candidate_pairs:
            if len(selected_pairs) >= target_pairs:
                break
            selected_pairs.add(canonical_pair(i, j))

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
        travel_time_s = distance_m / (CONNECTOR_SPEED_KPH * 1000 / 3600)
        geometry = LineString(
            [
                (source["longitude"], source["latitude"]),
                (destination["longitude"], destination["latitude"]),
            ]
        ).simplify(SIMPLIFY_TOLERANCE_DEGREES, preserve_topology=True)

        return {
            "from_node": source["node_id"],
            "to_node": destination["node_id"],
            "from_name": source["name_vi"],
            "to_name": destination["name_vi"],
            "distance_km": round(distance_m / 1000, 3),
            "connector_distance_m": round(distance_m, 1),
            "base_time_min": round(travel_time_s / 60, 2),
            "average_speed_kph": CONNECTOR_SPEED_KPH,
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

    route_distance_m = float(route_edges["length"].sum())
    route_time_s = float(route_edges["travel_time"].sum())

    if route_distance_m <= 0 or route_time_s <= 0:
        raise ValueError(
            f"Invalid route metrics from {source['node_id']} "
            f"to {destination['node_id']}."
        )

    # Short straight segments from each location's own coordinates to the
    # road node it snapped to, so the stored geometry -- and the distance
    # and time it represents -- starts and ends exactly on the location.
    connector_speed_m_s = CONNECTOR_SPEED_KPH * 1000 / 3600
    start_connector_m = float(source["snap_distance_m"])
    end_connector_m = float(destination["snap_distance_m"])
    start_connector_s = start_connector_m / connector_speed_m_s
    end_connector_s = end_connector_m / connector_speed_m_s

    origin_node = road_graph.nodes[origin_road_node]
    destination_node = road_graph.nodes[destination_road_node]

    segments = []
    if start_connector_m > 1e-6:
        segments.append(
            LineString(
                [
                    (source["longitude"], source["latitude"]),
                    (origin_node["x"], origin_node["y"]),
                ]
            )
        )
    segments.extend(route_edges.geometry.tolist())
    if end_connector_m > 1e-6:
        segments.append(
            LineString(
                [
                    (destination_node["x"], destination_node["y"]),
                    (destination["longitude"], destination["latitude"]),
                ]
            )
        )

    distance_m = start_connector_m + route_distance_m + end_connector_m
    travel_time_s = start_connector_s + route_time_s + end_connector_s

    geometry = unary_union(segments)
    geometry = geometry.simplify(
        SIMPLIFY_TOLERANCE_DEGREES,
        preserve_topology=True,
    )
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
        "connector_distance_m": round(start_connector_m + end_connector_m, 1),
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
        "data_source": "OpenStreetMap + modeled speeds + connector",
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

    print("6/6 Creating varied scenario conditions...")
    generate_edge_conditions(edges).to_csv(
        OUTPUT_DIR / "edge_conditions.csv",
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

    print()
    print("\n".join(report_lines))
    print(f"\nFiles saved in: {OUTPUT_DIR.resolve()}")


if __name__ == "__main__":
    main()