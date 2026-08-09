# Route dataset

The application keeps source inputs and generated runtime files separate.

```text
data/
|-- nodes.geojson                 # Source tourist locations
|-- mock-result.json              # Development-only frontend fallback
|-- build_edges.py                # Rebuild the connected road dataset
|-- generate_edge_conditions.py   # Rebuild scenario conditions
`-- generated/
    |-- nodes_snapped.csv          # Backend node data
    |-- edges.csv                  # Backend directed edges
    |-- edge_conditions.csv        # Scenario-specific edge conditions
    |-- nodes_snapped.geojson      # Frontend node geometry
    `-- edges.geojson              # Frontend road geometry
```

## Runtime ownership

| Consumer | Files |
|---|---|
| Python routing engine | `nodes_snapped.csv`, `edges.csv`, `edge_conditions.csv` |
| React frontend | `nodes_snapped.geojson`, `edges.geojson` |
| Development fallback | `mock-result.json` |

Both application layers join data by stable `node_id` and `edge_id`. The
frontend uses the ordered `path_edges` returned by the backend; it does not
infer route segments from coordinates.

## Rebuild data

Run from the repository root:

```powershell
python data/build_edges.py
python data/generate_edge_conditions.py
```

`build_edges.py` reads `nodes.geojson` and regenerates the connected dataset.
It requires the geospatial dependencies used by the build workflow. The normal
application only requires the packages in `requirements.txt`.

Regenerated CSV and GeoJSON files must be committed together because their
`node_id` and `edge_id` assignments form one dataset version.

## Scenarios

`edge_conditions.csv` contains five scenario IDs:

| ID | Meaning |
|---|---|
| `S0` | Normal weekday |
| `S1` | Busy weekend |
| `S2` | Evening rush hour |
| `S3` | Heavy rain |
| `S4` | Dense fog |
