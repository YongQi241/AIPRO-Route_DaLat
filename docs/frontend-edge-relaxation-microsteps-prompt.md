# Task: Edge Relaxation Micro-Steps trên Frontend

## Vai trò và project

Bạn là Senior React Frontend Engineer chuyên React 19, Zustand, SVG, GeoJSON và visualization state machines.

```text
Project: C:\Users\Dell\projectdalat\AIPRO-Route_DaLat
Branch: frontend
```

## Mục tiêu

Thay đổi search animation để mô tả đúng một lần mở rộng node của A*/Dijkstra/UCS:

```text
1. Chọn current node.
2. Hiện tất cả directed edge đi ra từ current node dưới dạng candidate rays.
3. Lần lượt làm sáng cyan từng cạnh.
4. Minh họa phép relaxation đối với neighbor của cạnh đó.
5. Hiển thị outcome ADD, UPDATE, KEEP hoặc UNKNOWN.
6. Chỉ chuyển sang current node tiếp theo sau khi xét hết outgoing candidates.
```

Ví dụ khi current là DL02, UI phải lần lượt xét đủ:

```text
E002: DL02 → DL01
E011: DL02 → DL05
E013: DL02 → DL14
E015: DL02 → DL22
E017: DL02 → DL23
```

Không được chỉ làm sáng E017 rồi chuyển sang node khác.

## Phạm vi bắt buộc

Chỉ sửa frontend trong `src/`. Có thể thêm frontend-only tests.

Không sửa:

```text
backend/
algorithms/
advance_search/
data/
requirements.txt
```

Không được:

- Tự chạy lại A*, Dijkstra hoặc thuật toán khác trong frontend.
- Tự tính shortest path, `route_cost`, `g`, `h`, `f` từ dữ liệu giao thông.
- Thay đổi API contract hoặc final result.
- Suy cạnh từ tọa độ hoặc đảo chiều directed edge.
- Làm lộ `result.path_edges/path_nodes` trước completed.
- Làm hỏng Play/Pause/Previous/Next/Reset/Speed, Map/Graph, zoom hoặc pan.
- Commit, push hoặc merge.

## File phải đọc

```text
src/store/useAppStore.js
src/hooks/useRouteSolver.js
src/components/playback/PlaybackToolbar.jsx
src/components/graph/GraphWorkspace.jsx
src/components/graph/GraphNodeLayer.jsx
src/components/graph/SearchAnimationLayer.jsx
src/components/graph/SearchTraversalLayer.jsx
src/components/graph/SearchTraversalLayer.css
src/components/graph/FinalRouteLayer.jsx
src/components/graph/searchTimeline.js
src/components/graph/graphGeometry.js
src/components/graph/topologyLayout.js
src/components/panels/CurrentTaskPanel.jsx
src/components/panels/SearchLogPanel.jsx
data/mock-result.json
data/README.md
data/generated_routes_connected/edges.geojson
```

Chỉ đọc `data/`, không chỉnh sửa.

## Giới hạn dữ liệu và tính trung thực

Backend hiện trả `frame.current`, `frame.frontier`, `frame.visited`. Frontier item có thể là string hoặc object chứa `node`, `g_cost`, `h_cost`, `f_cost`, `priority`.

Backend chưa trả từng `considered_edge`. Vì vậy:

- Candidate edges được frontend dựng từ directed `edgeFeatures`.
- Outcome được suy ra từ frontier snapshot trước/sau expansion.
- Không bịa `tentative_g` hoặc score không có trong response.
- Khi không đủ bằng chứng, bắt buộc dùng `UNKNOWN`.
- UI có chú thích ngắn: `Inferred relaxation playback`.
- Final route luôn lấy chính xác từ `result.path_edges`.

## Action timeline

Tạo pure timeline builder tập trung, ví dụ:

```js
buildSearchActionTimeline(result, edgeFeatures)
```

Không rải logic trong component. Timeline gồm các action tuần tự:

```js
{
  actionIndex: 0,
  frameIndex: 0,
  type: 'expand' | 'consider-edge' | 'frame-complete',
  currentNodeId: 'DL02',
  candidateEdgeIds: ['E002', 'E011', 'E013', 'E015', 'E017'],
  activeEdgeId: 'E011',
  activeNeighborId: 'DL05',
  outcome: 'add' | 'update' | 'keep' | 'unknown' | null,
  oldValues: null,
  newValues: null,
  frontierNodeIds: [],
  visitedNodeIds: []
}
```

Tên field có thể khác, nhưng model phải thống nhất và kiểm thử độc lập.

## Chuẩn hóa trace

Tạo helper dùng chung để đọc frontier item ở hai dạng:

```js
'DL23'
```

và:

```js
{
  node: 'DL23',
  g_cost: 0.133388,
  h_cost: 0,
  f_cost: 0.133388,
  priority: 0.133388
}
```

Helper phải trả node ID và các numeric score có thật. Không để mỗi panel parse một kiểu.

## Candidate rays

Với mỗi current node:

1. Lọc `edgeFeatures` có `properties.from_node === currentNodeId`.
2. Giữ thứ tự edge xuất hiện để animation ổn định.
3. Dùng đúng `edge_id`, `from_node`, `to_node`.
4. Không dùng reverse edge hoặc coordinate proximity.
5. Không mutate GeoJSON.

Phải phân biệt:

```text
Candidate edges = directed outgoing edges của current.
Frontier = global priority queue sau expansion.
```

Không được coi frontier là adjacency list.

## Suy ra ADD/UPDATE/KEEP/UNKNOWN

Với frame `i`:

```text
afterFrontier = frontier của frame i
beforeFrontier = frontier của frame i - 1, bỏ current node
```

Frame đầu dùng trạng thái ban đầu chỉ chứa start/current.

- `ADD`: neighbor absent-before nhưng present-after.
- `UPDATE`: neighbor present-before và present-after, đồng thời `new_g < old_g`; nếu không có g thì có thể dùng f khi cả hai là số.
- `KEEP`: chỉ dùng khi snapshot đủ score để chứng minh giá trị không cải thiện.
- `UNKNOWN`: string-only trace, neighbor đã visited/closed, thiếu score hoặc bất kỳ trường hợp mơ hồ nào.

Không so sánh score dạng string. Không mặc định KEEP khi thiếu dữ liệu.

## Zustand và playback

Zustand tiếp tục là nguồn state duy nhất. `simulation.currentStep` có thể đổi thành action index hoặc bổ sung `currentAction`, nhưng tất cả consumer phải thống nhất.

- Next: tiến đúng một micro-action, không nhảy qua toàn bộ outgoing edges.
- Previous: quay lại đúng active edge/outcome trước.
- Play: chạy tuần tự mọi micro-action theo speed.
- Pause: giữ nguyên active micro-action.
- Reset: về đầu, xóa candidate/active highlights và final route.
- Completed: chỉ sau action cuối của goal frame.
- Replay: không giữ highlight của lần chạy trước.

## SVG semantics

### Candidate rays

Tất cả outgoing directed edges của current:

- Nét đứt, mảnh, opacity thấp.
- Title/aria: `Possible directed successor`.

### Active relaxation edge

Đúng một candidate edge:

- Cyan sáng, có animation theo hướng current → neighbor.
- Node đích có ring `being-evaluated` riêng.
- Không biến node thành frontier trước khi outcome được xác định.

### Outcome

- ADD: node mới xuất hiện trong frontier.
- UPDATE: node frontier có score được cải thiện.
- KEEP: frontier không đổi.
- UNKNOWN: hiển thị trace không đủ chi tiết.

Candidate, active edge, inferred branch và final route phải là state/layer tách biệt. Tránh render trùng đường ngoài chủ đích styling.

Map mode dùng road geometry; Graph mode dùng `displayEdgeFeatures`. Tất cả layer trong một mode phải cùng hệ tọa độ.

## Node và final-route states

- Current: cam + pulse.
- Frontier: vàng.
- Visited: xanh dương nhạt.
- Being evaluated: ring riêng.
- Unvisited: bình thường.
- Final: xanh lá, chỉ khi completed hoặc result thành công không có timeline.

Không khôi phục progressive final-route confirmation.

Trong idle/playing/paused, không hiển thị final route. Trong completed, ẩn candidate/active/inferred highlights rồi hiển thị full `result.path_edges/path_nodes`.

## Search Log và Current Task

Search log phải hiện micro-actions, ví dụ:

```text
Expand DL02
Consider E002: DL02 → DL01 — KEEP
Consider E011: DL02 → DL05 — KEEP
Consider E013: DL02 → DL14 — KEEP
Consider E015: DL02 → DL22 — KEEP
Consider E017: DL02 → DL23 — ADD
```

Nếu có score thật, hiện old/new. Nếu thiếu, hiện `outcome unknown from current trace`.

Current Task hiển thị current node, active edge, neighbor, outcome và action progress. Giữ nguyên bottom tabs.

## Case bắt buộc: A* DL01 → DL18

```json
{
  "algorithm": "astar",
  "start_node": "DL01",
  "goal_node": "DL18",
  "visit_nodes": [],
  "scenario_id": "S0",
  "optimization": "balanced"
}
```

Với balanced hiện tại: `weight=route_cost`, `h=0`, `f=g`, nên A* hoạt động như Dijkstra.

### DL01

Phải có micro-action cho E001, E003, E005, E007, E009.

### DL02

Phải lần lượt xét E002, E011, E013, E015, E017. Không chỉ sáng E017.

Expected khi trace đủ bằng chứng:

```text
E002 KEEP
E011 KEEP
E013 KEEP
E015 KEEP
E017 ADD
```

### DL22

Phải lần lượt xét neighbor DL01, DL02, DL05, DL06, DL21, DL23, DL25. DL21 là UPDATE nếu snapshots chứng minh score giảm.

### DL10

Phải xét DL04, DL15, DL18, DL19, DL21. E069 `DL10 → DL18` là ADD nếu trace chứng minh được.

### Completed

Chỉ lúc completed mới hiện:

```text
DL01 → DL22 → DL21 → DL10 → DL18
E009 → E104 → E074 → E069
```

## Tests bắt buộc

Tạo pure-function fixture nhỏ với A→B, A→C, B→C, B→D và kiểm tra:

1. Candidate actions giữ đúng directed edge order.
2. Next/Previous tiến và lùi từng edge.
3. ADD khi absent-before/present-after.
4. UPDATE khi numeric score giảm.
5. KEEP chỉ khi đủ dữ liệu.
6. String-only ambiguity trả UNKNOWN.
7. Không dùng reverse edge.
8. Reset xóa active edge.
9. Completed mới hiển thị final route.
10. Result không có timeline không crash.

Kiểm tra lại Play/Pause/Speed, node colors, bottom tabs, Search Log scroll, Map/Graph, wheel zoom, left-click pan, zoom buttons, route API, demo fallback và stale-result handling.

## Build và Git

Chạy:

```powershell
npm.cmd run build
git diff --check
git diff --name-only
git status --short
```

Fail nếu có file thay đổi trong backend, algorithms, advance_search hoặc data. Không stage, commit hoặc push.

## Báo cáo cuối

Nêu file sửa, action state machine, cách tạo candidates, cách suy outcome, behavior toolbar, kết quả DL01/DL02/DL22/DL10/completed, tests/build và giới hạn còn lại.

Phải ghi rõ:

> Candidate rays biểu thị các directed successor có thể được xem xét. Active cyan edge biểu thị phép relaxation đang được minh họa. Vì backend chưa trả considered-edge events, frontend suy ra micro-actions từ topology và frontier snapshots; mọi outcome thiếu bằng chứng phải được ghi là UNKNOWN.

Hãy đọc source, lập kế hoạch ngắn và thực hiện. Chỉ sửa frontend.
