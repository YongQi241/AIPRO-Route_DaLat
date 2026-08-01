# Search Algorithms for Vietnamese Traffic Route Optimization

Frontend React dùng để chọn yêu cầu tìm đường, gọi Route API và trực quan hóa quá trình tìm kiếm trên mạng lưới đường Đà Lạt. Ứng dụng **không cài đặt hoặc tự chạy** BFS, DFS, UCS, Dijkstra hay A\*: toàn bộ việc tính đường đi thuộc trách nhiệm của backend/Algorithm member.

> Animation hiện tại là **replay sau khi frontend đã nhận toàn bộ HTTP response**, không phải streaming thời gian thực.

## 1. Phân chia trách nhiệm

| Backend / Algorithm member | Frontend / Display-GUI member |
|---|---|
| Load directed graph và điều kiện scenario | Load GeoJSON để vẽ node và road geometry |
| Validate request và chạy thuật toán được chọn | Thu thập lựa chọn của người dùng |
| Ghi lại search trace theo đúng thứ tự | Gửi request tới API và nhận result chuẩn |
| Tạo `path_nodes`, `path_edges`, metrics và segments | Replay search trace bằng Play/Pause/Previous/Next |
| Tạo `explanation` dựa trên kết quả thật | Hiển thị node, edge, log, tuyến đường và metrics |
| Trả trạng thái thất bại có cấu trúc | Không suy luận hoặc tính lại đường đi |

Hai phía dùng `node_id` và `edge_id` làm khóa chung. Chi tiết dataset, directed edges và quy ước dữ liệu gốc nằm tại [data/README.md](data/README.md).

## 2. Công nghệ

| Công nghệ | Vai trò |
|---|---|
| React 19 | Functional components và giao diện |
| Vite 6 | Dev server, environment variables và production build |
| Zustand 5 | Global state cho dữ liệu, request và playback |
| SVG | Render graph, animation, zoom và pan |
| GeoJSON | Node coordinates và road geometries |
| Fetch API | Gọi Route API hoặc đọc demo fixture |

Frontend không cần thư viện bản đồ ngoài. Các thao tác zoom bằng con lăn, kéo bằng chuột trái, nút `+`, `−` và Reset view được xử lý trực tiếp trên SVG.

## 3. Cấu trúc thư mục

```text
.
├── data/
│   ├── generated_routes_connected/
│   │   ├── nodes_snapped.geojson
│   │   ├── edges.geojson
│   │   ├── nodes_snapped.csv
│   │   ├── edges.csv
│   │   └── edge_conditions_template.csv
│   ├── mock-result.json
│   └── README.md
├── src/
│   ├── components/
│   │   ├── algorithm/
│   │   ├── feedback/
│   │   ├── graph/
│   │   ├── layout/
│   │   ├── panels/
│   │   ├── playback/
│   │   ├── results/
│   │   └── route-selection/
│   ├── hooks/
│   │   ├── useGraphData.js
│   │   └── useRouteSolver.js
│   ├── services/
│   │   └── routeService.js
│   ├── store/
│   │   └── useAppStore.js
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── package.json
└── vite.config.js
```

## 4. Kiến trúc và data flow

```text
GeoJSON ──> useGraphData ──> Zustand ──> GraphWorkspace/SVG layers
                                      └─> selectors và node labels

User selections ──> Zustand ──> useRouteSolver ──> routeService
                                                   │
                    Demo fixture <── URL rỗng ─────┤
                    Route API    <── có URL ───────┘
                           │
                           v
                    full result JSON
                           │
                           v
             Zustand routeResult + simulation
                 │                       │
                 ├─> graph animation     └─> bottom-panel tabs
                 └─> final route, log, metrics, segments, explanation
```

Luồng HTTP hiện tại trả một result hoàn chỉnh. Nếu sau này cần chạy thực sự theo thời gian thực, hai nhóm có thể thiết kế thêm WebSocket hoặc SSE; đó chưa phải chức năng hiện có.

## 5. Component frontend

| Component | Trách nhiệm chính |
|---|---|
| `App` | Khởi tạo graph loading, route solver và ghép các vùng UI |
| `AppShell` | Layout Top Bar, Left Workspace, Right Sidebar và Bottom Panel |
| `PlaybackToolbar` | Load data, Play/Pause, Previous/Next, Reset và Speed |
| `RouteSelectionControls` | Chọn start, goal, intermediate nodes, scenario và optimization |
| `AlgorithmSidebar` | Chọn BFS, DFS, UCS, Dijkstra hoặc A\*; chỉ gửi lựa chọn, không chạy thuật toán |
| `GraphWorkspace` | SVG viewport, coordinate projection, pan, zoom và ghép graph layers |
| `RoadNetworkLayer` | Vẽ toàn bộ road geometry nền từ `edges.geojson` |
| `GraphNodeLayer` | Vẽ node theo trạng thái animation và node tuyến đường được xác nhận |
| `SearchAnimationLayer` | Lấy frame hiện tại, chạy timer playback và chuyển state node cho `GraphNodeLayer` |
| `SearchTraversalLayer` | Highlight nhánh đang xét dựa trên discovery relationship từ trace |
| `FinalRouteLayer` | Highlight phần tuyến kết quả đã được xác nhận theo `path_edges` |
| `BottomPanelTabs` | Năm tab ngang, hỗ trợ click và phím Arrow/Home/End |
| `CurrentTaskPanel` | Tóm tắt request, current node, trạng thái và progress |
| `SearchLogPanel` | Hiển thị các frame đã replay tới `currentStep` |
| `RouteResultPanel` | Hiển thị path và metrics tổng |
| `SegmentDetails` | Hiển thị từng segment theo đúng thứ tự `path_edges` |
| `RouteExplanation` | Hiển thị nguyên văn explanation và cảnh báo do result cung cấp |
| `StatusMessage` | Trạng thái load graph, loading request, success và error |

## 6. Zustand Global State

`src/store/useAppStore.js` là nguồn state duy nhất cho các nhóm sau:

- `graphData`: nodes, edges, trạng thái loading và lỗi GeoJSON.
- `selectedAlgorithm`: thuật toán user chọn.
- `routeSelection`: start, goal, intermediate locations, scenario và optimization.
- `routeResult`: full result backend hoặc fixture trả về.
- `requestState`: `idle`, `loading`, `success`, `no_path`, `invalid_input`, `error` và message.
- `simulation`: `status`, `currentStep`, `speed`.

Các action playback chính:

| Action | Tác dụng |
|---|---|
| `play()` | Chạy timeline; nếu đang ở cuối thì replay từ đầu |
| `pause()` | Dừng timer tại frame hiện tại |
| `nextAction()` | Pause và tiến tối đa một frame |
| `previousAction()` | Pause và lùi tối đa một frame |
| `resetSimulation()` | Về frame đầu và xóa progressive highlight |
| `setSpeed(value)` | Đổi hệ số tốc độ playback |
| `setRouteResult(result)` | Lưu result mới và thiết lập timeline tương ứng |

Logic thay đổi timeline không đặt rải rác trong các panel. Component chỉ đọc state cần thiết và gọi action của store.

## 7. Playback và manual stepping

- **Play** tự động tăng `simulation.currentStep` theo `frontier_steps`, hoặc fallback sang `visited_order` khi không có trace chi tiết.
- **Pause** dừng timeline.
- **Previous action** quay về đúng frame trước và tự Pause nếu đang Play.
- **Next action** tiến đúng một frame và tự Pause nếu đang Play.
- **Reset** trở lại frame `0`.
- **Speed** điều chỉnh delay timer; không thay đổi dữ liệu thuật toán.
- Previous/Next chỉ duyệt result đã nhận, không gọi từng bước thuật toán và không tự tìm node kế tiếp.
- Tại bước cuối, trạng thái là `completed`; Play lần nữa replay từ đầu theo source hiện tại.

Khi chưa có successful result, hoặc result không có trace, các điều khiển không có timeline hợp lệ để duyệt.

## 8. Search animation và node states

`SearchAnimationLayer` tạo state hiển thị từ frame hiện tại:

| State | Ý nghĩa hiển thị |
|---|---|
| Unvisited | Chưa xuất hiện trong search trace |
| Frontier | Đang chờ được mở rộng |
| Visited | Đã được mở rộng |
| Current | Node đang được xét trong frame hiện tại |
| Confirmed route | Node thuộc prefix của final route đã được xác nhận |
| Latest confirmed | Node tuyến đường vừa được xác nhận; icon lớn hơn các node khác |
| Final path | Node thuộc tuyến hoàn chỉnh khi animation kết thúc |

Thứ tự ưu tiên CSS/state bảo đảm node quan trọng không bị trạng thái phổ thông che mất. Dữ liệu node đến từ `nodes_snapped.geojson`; animation chỉ ánh xạ ID trong result lên các node này.

## 9. Active search branch

`SearchTraversalLayer` minh họa nhánh khám phá đang dẫn tới node hiện tại:

1. Khi một node xuất hiện lần đầu trong `frontier`, frontend ghi nhận `current` của frame đó làm discovery parent.
2. Khi node trở thành `current`, frontend lần ngược discovery parents về start.
3. Mỗi quan hệ cha-con được khớp bằng đúng cặp directed `from_node → to_node` trong GeoJSON.
4. Chỉ edge ID khớp mới được highlight; frontend không đoán cạnh bằng tọa độ hoặc khoảng cách.

Active branch dùng màu riêng với final route. Để tính năng chính xác, backend phải trả `frontier_steps` theo đúng thời gian, trong đó `frontier` là snapshot **sau khi** mở rộng `current`, và node mới xuất hiện lần đầu tại frame nó được phát hiện.

Nếu backend chỉ trả `visited_order`, frontend vẫn có thể đổi trạng thái node theo thứ tự, nhưng không đủ dữ liệu để xác định discovery parent và sẽ không đoán active road.

## 10. Progressive final-route highlight

Final route không cần chờ animation kết thúc mới sáng toàn bộ. Frontend so frame hiện tại với `result.path_nodes` để xác định prefix liên tục đã được xác nhận, sau đó chỉ lấy các edge cùng vị trí trong `result.path_edges`.

Ví dụ:

```text
path_nodes: DL01 → DL06 → DL19 → DL09
path_edges: E005 → E041 → E064
```

- Khi mới xác nhận `DL06`, highlight `E005`.
- Khi xác nhận `DL19`, highlight `E005`, `E041`.
- Khi xác nhận `DL09`, highlight đủ `E005`, `E041`, `E064`.

Hai invariant bắt buộc là `path_edges.length === path_nodes.length - 1` và edge thứ `i` phải nối đúng `path_nodes[i] → path_nodes[i + 1]`.

## 11. Backend API cần cung cấp gì?

Frontend cần một HTTP endpoint nhận JSON bằng `POST` và trả một result JSON chuẩn. URL không bị hard-code; giá trị đầy đủ được cấu hình qua `VITE_ROUTE_API_URL`, ví dụ:

```text
http://localhost:8000/api/routes/solve
```

Backend chịu trách nhiệm:

1. Kiểm tra node, algorithm, scenario và optimization.
2. Load directed graph đúng scenario và loại closed edges.
3. Chạy thuật toán được yêu cầu.
4. Ghi `visited_order` và tốt nhất là `frontier_steps`.
5. Tạo ordered `path_nodes`, `path_edges`, `segments` và `metrics`.
6. Tạo `explanation` dựa trên kết quả thật.
7. Luôn trả failure result có cấu trúc cho lỗi nghiệp vụ.

Frontend không yêu cầu backend viết bằng framework hay ngôn ngữ cụ thể.

## 12. Request contract

Frontend gửi `Content-Type: application/json` với body:

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

| Field | Type | Bắt buộc | Quy ước |
|---|---|---:|---|
| `start_node` | string | Có | `node_id`, không phải tên địa điểm |
| `goal_node` | string | Có | Khác `start_node` |
| `visit_nodes` | string[] | Có | Luôn là array, có thể rỗng |
| `algorithm` | string | Có | `bfs`, `dfs`, `ucs`, `dijkstra`, `astar` |
| `scenario_id` | string | Có | Phải là ID mà frontend và backend cùng thống nhất |
| `optimization` | string | Có | Hiện UI gửi `balanced`, `distance`, `time` hoặc `cost` |

Graph là directed. Backend không được tự đảo edge khi không tồn tại cạnh chiều ngược.

> Lưu ý tích hợp: UI hiện có scenario `S1` đến `S5`, trong khi dataset/template có thể dùng bộ ID/ngữ nghĩa khác. Hai nhóm phải thống nhất exact IDs trước khi nối API; không nên ánh xạ ngầm theo label.

## 13. Success response contract

Ví dụ JSON hợp lệ và nhất quán:

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
    },
    {
      "current": "DL02",
      "frontier": ["DL06"],
      "visited": ["DL01", "DL02"]
    },
    {
      "current": "DL06",
      "frontier": ["DL19"],
      "visited": ["DL01", "DL02", "DL06"]
    },
    {
      "current": "DL19",
      "frontier": ["DL09"],
      "visited": ["DL01", "DL02", "DL06", "DL19"]
    },
    {
      "current": "DL09",
      "frontier": [],
      "visited": ["DL01", "DL02", "DL06", "DL19", "DL09"]
    }
  ],
  "metrics": {
    "total_distance_km": 39.429,
    "total_time_min": 63.04,
    "total_cost": 3.943,
    "explored_nodes": 5,
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
    },
    {
      "edge_id": "E041",
      "from_node": "DL06",
      "to_node": "DL19",
      "distance_km": 11.125,
      "adjusted_time_min": 18.59,
      "congestion_level": 1,
      "risk": 0
    },
    {
      "edge_id": "E064",
      "from_node": "DL19",
      "to_node": "DL09",
      "distance_km": 22.296,
      "adjusted_time_min": 35.35,
      "congestion_level": 1,
      "risk": 0
    }
  ],
  "explanation": "A* selected this directed route under scenario S1 using the balanced objective.",
  "message": "Route calculated successfully."
}
```

Các invariant backend phải giữ:

- `status` thuộc `success | no_path | invalid_input | error`.
- Tất cả ID là string và tồn tại trong dataset tương ứng.
- `path_nodes` bắt đầu bằng start, kết thúc bằng goal và đúng thứ tự đi.
- `path_edges` đúng thứ tự, đúng hướng, không phải một set không thứ tự.
- `path_edges.length === path_nodes.length - 1`.
- `segments` khớp từng `path_edges`; tổng metrics khớp các segment.
- `visited_order` và `frontier_steps` phản ánh lần chạy thật, không dựng từ final path.
- `explanation` do backend tạo; frontend hiển thị mà không sửa logic nội dung.

## 14. Failure response

Với lỗi nghiệp vụ có thể dự đoán, nên trả HTTP 2xx cùng result chuẩn để frontend hiển thị đúng trạng thái. Lỗi server/transport vẫn có thể dùng HTTP error code phù hợp.

```json
{
  "status": "no_path",
  "algorithm": "A*",
  "scenario_id": "S5",
  "optimization": "balanced",
  "start_node": "DL01",
  "goal_node": "DL09",
  "path_nodes": [],
  "path_edges": [],
  "visited_order": ["DL01", "DL02"],
  "frontier_steps": [],
  "metrics": {},
  "segments": [],
  "explanation": "No directed route remains after applying the selected closures.",
  "message": "No path from DL01 to DL09."
}
```

- `no_path`: request hợp lệ nhưng graph/scenario không có đường.
- `invalid_input`: ID hoặc option không hợp lệ, start trùng goal, hay request sai quy tắc.
- `error`: backend không thể hoàn thành vì lỗi xử lý nội bộ.

Không trả HTML error page cho endpoint JSON.

## 15. Quy ước `frontier_steps`

Mỗi frame có cấu trúc:

```json
{
  "current": "DL06",
  "frontier": ["DL14", "DL19", "DL21"],
  "visited": ["DL01", "DL02", "DL06"]
}
```

- `current`: node vừa được lấy ra để mở rộng.
- `frontier`: toàn bộ frontier snapshot sau khi mở rộng `current`.
- `visited`: danh sách cumulative node đã mở rộng tới frame này.
- ID luôn là string; không gửi tên địa điểm thay ID.
- Frame phải đúng thứ tự thời gian.
- Hạn chế duplicate trong `frontier`.
- Node phải xuất hiện lần đầu tại đúng frame nó được phát hiện.

Nếu backend muốn biểu diễn discovery relationship rõ ràng hơn trong tương lai, có thể đề xuất field như `parent` hoặc `via_edge` cho từng frontier entry. Frontend hiện tại **chưa consume các field mở rộng này**; hiện nó suy ra parent từ quy ước snapshot ở trên.

## 16. CORS

Khi Vite chạy mặc định tại `http://localhost:5173`, backend phải cho phép origin này và ít nhất:

- Method `POST` và preflight `OPTIONS`.
- Header request `Content-Type: application/json`.
- Response header `Access-Control-Allow-Origin` phù hợp.

Chỉ bật origin thực sự cần thiết; không cần gửi credential nếu API không dùng authentication. CORS là cấu hình của backend/proxy, không thể sửa bằng frontend code.

## 17. Cấu hình API mode

Tạo `.env` từ file mẫu:

```powershell
Copy-Item .env.example .env
```

Điền endpoint đầy đủ:

```dotenv
VITE_ROUTE_API_URL=http://localhost:8000/api/routes/solve
```

- Có URL: `routeService` gửi `POST` đến API mode.
- URL rỗng: frontend dùng Demo mode.
- Vite chỉ đọc `.env` khi khởi động; phải restart dev server sau khi sửa.
- Không commit secret vào `.env`.
- Biến `VITE_*` được đóng gói vào client và ai cũng có thể xem, vì vậy API URL không được chứa secret/token.

## 18. Demo mode

Khi `VITE_ROUTE_API_URL` rỗng, frontend đọc [data/mock-result.json](data/mock-result.json).

Giới hạn hiện tại:

- Chỉ hỗ trợ `DL01 → DL09` và không có intermediate location.
- Không chạy A\* hay bất kỳ thuật toán thật nào.
- Chọn algorithm khác chỉ thay label trên fixture.
- Path, metrics và trace là dữ liệu dựng sẵn để test GUI.
- Request ngoài fixture trả `invalid_input` và nhắc cấu hình API.

Không dùng Demo mode để đánh giá độ đúng hoặc hiệu năng thuật toán.

## 19. Chạy frontend

Yêu cầu Node.js và npm đã được cài đặt.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Mở URL Vite in ra terminal, thường là `http://localhost:5173`.

Build và xem thử production bundle:

```powershell
npm run build
npm run preview
```

Project hiện không khai báo script test tự động trong `package.json`; `npm run build` là bước kiểm tra cấu trúc/import tối thiểu.

## 20. Test API độc lập

Test endpoint bằng PowerShell trước khi nối frontend:

```powershell
$requestBody = @{
  start_node  = 'DL01'
  goal_node   = 'DL09'
  visit_nodes = @()
  algorithm   = 'astar'
  scenario_id = 'S1'
  optimization = 'balanced'
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri 'http://localhost:8000/api/routes/solve' `
  -Method Post `
  -ContentType 'application/json' `
  -Body $requestBody
```

Trước khi test qua UI, xác nhận:

- Backend đang chạy và URL trong `.env` đúng.
- Response là HTTP 2xx JSON cho result nghiệp vụ.
- `status`, arrays và invariant path hợp lệ.
- Mọi `edge_id` cần highlight tồn tại trong `edges.geojson`.
- `frontier_steps` tuân thủ snapshot convention.
- Backend cho phép CORS từ Vite origin.
- Vite đã được restart sau khi sửa `.env`.

## 21. Program flow hoàn chỉnh

1. `App` gọi `useGraphData` để fetch node và edge GeoJSON.
2. Hook validate `FeatureCollection`, lấy features và lưu vào Zustand.
3. Selectors dùng node IDs; `GraphWorkspace` render road network và nodes.
4. User chọn start, goal, intermediate nodes, algorithm, scenario và optimization.
5. `useRouteSolver` tạo request bằng các ID trong store.
6. `routeService` chọn API mode nếu có `VITE_ROUTE_API_URL`, nếu không chọn Demo mode.
7. Frontend chờ và nhận **toàn bộ** result JSON.
8. Result được lưu vào `routeResult`; request status và simulation được cập nhật.
9. Với successful trace, playback bắt đầu hoặc user dùng Previous/Next để duyệt frame.
10. Node states, active search branch, progressive final route, progress và Search log cùng đọc một `currentStep`.
11. Các tab Output, Breakdown và Human-readable reasoning hiển thị path, metrics, segments và explanation.
12. Reset chỉ reset simulation; request mới thay result bằng dữ liệu backend mới.

## 22. Troubleshooting

| Hiện tượng | Nguyên nhân thường gặp | Cách kiểm tra/xử lý |
|---|---|---|
| `Failed to fetch` | Backend chưa chạy, sai URL, HTTP/HTTPS mismatch | Mở endpoint, test bằng `Invoke-RestMethod`, kiểm tra `.env` |
| CORS error | Backend chưa allow Vite origin hoặc `OPTIONS` | Cấu hình CORS tại backend/proxy cho `http://localhost:5173` |
| GeoJSON không tải được | Sai working directory, file không được serve, response không phải `FeatureCollection` | Kiểm tra Network tab và hai đường dẫn trong `useGraphData.js` |
| `Invalid result contract` | Thiếu `status`, hoặc `path_nodes` không phải array | So response với contract ở trên |
| Không thấy route highlight | `status` không phải `success`, `path_edges` rỗng/sai ID | So từng edge ID với property `edge_id` trong GeoJSON |
| Node đổi màu nhưng active road không sáng | Thiếu `frontier_steps`, snapshot sai, hoặc thiếu directed edge cha-con | Kiểm tra quy ước discovery ở mục 9 và 15 |
| Demo chỉ chạy một route | Đây là giới hạn fixture | Dùng đúng `DL01 → DL09` hoặc cấu hình `VITE_ROUTE_API_URL` |
| `.env` chưa có hiệu lực | Vite đang dùng process cũ | Dừng và chạy lại `npm run dev` |
| Production build không tìm thấy data | `data/` nằm ngoài `public` và Vite không tự bảo đảm copy các URL runtime này | Cấu hình deploy để phục vụ `/data/...`, hoặc chuyển/copy assets sang public trong một thay đổi được thống nhất |
| `npm.ps1 cannot be loaded` | PowerShell execution policy chặn shim | Chạy `npm.cmd install`, `npm.cmd run dev` hoặc điều chỉnh policy theo quy định máy |
| `no_path` làm UI trống | Backend trả thiếu arrays/fields chuẩn | Trả `path_nodes`, `path_edges`, `frontier_steps`, `segments` là arrays rỗng và `metrics` là object rỗng |

### Lưu ý deployment dữ liệu

Dev server có thể resolve các URL tương đối tới `data/`, nhưng production bundle không tự copy thư mục này chỉ vì code gọi `fetch`. Hệ thống deploy phải bảo đảm các resource sau truy cập được từ origin frontend:

```text
/data/generated_routes_connected/nodes_snapped.geojson
/data/generated_routes_connected/edges.geojson
/data/mock-result.json
```

Kiểm tra trực tiếp từng URL sau khi deploy trước khi debug SVG.

## 23. Checklist tích hợp

- [ ] Backend nhận đúng request contract.
- [ ] Backend trả một trong các `status` hợp lệ.
- [ ] `path_nodes` và `path_edges` đúng thứ tự và đúng hướng.
- [ ] `path_edges.length === path_nodes.length - 1` khi success.
- [ ] `frontier_steps` là snapshot nhất quán theo thời gian.
- [ ] Mọi `node_id` và `edge_id` đều tồn tại trong GeoJSON/dataset.
- [ ] CORS cho phép origin của frontend.
- [ ] `no_path`, `invalid_input` và `error` không làm UI crash.
- [ ] Metrics và segments khớp final route.
- [ ] `explanation` do backend tạo từ kết quả thật.
- [ ] `.env` đã cấu hình và Vite đã được restart.
- [ ] Production host phục vụ được các file trong `/data/...`.

---

Tài liệu dataset chi tiết hơn về CSV/GeoJSON, directed graph, scenario conditions và thuật toán nằm tại [data/README.md](data/README.md). README này tập trung vào kiến trúc frontend hiện tại và hợp đồng cần thiết để backend tích hợp với UI.
