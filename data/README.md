# Da Lat Tourism Route Dataset — Team Integration Guide

This guide explains how two project roles should use the generated Da Lat route dataset:

- **Algorithm member:** load the graph, apply traffic/weather conditions, run BFS, DFS, UCS, Dijkstra, A*, or multi-location optimization, and return a standard result object.
- **Display/GUI member:** show locations and road geometries, collect user selections, animate the search process, highlight the final path, and present route metrics and explanations.

The main rule is:

> The algorithm member owns path computation. The display member consumes the returned result and visualizes it. Both members must use `node_id` and `edge_id` as the shared identifiers.

---

## 1. Required data folder

Recommended application structure:

```text
project/
├── data/
│   ├── nodes_snapped.csv
│   ├── nodes_snapped.geojson
│   ├── edges.csv
│   ├── edges.geojson
│   └── edge_conditions.csv
├── algorithms/
│   ├── graph_loader.py
│   ├── bfs.py
│   ├── dfs.py
│   ├── ucs.py
│   ├── astar.py
│   └── multi_location.py
├── ui/
│   ├── app.py
│   └── map_view.py
└── README.md
```

Rename `edge_conditions_template.csv` to `edge_conditions.csv` after the team edits its simulated conditions.

---

## 2. Which file should each member use?

| File | Algorithm member | Display member | Purpose |
|---|---:|---:|---|
| `nodes_snapped.csv` | Yes | Yes | Location IDs, names, categories, coordinates |
| `edges.csv` | Yes | Optional | Directed graph connections and weights |
| `edge_conditions.csv` | Yes | Optional | Scenario-specific congestion, risk, closure, and time multipliers |
| `nodes_snapped.geojson` | Optional | Yes | Point markers on the map |
| `edges.geojson` | Optional | Yes | Real road geometry for route lines |
| `dalat_road_network_strong.graphml` | Usually no | No | Detailed source road network; not required for normal route searches |
| `connectivity_report.txt` | Yes, once | No | Dataset validation and snapping diagnostics |

The simplified search graph is defined by `nodes_snapped.csv` and `edges.csv`. Do not run BFS or A* directly on every OpenStreetMap intersection unless the team intentionally wants a much larger graph.

---

## 3. Data dictionary

### 3.1 `nodes_snapped.csv`

One row represents one tourist location.

| Column | Meaning | Usage |
|---|---|---|
| `node_id` | Stable project ID such as `DL01` | Primary graph-node identifier |
| `osm_id` | Original OpenStreetMap feature ID | Provenance only |
| `name_vi` | Vietnamese location name | Main display label |
| `name_en` | English name, possibly empty | Optional secondary label |
| `category` | Museum, heritage, nature, architecture, etc. | Filtering and icons |
| `opening_hours` | OSM opening-hours text, possibly empty | Optional itinerary constraint |
| `latitude` | WGS84 latitude | Marker and A* heuristic |
| `longitude` | WGS84 longitude | Marker and A* heuristic |
| `road_node` | Nearest node in the detailed OSM road graph | Diagnostic/provenance |
| `snap_distance_m` | Distance from POI to snapped road node | Quality check |

Use `node_id` in code. Do not use `name_vi` as a key because names may contain accents, spaces, or duplicates in future versions.

### 3.2 `edges.csv`

One row represents one **directed** connection.

| Column | Meaning | Usage |
|---|---|---|
| `edge_id` | Stable edge ID such as `E001` | Join with conditions and GeoJSON |
| `from_node` | Origin `node_id` | Directed graph source |
| `to_node` | Destination `node_id` | Directed graph target |
| `from_name` / `to_name` | Readable names | Debugging only |
| `distance_km` | Route length | Distance optimization and metrics |
| `base_time_min` | Estimated normal travel time | Time optimization |
| `average_speed_kph` | Modeled route-average speed | Information/heuristic checks |
| `road_type` | OSM road classes used by the route | Explanation and conditions |
| `one_way_share` | Share of route segments marked one-way | Explanation only |
| `direction` | Currently `directed` | Reminder not to treat it as undirected |
| `congestion_level` | Base congestion, normally 1 | Fallback when no scenario value exists |
| `risk_score` | Base risk, normally 0 | Fallback risk |
| `closed` | Base closure status | Remove edge when true |
| `backbone_edge` | Whether the connection belongs to the connectivity backbone | Dataset construction detail |
| `data_source` | OSM/model description | Report provenance |

`DL01 → DL02` and `DL02 → DL01` are different edges. Never automatically reverse an edge.

`backbone_edge = True` does **not** mean the route is recommended. It only means the edge helps keep the simplified graph connected.

### 3.3 `edge_conditions.csv`

One row represents the condition of one edge in one scenario.

| Column | Meaning |
|---|---|
| `scenario_id` | Scenario key such as `S0`, `S1`, or `S3` |
| `scenario_name` | Human-readable scenario |
| `edge_id` | Edge to which the condition applies |
| `congestion_level` | Usually 1–5 |
| `time_multiplier` | Multiplies `base_time_min` |
| `rain_risk` | Rain-related penalty |
| `fog_risk` | Fog-related penalty |
| `construction_penalty` | Construction penalty |
| `closed` | If true, the edge must not enter the search graph |
| `notes` | Human-readable reason or assumption |

The generated file is a template. The team should edit individual roads so a scenario affects different edges differently. Giving every edge exactly the same multiplier changes total time but often does not change the chosen path.

---

## 4. Shared input contract

The GUI should call one algorithm-facing function with this information:

```python
request = {
    "start_node": "DL01",
    "goal_node": "DL15",
    "algorithm": "astar",
    "scenario_id": "S1",
    "optimization": "balanced",
}
```

For multiple destinations:

```python
request = {
    "start_node": "DL01",
    "visit_nodes": ["DL03", "DL08", "DL15"],
    "algorithm": "nearest_neighbor",
    "scenario_id": "S1",
    "optimization": "balanced",
}
```

The UI must pass IDs, not names.

---

## 5. Shared output contract

Every route algorithm should return the same structure so the GUI does not need algorithm-specific display code.

```python
result = {
    "status": "success",              # success | no_path | invalid_input | error
    "algorithm": "A*",
    "scenario_id": "S1",
    "optimization": "balanced",

    "start_node": "DL01",
    "goal_node": "DL15",

    "path_nodes": ["DL01", "DL04", "DL09", "DL15"],
    "path_edges": ["E001", "E024", "E061"],

    "visited_order": ["DL01", "DL03", "DL04", "DL07", "DL09", "DL15"],
    "frontier_steps": [],              # Optional; useful for animation

    "metrics": {
        "total_distance_km": 12.63,
        "total_time_min": 31.42,
        "total_cost": 2.184,
        "explored_nodes": 6,
        "processing_time_ms": 1.82,
    },

    "segments": [
        {
            "edge_id": "E001",
            "from_node": "DL01",
            "to_node": "DL04",
            "distance_km": 2.1,
            "adjusted_time_min": 6.2,
            "congestion_level": 4,
            "risk": 0,
        }
    ],

    "explanation": (
        "The selected route has the lowest balanced cost. "
        "It avoids a more congested city-center connection."
    ),
    "message": None,
}
```

For failure:

```python
result = {
    "status": "no_path",
    "algorithm": "A*",
    "scenario_id": "S5",
    "path_nodes": [],
    "path_edges": [],
    "visited_order": [],
    "metrics": {},
    "segments": [],
    "explanation": "No route is available because scenario closures separate the locations.",
    "message": "No path from DL01 to DL15.",
}
```

The display member should check `status` before drawing a path.

---

# Part A — Algorithm Member Guide

## 6. Load and prepare one scenario

Install the core packages:

```bash
pip install pandas networkx
```

Use a loader like this:

```python
from pathlib import Path

import networkx as nx
import pandas as pd

DATA_DIR = Path("data")


def parse_bool(series: pd.Series) -> pd.Series:
    """Convert bool-like CSV values safely."""
    return (
        series.astype(str)
        .str.strip()
        .str.lower()
        .isin({"true", "1", "yes"})
    )


def load_scenario(scenario_id: str):
    nodes = pd.read_csv(DATA_DIR / "nodes_snapped.csv")
    edges = pd.read_csv(DATA_DIR / "edges.csv")
    conditions = pd.read_csv(DATA_DIR / "edge_conditions.csv")

    scenario = conditions.loc[
        conditions["scenario_id"] == scenario_id
    ].copy()

    if scenario.empty:
        raise ValueError(f"Unknown scenario_id: {scenario_id}")

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
        validate="one_to_one",
        suffixes=("", "_condition"),
    )

    prepared["effective_congestion"] = prepared[
        "scenario_congestion_level"
    ].fillna(prepared["congestion_level"])

    prepared["time_multiplier"] = prepared[
        "time_multiplier"
    ].fillna(1.0)

    prepared["rain_risk"] = prepared["rain_risk"].fillna(0)
    prepared["fog_risk"] = prepared["fog_risk"].fillna(0)
    prepared["construction_penalty"] = prepared[
        "construction_penalty"
    ].fillna(0)

    base_closed = parse_bool(prepared["closed"])
    scenario_closed = parse_bool(
        prepared["scenario_closed"].fillna(False)
    )
    prepared["effective_closed"] = base_closed | scenario_closed

    prepared = prepared.loc[~prepared["effective_closed"]].copy()

    prepared["adjusted_time_min"] = (
        prepared["base_time_min"]
        * prepared["time_multiplier"]
    )

    prepared["total_risk"] = (
        prepared["risk_score"]
        + prepared["rain_risk"]
        + prepared["fog_risk"]
        + prepared["construction_penalty"]
    )

    return nodes, prepared
```

Important behavior:

- A closed edge must be removed before search.
- Scenario conditions override base congestion and closure values.
- Missing scenario values fall back to the base edge data.
- Use `validate="one_to_one"` to catch duplicate condition rows for one scenario and edge.

## 7. Calculate optimization weights

A simple balanced cost can be:

```text
cost = 0.20 × normalized distance
     + 0.50 × normalized adjusted time
     + 0.15 × normalized congestion
     + 0.15 × normalized risk
```

Implementation:

```python
def min_max(series: pd.Series) -> pd.Series:
    minimum = series.min()
    maximum = series.max()
    if maximum == minimum:
        return pd.Series(0.0, index=series.index)
    return (series - minimum) / (maximum - minimum)


def add_costs(edges: pd.DataFrame, profile: str) -> pd.DataFrame:
    result = edges.copy()

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
        raise ValueError(f"Unknown profile: {profile}")

    alpha, beta, gamma, delta = profiles[profile]
    result["route_cost"] = (
        alpha * result["distance_norm"]
        + beta * result["time_norm"]
        + gamma * result["congestion_norm"]
        + delta * result["risk_norm"]
    )

    return result
```

All edge weights must remain nonnegative for UCS, Dijkstra, and the provided A* design.

## 8. Build the directed graph

```python
def build_graph(nodes: pd.DataFrame, edges: pd.DataFrame) -> nx.DiGraph:
    graph = nx.DiGraph()

    for node in nodes.itertuples(index=False):
        graph.add_node(
            node.node_id,
            name_vi=node.name_vi,
            name_en=getattr(node, "name_en", None),
            category=node.category,
            latitude=float(node.latitude),
            longitude=float(node.longitude),
        )

    for edge in edges.itertuples(index=False):
        graph.add_edge(
            edge.from_node,
            edge.to_node,
            edge_id=edge.edge_id,
            distance_km=float(edge.distance_km),
            base_time_min=float(edge.base_time_min),
            adjusted_time_min=float(edge.adjusted_time_min),
            congestion_level=float(edge.effective_congestion),
            risk=float(edge.total_risk),
            route_cost=float(edge.route_cost),
            road_type=edge.road_type,
        )

    return graph
```

Use `nx.DiGraph`, not `nx.Graph`, because every dataset edge is directed.

## 9. Algorithm behavior

| Algorithm | Weight used | Guarantee in this project |
|---|---|---|
| BFS | No weight | Fewest simplified edges, not shortest kilometers |
| DFS | No weight | Finds a route when implemented correctly; no quality guarantee |
| UCS | `route_cost` | Lowest nonnegative route cost |
| Dijkstra | `distance_km`, `adjusted_time_min`, or `route_cost` | Lowest selected nonnegative weight |
| A* | Usually `adjusted_time_min` plus admissible time heuristic | Optimal when the heuristic does not overestimate |
| Greedy Best-First | Heuristic only | Fast in some cases; no optimality guarantee |
| Nearest Neighbor | Pairwise route cost | Approximate multi-location visiting order |

For the lab demonstration, implement BFS, DFS, UCS, and A* explicitly enough to record `visited_order` and preferably frontier changes. A one-line NetworkX call may find a route but will not provide all required visualization data.

## 10. Return path edges from path nodes

The GUI needs `edge_id` values to highlight exact GeoJSON lines.

```python
def get_path_edges(graph: nx.DiGraph, path_nodes: list[str]) -> list[str]:
    return [
        graph[source][target]["edge_id"]
        for source, target in zip(path_nodes, path_nodes[1:])
    ]
```

## 11. Calculate route metrics

```python
def summarize_path(graph: nx.DiGraph, path_nodes: list[str]) -> dict:
    segments = []

    for source, target in zip(path_nodes, path_nodes[1:]):
        data = graph[source][target]
        segments.append(
            {
                "edge_id": data["edge_id"],
                "from_node": source,
                "to_node": target,
                "distance_km": data["distance_km"],
                "adjusted_time_min": data["adjusted_time_min"],
                "congestion_level": data["congestion_level"],
                "risk": data["risk"],
                "route_cost": data["route_cost"],
            }
        )

    return {
        "segments": segments,
        "total_distance_km": round(
            sum(item["distance_km"] for item in segments), 3
        ),
        "total_time_min": round(
            sum(item["adjusted_time_min"] for item in segments), 2
        ),
        "total_cost": round(
            sum(item["route_cost"] for item in segments), 4
        ),
    }
```

## 12. A* heuristic

For time optimization, use straight-line time with an optimistic maximum speed:

```python
from math import asin, cos, radians, sin, sqrt


def haversine_km(lat1, lon1, lat2, lon2):
    radius_km = 6371.0
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    value = (
        sin(d_lat / 2) ** 2
        + cos(radians(lat1))
        * cos(radians(lat2))
        * sin(d_lon / 2) ** 2
    )
    return 2 * radius_km * asin(sqrt(value))


def make_time_heuristic(graph: nx.DiGraph, maximum_speed_kph: float = 60.0):
    def heuristic(current: str, goal: str) -> float:
        current_data = graph.nodes[current]
        goal_data = graph.nodes[goal]
        direct_km = haversine_km(
            current_data["latitude"],
            current_data["longitude"],
            goal_data["latitude"],
            goal_data["longitude"],
        )
        return direct_km / maximum_speed_kph * 60.0

    return heuristic
```

Do not add uncertain congestion or rain penalties to the heuristic unless the value is guaranteed to be a lower bound.

## 13. Algorithm service boundary

Expose one function to the GUI:

```python
def solve_route(
    start_node: str,
    goal_node: str,
    algorithm: str,
    scenario_id: str,
    optimization: str,
) -> dict:
    """Return the standard result contract described in this README."""
    ...
```

The GUI should not import internal BFS queues, DFS stacks, or A* priority queues directly.

---

# Part B — Display/GUI Member Guide

## 14. What the display member receives

The display member needs:

1. `nodes_snapped.geojson` for markers.
2. `edges.geojson` for route lines.
3. The algorithm's standard result object.

The display member should **not** infer a route from coordinates. Use `result["path_edges"]` to select exact edge geometry.

## 15. Load display data

For a Python/Folium or Flask interface:

```bash
pip install geopandas folium
```

```python
from pathlib import Path

import geopandas as gpd

DATA_DIR = Path("data")

nodes_geo = gpd.read_file(DATA_DIR / "nodes_snapped.geojson")
edges_geo = gpd.read_file(DATA_DIR / "edges.geojson")

# Keep IDs as strings.
nodes_geo["node_id"] = nodes_geo["node_id"].astype(str)
edges_geo["edge_id"] = edges_geo["edge_id"].astype(str)
```

GeoJSON uses longitude/latitude coordinates. Mapping libraries usually expect marker inputs in `[latitude, longitude]` order.

## 16. Populate location selectors

```python
location_options = [
    {
        "value": row.node_id,
        "label": f"{row.name_vi} ({row.node_id})",
    }
    for row in nodes_geo.itertuples(index=False)
]
```

Store the selected `value` (`DL01`), not the label.

Useful filters:

- Category
- Vietnamese/English display name
- Opening-hours availability
- Start, destination, and optional intermediate locations

## 17. Highlight the final route

```python
def selected_route_geojson(result: dict, edges_geo: gpd.GeoDataFrame) -> str:
    edge_ids = set(result.get("path_edges", []))
    selected = edges_geo.loc[
        edges_geo["edge_id"].isin(edge_ids)
    ].copy()
    return selected.to_json()
```

Preserve route order separately from geometry filtering. A GeoDataFrame filter does not guarantee that rows remain in path order.

```python
edge_lookup = edges_geo.set_index("edge_id")
ordered_geometries = [
    edge_lookup.loc[edge_id].geometry
    for edge_id in result["path_edges"]
]
```

## 18. Show search animation

Recommended visual states:

| State | Meaning |
|---|---|
| Unvisited node | Normal marker |
| Frontier node | Currently waiting to be expanded |
| Visited node | Already expanded |
| Current node | Node being processed now |
| Final path | Selected route after completion |
| Closed edge | Not available in the scenario |
| High-congestion edge | Optional warning visualization |

For simple animation, use `visited_order`:

```python
for node_id in result["visited_order"]:
    highlight_visited(node_id)
    wait(animation_delay_ms)
```

For a more accurate demonstration, ask the algorithm member to return `frontier_steps`:

```python
frontier_steps = [
    {
        "current": "DL01",
        "frontier": ["DL02", "DL04"],
        "visited": ["DL01"],
    },
    {
        "current": "DL02",
        "frontier": ["DL04", "DL07"],
        "visited": ["DL01", "DL02"],
    },
]
```

## 19. Display route metrics

At minimum show:

```text
Algorithm
Scenario
Optimization criterion
Path by location name
Total distance
Estimated travel time
Total route cost
Number of explored nodes
Processing time
High-congestion or risky segments
Optimality guarantee or approximation note
```

Convert node IDs to names:

```python
name_lookup = nodes_geo.set_index("node_id")["name_vi"].to_dict()

path_label = " → ".join(
    name_lookup.get(node_id, node_id)
    for node_id in result["path_nodes"]
)
```

## 20. Display an explanation

A useful explanation can combine the algorithm result and segment data:

```text
The route A → C → F was selected because it has the lowest balanced cost
under the weekend-busy scenario. It is 1.2 km longer than the shortest-distance
alternative but avoids two congestion-level-5 segments and saves an estimated
8.4 minutes. A* guarantees the fastest route here because the time heuristic is
admissible and all travel-time weights are nonnegative.
```

The algorithm member should generate factual route comparisons. The display member should format them, not invent them.

## 21. Basic Folium example

```python
import folium


def create_map(nodes_geo, edges_geo, result=None):
    route_map = folium.Map(
        location=[
            float(nodes_geo.geometry.y.mean()),
            float(nodes_geo.geometry.x.mean()),
        ],
        zoom_start=12,
    )

    # Background simplified network.
    folium.GeoJson(
        edges_geo.to_json(),
        name="Available routes",
        style_function=lambda _: {
            "weight": 2,
            "opacity": 0.35,
        },
    ).add_to(route_map)

    for row in nodes_geo.itertuples(index=False):
        folium.Marker(
            location=[row.geometry.y, row.geometry.x],
            tooltip=f"{row.node_id}: {row.name_vi}",
            popup=f"Category: {row.category}",
        ).add_to(route_map)

    if result and result.get("status") == "success":
        selected = edges_geo.loc[
            edges_geo["edge_id"].isin(result["path_edges"])
        ]
        folium.GeoJson(
            selected.to_json(),
            name="Selected route",
            style_function=lambda _: {
                "weight": 7,
                "opacity": 1.0,
            },
        ).add_to(route_map)

    folium.LayerControl().add_to(route_map)
    return route_map
```

The team can later assign colors in the GUI design. The important integration point is filtering by `edge_id`.

---

# Part C — Team Integration Workflow

## 22. Recommended program flow

```text
1. GUI loads node names and map geometry.
2. User chooses start, goal, scenario, algorithm, and optimization profile.
3. GUI validates that start and goal are different.
4. GUI calls solve_route(...).
5. Algorithm loader applies the selected scenario.
6. Closed edges are removed.
7. Edge costs are calculated.
8. Selected search algorithm runs.
9. Algorithm returns the standard result object.
10. GUI animates visited/frontier nodes.
11. GUI highlights result.path_edges from edges.geojson.
12. GUI displays metrics and explanation.
```

## 23. Minimum integration test

Use one fixed request before connecting the full UI:

```python
result = solve_route(
    start_node="DL01",
    goal_node="DL15",
    algorithm="astar",
    scenario_id="S0",
    optimization="fastest",
)

assert result["status"] == "success"
assert result["path_nodes"][0] == "DL01"
assert result["path_nodes"][-1] == "DL15"
assert len(result["path_edges"]) == len(result["path_nodes"]) - 1
```

Then verify that every returned edge exists in the display file:

```python
available_edge_ids = set(edges_geo["edge_id"])
assert set(result["path_edges"]).issubset(available_edge_ids)
```

## 24. Dataset checks before coding

```python
import networkx as nx
import pandas as pd

nodes = pd.read_csv("data/nodes_snapped.csv")
edges = pd.read_csv("data/edges.csv")
conditions = pd.read_csv("data/edge_conditions.csv")

assert nodes["node_id"].is_unique
assert edges["edge_id"].is_unique
assert edges[["from_node", "to_node"]].notna().all().all()
assert set(edges["from_node"]).issubset(set(nodes["node_id"]))
assert set(edges["to_node"]).issubset(set(nodes["node_id"]))
assert set(conditions["edge_id"]).issubset(set(edges["edge_id"]))

graph = nx.from_pandas_edgelist(
    edges,
    source="from_node",
    target="to_node",
    create_using=nx.DiGraph,
)
graph.add_nodes_from(nodes["node_id"])

print("Strongly connected:", nx.is_strongly_connected(graph))
```

The normal base graph should be strongly connected. A particular scenario may become disconnected after road closures; the program must handle `no_path` cleanly.

---

## 25. Common problems

### The selected line does not appear on the map

Check that:

- The algorithm returns `edge_id`, not only node IDs.
- `edge_id` is treated as a string in both files.
- The UI reads `edges.geojson`, not `edges.csv`, for geometry.
- The GeoJSON layer is visible and map bounds include the route.

### The path is drawn in the wrong order

GeoJSON filtering does not preserve route order. Use `result["path_edges"]` as the ordered list.

### BFS gives an unexpected “shortest” path

BFS minimizes the number of simplified graph edges. It does not minimize kilometers, minutes, congestion, or weighted cost.

### Every scenario returns the same path

The condition template probably applies nearly identical multipliers to every edge. Edit individual edge conditions so central, hill, rain-sensitive, fog-sensitive, or construction roads receive different values.

### A scenario has no path

This can be a valid result if closed edges disconnect the graph. Return `status="no_path"`; do not crash the UI.

### Vietnamese text looks corrupted in Excel

The CSV files are written with UTF-8 BOM. Import them as UTF-8 rather than changing or removing accents.

### A marker is far from its road route

Check `snap_distance_m`. A large value means the tourist point is far from the retained drivable road network. The dataset member should review the POI or create an access connector.

### The GUI and algorithm disagree about names

Use `node_id` as the contract. Names are presentation fields only.

---

## 26. Responsibility checklist

### Algorithm member

- [ ] Load `nodes_snapped.csv`, `edges.csv`, and `edge_conditions.csv`.
- [ ] Build a directed graph.
- [ ] Remove closed edges for the selected scenario.
- [ ] Calculate adjusted time, risk, and route cost.
- [ ] Implement BFS, DFS, UCS, and A* with visited-order tracking.
- [ ] Return ordered `path_nodes` and `path_edges`.
- [ ] Return explored-node count, time, distance, cost, and processing time.
- [ ] Return an explanation and optimality note.
- [ ] Handle invalid nodes and no-path cases.

### Display/GUI member

- [ ] Load `nodes_snapped.geojson` and `edges.geojson` once.
- [ ] Build selectors using `node_id` values and readable labels.
- [ ] Send a valid request to `solve_route`.
- [ ] Animate visited/frontier states.
- [ ] Highlight final geometry using ordered `path_edges`.
- [ ] Display route names, metrics, scenario, and explanation.
- [ ] Show readable errors instead of crashing.
- [ ] Support start/destination and optional intermediate selections.

### Both members

- [ ] Agree on the request and result contracts before implementation.
- [ ] Never change `node_id` or `edge_id` independently.
- [ ] Use the same copy/version of all data files.
- [ ] Test at least one normal, congested, rainy, foggy, and road-closure case.
- [ ] Record dataset and cost assumptions in the technical report.

---

## 27. Version-control recommendation

Keep generated datasets versioned together:

```text
data/v1/
├── nodes_snapped.csv
├── nodes_snapped.geojson
├── edges.csv
├── edges.geojson
└── edge_conditions.csv
```

When any node or edge is regenerated, replace the CSV and GeoJSON files together. Do not combine `edges.csv` from one generation with `edges.geojson` from another because their `edge_id` assignments may differ.

A useful commit message is:

```text
Data v1: 25 Da Lat locations, connected directed graph, five scenarios
```

---

## 28. Final integration rule

The most important shared interface is:

```text
GUI request
    ↓
solve_route(start ID, goal ID, algorithm, scenario, profile)
    ↓
standard result containing path_nodes + path_edges + metrics
    ↓
GUI filters edges.geojson by path_edges and displays the result
```

Using this separation lets the algorithm member change BFS/A*/cost logic without rewriting the map, and lets the display member redesign the interface without changing path computation.
