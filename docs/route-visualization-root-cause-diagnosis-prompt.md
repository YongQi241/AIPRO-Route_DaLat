# Prompt: Chẩn đoán nguyên nhân đường đi hiển thị sai trên map (không sửa code)

## Vai trò

Bạn là một Senior Full-stack Debugging Engineer có kinh nghiệm với:

- Python route-search algorithms.
- Directed graph và NetworkX.
- React 19, Vite và Zustand.
- SVG graph visualization.
- GeoJSON `Point`, `LineString` và `MultiLineString`.
- Search animation và layered rendering.

Bạn đang làm việc trong project:

```text
C:\Users\Dell\projectdalat\AIPRO-Route_DaLat
```

Branch cần kiểm tra:

```text
frontend
```

## Nhiệm vụ duy nhất

Hãy **tìm và chứng minh nguyên nhân gốc** khiến đường đi được highlight trên bản đồ/graph hiển thị sai, lệch node, nối nhầm node, chồng chéo bất thường hoặc không khớp với tuyến đường backend trả về.

Phải xác định lỗi thuộc một hoặc nhiều nhóm sau:

1. Thuật toán backend trả sai `path_nodes`.
2. Backend ghép sai `path_edges` với `path_nodes`.
3. API làm thay đổi hoặc làm mất thứ tự dữ liệu.
4. Dataset CSV và GeoJSON không đồng nhất.
5. Frontend chọn sai edge ID.
6. Frontend project tọa độ hoặc tạo SVG path sai.
7. Map layout và Graph layout sử dụng hai hệ tọa độ không nhất quán.
8. Progressive final route, active search branch hoặc animation giữ state cũ.
9. Nhiều SVG layer cùng highlight đúng dữ liệu nhưng style khiến người dùng hiểu nhầm là một tuyến sai.
10. Một nguyên nhân khác có bằng chứng từ source/runtime.

## Quy tắc tuyệt đối

- Đây là nhiệm vụ **chỉ chẩn đoán**.
- Không sửa bất kỳ file nào.
- Không dùng `apply_patch`.
- Không chạy formatter tự động.
- Không commit, push, merge, rebase hoặc reset.
- Không thay đổi branch.
- Không tự tạo fixture mới trong repository.
- Không sửa thuật toán để che lỗi hiển thị.
- Không sửa frontend để che result backend sai.
- Không kết luận dựa trên cảm giác hoặc chỉ nhìn ảnh.
- Mọi kết luận phải có bằng chứng từ source, response, dataset hoặc phép đối chiếu có thể lặp lại.
- Được phép chạy các lệnh read-only, backend smoke test và frontend build nếu chúng không sửa source.
- Nếu một lệnh có thể tạo cache/build output, phải nói rõ trước; ưu tiên lệnh không tạo file.
- Giữ nguyên hai file local chưa commit nếu chúng vẫn tồn tại:

```text
docs/AI-CONTEXT.md
docs/frontend-zero-to-understanding-tutor-prompt.md
```

## Hiện tượng cần điều tra

Trên giao diện SVG, các đường highlight có dấu hiệu:

- Đi qua hoặc dừng lệch khỏi tâm node.
- Nối tới node không giống tuyến đang được mô tả.
- Có nhiều màu highlight chồng lên nhau.
- Các đoạn active search branch và final route khó phân biệt.
- Trong Graph mode, đường có thể không bám đúng vị trí node sau khi topology layout di chuyển node.

Ảnh người dùng cung cấp có các node như:

```text
DL01, DL03, DL04, DL05, DL06, DL10, DL15,
DL18, DL21, DL22, DL23
```

Không được suy ra start/goal/algorithm chỉ từ ảnh. Hãy lấy request thực tế từ source/runtime/Network response nếu có. Nếu không có request cụ thể, dùng case chuẩn dưới đây làm baseline và ghi rõ đó chỉ là baseline:

```json
{
  "algorithm": "astar",
  "start_node": "DL01",
  "goal_node": "DL09",
  "visit_nodes": [],
  "scenario_id": "S0",
  "optimization": "balanced"
}
```

## Bối cảnh kiến trúc

Luồng hiện tại:

```text
React form
  → POST /api/routes/solve
  → Vite proxy
  → backend/server.py
  → algorithms/solver.py
  → algorithm implementation
  → standard result JSON
  → Zustand routeResult/simulation
  → GraphWorkspace
  → SVG layers
```

Frontend không tự chạy BFS, DFS, UCS, Dijkstra, A\* hoặc các thuật toán khác. Nó chỉ replay result đã nhận.

Ứng dụng có hai chế độ:

- **Map mode:** dùng tọa độ địa lý và road geometry thật từ GeoJSON.
- **Graph mode:** dùng topology/force-directed layout để đặt lại vị trí node và edge.

Các layer có thể cùng xuất hiện:

```text
RoadNetworkLayer
SearchTraversalLayer
FinalRouteLayer
SearchAnimationLayer / GraphNodeLayer
```

## File bắt buộc phải đọc

### Tài liệu và cấu hình

```text
README.md
package.json
vite.config.js
requirements.txt
data/README.md
```

### Backend/API

```text
backend/server.py
algorithms/__init__.py
algorithms/solver.py
algorithms/common.py
algorithms/graph_loader.py
```

Đọc implementation của thuật toán tương ứng với request tái hiện lỗi, ví dụ:

```text
algorithms/bfs.py
algorithms/dfs.py
algorithms/ucs.py
algorithms/dijkstra.py
algorithms/astar.py
algorithms/greedy_best_first.py
algorithms/hill_climbing.py
algorithms/nearest_neighbor.py
algorithms/brute_force_tsp.py
```

Không cần kết luận mọi thuật toán đều sai chỉ vì một thuật toán có lỗi. Phải xác định phạm vi ảnh hưởng.

### Frontend request/state

```text
src/App.jsx
src/services/routeRequest.js
src/services/routeService.js
src/hooks/useRouteSolver.js
src/store/useAppStore.js
```

### Frontend visualization

```text
src/components/graph/GraphWorkspace.jsx
src/components/graph/graphGeometry.js
src/components/graph/topologyLayout.js
src/components/graph/RoadNetworkLayer.jsx
src/components/graph/GraphNodeLayer.jsx
src/components/graph/SearchAnimationLayer.jsx
src/components/graph/SearchTraversalLayer.jsx
src/components/graph/FinalRouteLayer.jsx
src/components/graph/searchTimeline.js
```

Đọc cả CSS của các layer để xác định màu, stroke width, glow, opacity và thứ tự thị giác:

```text
src/components/graph/GraphWorkspace.css
src/components/graph/RoadNetworkLayer.css
src/components/graph/GraphNodeLayer.css
src/components/graph/SearchTraversalLayer.css
src/components/graph/FinalRouteLayer.css
```

### Dataset/result

```text
data/generated_routes_connected/nodes_snapped.csv
data/generated_routes_connected/edges.csv
data/generated_routes_connected/edge_conditions.csv
data/generated_routes_connected/nodes_snapped.geojson
data/generated_routes_connected/edges.geojson
data/mock-result.json
```

## Quy trình chẩn đoán bắt buộc

### Bước 1 — Bảo toàn trạng thái

Chạy read-only:

```powershell
git status --short --branch
git log -1 --oneline --decorate
```

Ghi nhận branch, commit và các file chưa commit. Không thay đổi chúng.

### Bước 2 — Tái hiện và ghi nhận request/result

Xác định request gây lỗi gồm:

```text
algorithm
start_node
goal_node
visit_nodes
scenario_id
optimization
layout mode: Map hoặc Graph
simulation.currentStep
```

Lấy full response JSON từ backend hoặc từ Network tab. Không chỉ nhìn UI.

Nếu không tái hiện được đúng ảnh, phải nói rõ thiếu thông tin nào. Vẫn có thể tiếp tục bằng baseline nhưng không được tuyên bố baseline chính là lỗi trong ảnh.

### Bước 3 — Kiểm tra backend result invariants

Với result `status: "success"`, kiểm tra:

```text
path_edges.length === path_nodes.length - 1
```

Với mỗi index `i`:

```text
path_edges[i] phải tồn tại trong edges.csv và edges.geojson
edge.from_node phải bằng path_nodes[i]
edge.to_node phải bằng path_nodes[i + 1]
```

Kiểm tra thêm:

- `path_nodes[0]` đúng start.
- Node cuối đúng goal hoặc đúng multi-location semantics.
- Không có edge bị đảo chiều.
- Không có edge ID duplicate bất thường nếu algorithm không chủ ý tạo cycle.
- `segments` cùng thứ tự và cùng `edge_id` với `path_edges`.
- Tổng metrics có khớp segments trong sai số hợp lý.
- Closed edge của scenario không xuất hiện trong final path.
- `visited_order` và `frontier_steps` là trace search, không bị nhầm với final path.

Phân biệt hai câu hỏi:

1. Tuyến đường có hợp lệ theo directed graph không?
2. Tuyến đường có tối ưu đúng guarantee của thuật toán không?

Một tuyến hợp lệ nhưng không tối ưu không tự động là lỗi hiển thị.

### Bước 4 — So sánh solver trực tiếp với HTTP API

Chạy cùng request qua:

1. `algorithms.solve(...)` hoặc boundary phù hợp.
2. `backend.server.calculate_route(...)`.
3. HTTP `POST /api/routes/solve` nếu backend đang chạy.

So sánh ít nhất:

```text
status
path_nodes
path_edges
segments
scenario_id
optimization
```

Nếu solver đúng nhưng HTTP response khác, lỗi nằm ở API/serialization/validation boundary.

Nếu hai kết quả giống nhau, tiếp tục kiểm tra frontend.

### Bước 5 — Kiểm tra CSV và GeoJSON đồng nhất

Với mọi edge trong `path_edges` và active branch:

- So sánh `edge_id`, `from_node`, `to_node` giữa `edges.csv` và `edges.geojson`.
- Kiểm tra node IDs tồn tại trong nodes CSV và nodes GeoJSON.
- Kiểm tra GeoJSON geometry type hợp lệ.
- Ở Map mode, kiểm tra đầu/cuối road geometry có hợp lý với node coordinates; chỉ dùng việc này để phát hiện dataset/geometry mismatch, không dùng tọa độ để thay thế edge ID.
- Ghi rõ nếu snapping khiến geometry không chạm chính xác POI coordinate nhưng vẫn đúng road edge theo dataset.

### Bước 6 — Kiểm tra frontend request và store

Theo dõi request từ:

```text
RouteSelectionControls/App
→ createRouteRequest
→ useRouteSolver
→ routeService
→ backend
```

Kiểm tra:

- UI algorithm ID có đúng backend ID.
- Start/goal/visit nodes có bị đổi thứ tự.
- Multi-location có tự thêm goal đúng quy ước.
- Scenario và optimization có bị đổi alias.
- `setRouteResult` có giữ nguyên `path_nodes/path_edges`.
- Route mới có reset timeline/highlight cũ không.
- Failure result có vô tình giữ final route cũ không.

### Bước 7 — Kiểm tra Map mode

Theo dõi chính xác cách `GraphWorkspace` tạo hàm `project` và truyền dữ liệu cho từng layer.

Kiểm tra:

- Road nền, active branch và final route có dùng cùng một hệ project không.
- `createDrawableEdges` có giữ đúng `edge_id`.
- `LineString` và `MultiLineString` có được chuyển thành SVG path đúng thứ tự.
- Node circle và road path có cùng bounds/padding/transform.
- Pan/zoom transform có áp dụng chung cho node và edge layers.
- SVG layer nào có transform riêng gây lệch.

### Bước 8 — Kiểm tra Graph mode

Đây là phần cần ưu tiên vì Graph mode thay đổi vị trí node.

Kiểm tra:

- `topologyLayout.js` tạo một vị trí duy nhất cho mỗi `node_id`.
- RoadNetworkLayer, SearchTraversalLayer, FinalRouteLayer và GraphNodeLayer có dùng cùng topology positions.
- Edge path trong Graph mode có bắt đầu/kết thúc đúng tâm node `from_node/to_node`.
- Opposing directed edges, self-loop và curved edges có dùng đúng direction.
- Có layer nào vẫn dùng original GeoJSON road coordinates trong khi node đã dùng topology coordinates không.
- Khi chuyển Map ↔ Graph, cached `useMemo` data có được tính lại đúng dependency không.
- Resize, reset view, zoom hoặc pan có làm stale geometry không.

Nếu path ID đúng nhưng SVG endpoint không trùng node center trong Graph mode, đây nhiều khả năng là frontend layout/rendering issue, không phải thuật toán.

### Bước 9 — Kiểm tra timeline và layer overlap

Tại frame đang thấy lỗi, liệt kê riêng:

```text
current node
frontier nodes
visited nodes
active search branch edge IDs
confirmed final-route edge IDs
full final path edge IDs
```

Sau đó đối chiếu màu CSS:

- Road nền.
- Active search branch.
- Progressive/final route.
- Warning route.
- Current/frontier/visited nodes.

Xác định:

- Có thật sự chọn sai edge không?
- Hay active branch và final route đang cùng vẽ trên hai tuyến khác nhau theo đúng semantics?
- Có stale edge ID từ frame/result trước không?
- Layer order hoặc stroke width có khiến một đường trông như nối sang node khác không?

Không gọi layer overlap là bug nếu dữ liệu và semantics đúng; khi đó kết luận là “visual ambiguity” và đưa bằng chứng.

### Bước 10 — So sánh nhiều case có kiểm soát

Tối thiểu kiểm tra:

1. Một single-route baseline như A\* `DL01 → DL09`, `S0`, `balanced`.
2. Một thuật toán unweighted như BFS hoặc DFS cùng endpoints.
3. Một weighted algorithm như Dijkstra/UCS/A\*.
4. Map mode và Graph mode cho cùng một response.
5. Step đầu, step giữa và completed step.

Chỉ kiểm tra multi-location nếu lỗi có liên quan intermediate locations hoặc thuật toán multi-location.

## Ma trận kết luận bắt buộc

Trong báo cáo, điền bảng sau bằng bằng chứng cụ thể:

| Hạng mục | Pass/Fail/Unknown | Bằng chứng |
|---|---|---|
| Backend `path_nodes` hợp lệ | | |
| Backend `path_edges` đúng thứ tự/hướng | | |
| API giữ nguyên solver result | | |
| CSV và GeoJSON đồng nhất | | |
| Frontend request đúng | | |
| Zustand không giữ result cũ | | |
| Map projection nhất quán | | |
| Graph topology layout nhất quán | | |
| Active branch edge IDs đúng | | |
| Progressive final-route IDs đúng | | |
| Layer màu/thứ tự không gây hiểu nhầm | | |

## Cách phân loại nguyên nhân

Chỉ kết luận **backend algorithm bug** nếu chứng minh được một trong các điều sau:

- Path dùng edge không tồn tại.
- Edge không nối hai path nodes liên tiếp.
- Edge sai hướng.
- Path vi phạm scenario closure.
- Kết quả vi phạm guarantee của thuật toán với cùng graph/weight và có phép đối chứng đáng tin cậy.

Chỉ kết luận **frontend rendering bug** nếu backend/API/dataset invariants pass nhưng:

- Frontend chọn edge ID khác response.
- Cùng edge ID nhưng layer dùng sai geometry/layout.
- Node và edge dùng hệ tọa độ khác nhau.
- State/timeline giữ edge cũ.
- SVG transform/layer composition làm endpoint lệch.

Kết luận **data bug** nếu CSV/GeoJSON không đồng nhất hoặc geometry không phù hợp với endpoint metadata.

Kết luận **visual ambiguity** nếu các layer đều đúng dữ liệu nhưng màu, stroke hoặc chồng lớp khiến người xem tưởng là một tuyến duy nhất.

Nếu chưa đủ bằng chứng, kết luận `Unknown` và nêu chính xác dữ liệu còn thiếu. Không đoán.

## Output bắt buộc

Trả về báo cáo bằng tiếng Việt theo format:

```markdown
# Kết luận ngắn

- Lỗi thuộc: Backend / API / Data / Frontend / Visual ambiguity / Chưa xác định
- Mức tin cậy: Cao / Trung bình / Thấp
- Phạm vi: thuật toán/layout/route/frame nào

## Request và response dùng để tái hiện

## Chuỗi path đã đối chiếu

| Index | Path node from | Edge ID | Edge metadata from→to | Path node to | Kết quả |
|---:|---|---|---|---|---|

## Ma trận kiểm tra

## Bằng chứng backend

## Bằng chứng dataset

## Bằng chứng frontend Map mode

## Bằng chứng frontend Graph mode

## Bằng chứng timeline/layer overlap

## Nguyên nhân gốc

Nêu file, function và dòng liên quan nếu xác định được.

## Các giả thuyết đã loại trừ

## Thông tin còn thiếu

## Hướng sửa đề xuất (chỉ mô tả, không thực hiện)

## Xác nhận không thay đổi source

Liệt kê `git status` trước và sau để chứng minh không có file nào bị sửa bởi quá trình chẩn đoán.
```

## Điều kiện hoàn thành

Chỉ hoàn thành khi:

- Có ít nhất một request/result cụ thể đã được đối chiếu.
- Mọi `path_edges` trong case đó được kiểm tra với directed endpoints.
- Đã phân biệt Map mode và Graph mode.
- Đã kiểm tra active branch khác progressive final route.
- Có kết luận kèm mức tin cậy và bằng chứng.
- Không có source file nào bị chỉnh sửa.

Hãy bắt đầu chẩn đoán read-only. Không sửa lỗi trong lượt này.
