# Prompt: Viết README cho Frontend và Backend API Integration

## Nhiệm vụ

Bạn đang làm việc trong repository `AIPRO-Route_DaLat` trên branch `frontend`.

Hãy đọc toàn bộ source hiện tại, sau đó viết lại file `README.md` ở thư mục gốc để giải thích đầy đủ kiến trúc frontend và cách Backend/Algorithm member tích hợp API.

Chỉ được chỉnh sửa:

```text
README.md
```

Không sửa source React, dataset, package, thuật toán hoặc backend.

## Công nghệ và nguyên tắc

- React 19, Vite và Zustand.
- Bản đồ/graph được render bằng SVG.
- Node và edge geometry được đọc từ GeoJSON.
- Frontend chỉ gửi request, nhận result và trực quan hóa.
- Frontend không chạy hoặc tự cài đặt BFS, DFS, UCS, Dijkstra hay A*.
- Không được mô tả Demo mode như một thuật toán thật.
- Không được mô tả animation hiện tại là streaming realtime. Đây là replay sau khi frontend đã nhận toàn bộ response.

## Các file bắt buộc phải đọc

```text
package.json
.env.example
data/README.md
data/mock-result.json

src/App.jsx
src/store/useAppStore.js
src/hooks/useGraphData.js
src/hooks/useRouteSolver.js
src/services/routeService.js

src/components/layout/AppShell.jsx
src/components/playback/PlaybackToolbar.jsx
src/components/route-selection/RouteSelectionControls.jsx
src/components/algorithm/AlgorithmSidebar.jsx

src/components/graph/GraphWorkspace.jsx
src/components/graph/RoadNetworkLayer.jsx
src/components/graph/GraphNodeLayer.jsx
src/components/graph/SearchAnimationLayer.jsx
src/components/graph/SearchTraversalLayer.jsx
src/components/graph/FinalRouteLayer.jsx
src/components/graph/searchTimeline.js

src/components/panels/BottomPanelTabs.jsx
src/components/panels/CurrentTaskPanel.jsx
src/components/panels/SearchLogPanel.jsx

src/components/results/RouteResultPanel.jsx
src/components/results/SegmentDetails.jsx
src/components/results/RouteExplanation.jsx
src/components/feedback/StatusMessage.jsx
```

Không mô tả component hoặc chức năng không tồn tại trong source.

## Ngôn ngữ và đối tượng đọc

- Viết chủ yếu bằng tiếng Việt.
- Giữ nguyên tên component, biến, endpoint và JSON field bằng tiếng Anh.
- Viết cho sinh viên, Frontend Developer và Backend Developer mới tham gia project.
- README phải tự đủ thông tin để Backend Developer có thể tạo API tương thích.

## Cấu trúc README bắt buộc

### 1. Tổng quan

Giải thích project là GUI trực quan hóa thuật toán tìm đường trên mạng lưới địa điểm Đà Lạt.

Phân định trách nhiệm:

```text
Backend/Algorithm member:
- Load directed graph và scenario.
- Chạy thuật toán.
- Ghi search trace.
- Tạo path, metrics, segments và explanation.

Frontend/Display member:
- Load GeoJSON để hiển thị.
- Thu thập lựa chọn của user.
- Gửi API request.
- Replay search trace.
- Hiển thị node, edge, log, path và metrics.
```

Nhấn mạnh frontend không tự tạo kết quả tìm đường.

### 2. Công nghệ

Tạo bảng:

| Công nghệ | Vai trò |
|---|---|
| React | Component UI |
| Vite | Dev server và production build |
| Zustand | Global state |
| SVG | Render graph và animation |
| GeoJSON | Node/edge geometry |
| Fetch API | Gọi backend |

### 3. Cấu trúc thư mục

Trình bày cây thư mục rút gọn và giải thích:

- `src/components`
- `src/hooks`
- `src/services`
- `src/store`
- `data/generated_routes_connected`
- `data/mock-result.json`

Không liệt kê `node_modules`, `dist`, cache hoặc file build tạm.

### 4. Kiến trúc và data flow

Giải thích luồng:

```text
User selection
    ↓
RouteSelectionControls
    ↓
Zustand store
    ↓
useRouteSolver
    ↓
routeService
    ↓
Backend API hoặc Demo fixture
    ↓
RouteResult
    ↓
Search animation + map layers + result panels
```

Có thể dùng một Mermaid diagram nhỏ nếu thực sự giúp dễ hiểu.

### 5. Component frontend

Tạo bảng:

| Component | Trách nhiệm | Dữ liệu sử dụng |
|---|---|---|

Giải thích ít nhất:

- `App`
- `AppShell`
- `PlaybackToolbar`
- `RouteSelectionControls`
- `AlgorithmSidebar`
- `GraphWorkspace`
- `RoadNetworkLayer`
- `GraphNodeLayer`
- `SearchAnimationLayer`
- `SearchTraversalLayer`
- `FinalRouteLayer`
- `BottomPanelTabs`
- `CurrentTaskPanel`
- `SearchLogPanel`
- `RouteResultPanel`
- `SegmentDetails`
- `RouteExplanation`
- `StatusMessage`

### 6. Zustand Global State

Giải thích:

```text
graphData
selectedAlgorithm
routeSelection
routeResult
requestState
simulation
```

Trong `simulation`, giải thích:

```text
status
speed
currentStep
```

Các status:

```text
idle
playing
paused
completed
```

Các action quan trọng:

- `play`
- `pause`
- `nextAction`
- `previousAction`
- `resetSimulation`
- `setSpeed`
- `setRouteResult`

### 7. Playback và manual stepping

Giải thích:

- Play tự động tăng step.
- Pause dừng timeline.
- Previous action quay lại một frame.
- Next action đi tới một frame.
- Reset trở về frame đầu.
- Speed điều chỉnh delay.
- Previous/Next chỉ duyệt dữ liệu backend đã trả về, không chạy thuật toán.
- Play sau Completed có hành vi replay từ đầu theo source hiện tại.

### 8. Search animation và node states

Frontend ưu tiên:

```text
frontier_steps
```

Nếu không có, fallback sang:

```text
visited_order
```

Giải thích các trạng thái:

| Trạng thái | Ý nghĩa |
|---|---|
| Unvisited | Chưa phát hiện |
| Frontier | Đang chờ mở rộng |
| Visited | Đã mở rộng |
| Current | Đang được xử lý |
| Confirmed | Thuộc prefix route đã xác nhận |
| Final | Thuộc route kết quả |

### 9. Active search branch

Giải thích `SearchTraversalLayer` và logic trong `searchTimeline.js`:

- Khi node xuất hiện lần đầu trong `frontier`, frontend ghi nhận `current` của frame là discovery parent.
- Khi node đó trở thành `current`, frontend highlight nhánh từ start đến node đang xét.
- Edge được tìm bằng cặp `from_node → to_node` trong GeoJSON và phải giữ đúng hướng.
- Frontend không đoán đường từ tọa độ.
- Active search branch dùng màu khác final route.

Ví dụ:

```text
Current DL02:
DL01 → DL02 được highlight.

Current DL19:
DL01 → DL06 → DL19 được highlight nếu đó là discovery branch.
```

Nêu yêu cầu quan trọng với backend:

- `frontier_steps` phải đúng thứ tự thời gian.
- `frontier` phải là snapshot sau khi mở rộng `current`.
- Node mới phải xuất hiện lần đầu trong đúng frame nó được phát hiện.
- Nếu chỉ trả `visited_order`, frontend không đủ dữ liệu để xác định discovery parent chính xác và không nên đoán cạnh.

### 10. Progressive final-route highlight

Giải thích frontend đối chiếu `current/visited` với ordered `path_nodes` và chỉ hiển thị prefix liên tục tương ứng trong `path_edges`.

Ví dụ:

```text
path_nodes: DL01 → DL06 → DL19 → DL09
path_edges: E005 → E041 → E064
```

| Current step | Final-route prefix |
|---|---|
| DL01 | Chưa có edge |
| DL06 | E005 |
| DL19 | E005, E041 |
| DL09 | E005, E041, E064 |

Node mới nhất được xác nhận được phóng to. Previous action phải gỡ node/edge tương ứng.

Ghi rõ các ID trên chỉ là fixture minh họa; logic không hard-code chúng.

## Backend API Integration

### 11. Backend cần cung cấp gì?

Backend expose một HTTP POST endpoint, ví dụ:

```text
POST /api/route
```

Backend có thể dùng FastAPI, Flask, Django, Node hoặc công nghệ khác, miễn đúng contract.

Backend chịu trách nhiệm:

1. Validate input.
2. Load directed graph.
3. Áp dụng scenario và loại closed edge.
4. Tính weight/cost.
5. Chạy thuật toán được chọn.
6. Ghi `visited_order` và `frontier_steps`.
7. Trả ordered `path_nodes` và `path_edges`.
8. Tính metrics và segments.
9. Tạo factual explanation.
10. Trả failure result thay vì làm frontend crash.

### 12. Request contract

Thêm JSON hợp lệ:

```json
{
  "start_node": "DL01",
  "goal_node": "DL09",
  "visit_nodes": [],
  "algorithm": "astar",
  "scenario_id": "S1",
  "optimization": "balanced"
}
```

Giải thích từng field bằng bảng.

Nêu rõ:

- Frontend gửi ID, không gửi tên địa điểm.
- `visit_nodes` luôn là array.
- Start và goal phải khác nhau.
- Graph là directed; backend không được tự đảo edge.

### 13. Success response

Cung cấp ví dụ JSON đầy đủ gồm:

```json
{
  "status": "success",
  "algorithm": "A*",
  "scenario_id": "S1",
  "optimization": "balanced",
  "start_node": "DL01",
  "goal_node": "DL09",
  "path_nodes": ["DL01", "DL06", "DL19", "DL09"],
  "path_edges": ["E005", "E041", "E064"],
  "visited_order": ["DL01", "DL02", "DL06", "DL19", "DL09"],
  "frontier_steps": [
    {
      "current": "DL01",
      "frontier": ["DL02", "DL06"],
      "visited": ["DL01"]
    }
  ],
  "metrics": {
    "total_distance_km": 39.429,
    "total_time_min": 63.04,
    "total_cost": 3.943,
    "explored_nodes": 9,
    "processing_time_ms": 1.82
  },
  "segments": [
    {
      "edge_id": "E005",
      "from_node": "DL01",
      "to_node": "DL06",
      "distance_km": 6.008,
      "adjusted_time_min": 9.1,
      "congestion_level": 1,
      "risk": 0
    }
  ],
  "explanation": "Factual explanation generated by the backend.",
  "optimality_note": "A* is optimal when the heuristic is admissible.",
  "message": "Route calculated successfully."
}
```

Giải thích invariants:

```text
path_nodes[0] == start_node
path_nodes[-1] == goal_node
path_edges.length == path_nodes.length - 1
segments phải tương ứng với path_edges
mọi node_id và edge_id phải tồn tại trong dataset
path_edges phải đúng thứ tự và đúng hướng
```

### 14. Failure response

Cung cấp ví dụ:

```json
{
  "status": "no_path",
  "algorithm": "A*",
  "scenario_id": "S5",
  "start_node": "DL01",
  "goal_node": "DL09",
  "path_nodes": [],
  "path_edges": [],
  "visited_order": [],
  "frontier_steps": [],
  "metrics": {},
  "segments": [],
  "explanation": "Không tìm thấy tuyến đường.",
  "message": "No path from DL01 to DL09."
}
```

Status hợp lệ:

```text
success
no_path
invalid_input
error
```

### 15. Quy ước frontier_steps

Giải thích kỹ frame:

```json
{
  "current": "DL01",
  "frontier": ["DL02", "DL05", "DL06"],
  "visited": ["DL01"]
}
```

Quy ước:

- `current`: node vừa được lấy ra để mở rộng.
- `frontier`: toàn bộ frontier sau khi mở rộng current.
- `visited`: danh sách cumulative node đã mở rộng.
- ID luôn là string.
- Frame đúng thứ tự thời gian.
- Không gửi tên địa điểm thay ID.
- Hạn chế duplicate trong frontier.
- Node xuất hiện lần đầu tại đúng frame phát hiện.

Có thể đề xuất contract tương lai chính xác hơn:

```json
{
  "current": "DL06",
  "parent": "DL01",
  "via_edge_id": "E005",
  "frontier": [],
  "visited": []
}
```

Nhưng phải ghi rõ frontend hiện tại chỉ được tuyên bố consume field này nếu source thực sự đã hỗ trợ.

### 16. CORS

Backend development phải cho phép origin:

```text
http://localhost:5173
```

Đề cập:

- `POST`
- `Content-Type: application/json`
- `Access-Control-Allow-Origin`

Không cần viết toàn bộ backend implementation.

### 17. Cấu hình API mode

Hướng dẫn tạo `.env` tại root:

```env
VITE_ROUTE_API_URL=http://localhost:8000/api/route
```

Sau đó restart Vite:

```powershell
npm.cmd run dev
```

Giải thích:

- Có URL: API mode.
- URL trống: Demo mode.
- Vite đọc `.env` khi khởi động.
- Không commit secret vào `.env`.
- API URL không nên chứa secret.

### 18. Demo mode

Ghi đúng hành vi source hiện tại:

- Đọc `data/mock-result.json`.
- Chỉ hỗ trợ `DL01 → DL09` nếu source vẫn đang giới hạn như vậy.
- Không chạy A* thật.
- Chọn algorithm khác chỉ thay label trong fixture.
- Fixture chỉ dùng test GUI.

### 19. Chạy frontend

PowerShell:

```powershell
cd C:\Users\Dell\projectdalat\AIPRO-Route_DaLat
npm.cmd install
npm.cmd run dev
```

Mặc định:

```text
http://localhost:5173
```

Production:

```powershell
npm.cmd run build
npm.cmd run preview
```

### 20. Test API độc lập

Cung cấp ví dụ `curl` hoặc PowerShell `Invoke-RestMethod` gửi đúng request contract.

Backend integration checklist:

- Backend đang chạy.
- `.env` đúng URL.
- CORS cho phép frontend.
- Response HTTP 2xx và là JSON.
- `status` hợp lệ.
- `path_nodes` và `path_edges` là array đúng thứ tự.
- Edge tồn tại trong GeoJSON.
- `frontier_steps` đúng quy ước.
- Restart Vite sau khi sửa `.env`.

### 21. Program flow hoàn chỉnh

Trình bày:

```text
1. Frontend tải node/edge GeoJSON.
2. User chọn route, algorithm, scenario và optimization.
3. Frontend validate input.
4. Frontend POST request tới backend.
5. Backend chạy thuật toán.
6. Backend trả standard result.
7. Frontend lưu result vào Zustand.
8. Animation replay frontier_steps.
9. SearchTraversalLayer hiển thị active search branch.
10. FinalRouteLayer highlight dần path_edges.
11. Result panels hiển thị metrics, segments và explanation.
```

### 22. Troubleshooting

Tạo bảng cho:

- `Failed to fetch`
- CORS error
- GeoJSON không tải được
- Invalid result contract
- Không thấy route highlight
- Node đổi màu nhưng active road không sáng
- Demo chỉ chạy một route
- `.env` chưa có hiệu lực
- Production build không tìm thấy data
- `npm.ps1 cannot be loaded`

Với PowerShell Execution Policy, hướng dẫn:

```powershell
npm.cmd run dev
```

Nếu source tải `data/` từ ngoài bundle, phải ghi rõ deployment consideration. Không tuyên bố production deploy đã hoạt động nếu chưa kiểm chứng data được copy/serve đúng.

### 23. Checklist cuối README

```markdown
- [ ] Backend nhận đúng request contract
- [ ] Backend trả status hợp lệ
- [ ] path_nodes và path_edges đúng thứ tự
- [ ] frontier_steps là snapshot nhất quán
- [ ] mọi node_id và edge_id tồn tại
- [ ] CORS cho phép frontend
- [ ] no_path không gây crash
- [ ] metrics và segments khớp route
- [ ] explanation do backend tạo
```

## Yêu cầu chất lượng

- Không viết chung chung.
- Không sao chép nguyên `data/README.md`; chỉ tóm tắt phần cần thiết và dẫn link tới file đó.
- Không tuyên bố frontend tự chạy thuật toán.
- Không tuyên bố HTTP response hiện tại là realtime streaming.
- Có thể đề cập WebSocket/SSE như hướng mở rộng, không phải chức năng hiện tại.
- Sử dụng heading, bảng, code block và checklist hợp lý.
- Không lặp nội dung quá nhiều.
- Mọi file path được nhắc đến phải tồn tại.
- JSON examples phải hợp lệ.
- Command phải phù hợp Windows PowerShell.

## Kiểm tra trước khi hoàn tất

1. Đọc lại toàn bộ `README.md`.
2. Kiểm tra các path được nhắc đến.
3. Kiểm tra JSON examples.
4. Chạy:

```powershell
npm.cmd run build
git diff --check
```

5. Chỉ báo cáo:
   - File đã sửa.
   - Các phần lớn đã bổ sung.
   - Kết quả build.
6. Không commit hoặc push nếu chưa được yêu cầu.
