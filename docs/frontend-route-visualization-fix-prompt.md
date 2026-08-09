# Prompt: Sửa lỗi route visualization chỉ ở frontend

## Vai trò

Bạn là Senior React Frontend Engineer chuyên React 19, Zustand, SVG, GeoJSON và visualization state machines.

Project:

```text
C:\Users\Dell\projectdalat\AIPRO-Route_DaLat
```

Branch làm việc:

```text
frontend
```

## Mục tiêu

Hãy sửa các lỗi frontend khiến active search branch, progressive final route và đường SVG trên Map/Graph mode hiển thị sai hoặc gây hiểu nhầm.

Backend đã được chẩn đoán và xác nhận trả final route hợp lệ. Vì người dùng là Display/GUI member, **chỉ được sửa frontend**.

## Phạm vi tuyệt đối

Được phép sửa:

```text
src/
```

Được phép bổ sung frontend-only test nếu thực sự cần và không kéo theo thay đổi backend.

Không được sửa:

```text
backend/
algorithms/
advance_search/
data/
requirements.txt
```

Không được:

- Viết hoặc thay đổi BFS, DFS, UCS, Dijkstra, A\*, Greedy, Hill Climbing, Nearest Neighbor hoặc Brute Force TSP.
- Thay đổi kết quả backend để khớp giao diện.
- Tự chạy lại thuật toán trong frontend.
- Tự tính shortest path trong frontend.
- Suy luận road edge từ khoảng cách hoặc tọa độ.
- Đảo chiều directed edge.
- Thay đổi API response contract phía backend.
- Commit, push, merge hoặc đổi branch nếu người dùng chưa yêu cầu riêng.
- Xóa hoặc ghi đè các file local chưa commit không liên quan.

## Trạng thái Git cần bảo toàn

Trước khi sửa, chạy:

```powershell
git status --short --branch
git log -1 --oneline --decorate
```

Các file local sau có thể đang untracked và phải được giữ nguyên:

```text
.venv/
docs/AI-CONTEXT.md
docs/frontend-zero-to-understanding-tutor-prompt.md
docs/route-visualization-root-cause-diagnosis-prompt.md
docs/frontend-route-visualization-fix-prompt.md
```

Không stage, commit hoặc xóa chúng trong nhiệm vụ sửa frontend.

## Bằng chứng chẩn đoán đã có

### Backend/API/dataset đã pass

Đã kiểm tra solver trực tiếp, `backend.server.calculate_route` và HTTP API. Chúng trả cùng:

```text
status
path_nodes
path_edges
segments
scenario_id
optimization
```

Dataset hiện có:

```text
25 node CSV = 25 node GeoJSON
114 edge CSV = 114 edge GeoJSON
114 unique directed pairs
```

Không có:

- Missing node/edge ID.
- CSV/GeoJSON endpoint mismatch.
- Duplicate directed pair.
- Edge bị đảo chiều trong final path đã kiểm tra.

Case tái hiện quan trọng:

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

Backend final route đúng:

```text
path_nodes:
DL01 → DL22 → DL21 → DL10 → DL18

path_edges:
E009 → E104 → E074 → E069
```

Frontend hiện suy luận sai active branch:

```text
DL01 → DL02 → DL23 → DL21 → DL10 → DL18

E001 → E017 → E106 → E074 → E069
```

Nguyên nhân: frontend lưu parent ở lần node xuất hiện đầu tiên trong frontier. A*/Dijkstra có thể re-parent node khi tìm được cumulative cost tốt hơn.

Đã kiểm tra 24 destination từ `DL01`:

```text
BFS:      0/24 completed active-branch mismatch
Dijkstra: 11/24 mismatch
A*:       11/24 mismatch
```

Backend trace hiện không cung cấp `parent` hoặc `via_edge`. Frontend không có đủ bằng chứng để tái dựng chính xác active branch của weighted algorithms sau re-parent.

## File bắt buộc phải đọc trước khi sửa

```text
README.md
package.json
vite.config.js

src/App.jsx
src/store/useAppStore.js
src/hooks/useGraphData.js
src/hooks/useRouteSolver.js
src/services/routeRequest.js
src/services/routeService.js

src/components/graph/GraphWorkspace.jsx
src/components/graph/GraphWorkspace.css
src/components/graph/graphGeometry.js
src/components/graph/topologyLayout.js
src/components/graph/RoadNetworkLayer.jsx
src/components/graph/RoadNetworkLayer.css
src/components/graph/GraphNodeLayer.jsx
src/components/graph/GraphNodeLayer.css
src/components/graph/SearchAnimationLayer.jsx
src/components/graph/SearchTraversalLayer.jsx
src/components/graph/SearchTraversalLayer.css
src/components/graph/FinalRouteLayer.jsx
src/components/graph/FinalRouteLayer.css
src/components/graph/searchTimeline.js

src/components/playback/PlaybackToolbar.jsx
src/components/panels/CurrentTaskPanel.jsx
src/components/panels/SearchLogPanel.jsx
```

Chỉ đọc các file backend/data nếu cần xác nhận contract; không sửa chúng.

## Các lỗi frontend bắt buộc sửa

### Lỗi 1 — `SearchTraversalLayer` được render hai lần

Trong `GraphWorkspace.jsx` hiện có hai instance liên tiếp:

```jsx
<SearchTraversalLayer
  features={displayEdgeFeatures}
  project={drawing.project}
  edgeIds={activeSearchEdgeIds}
/>

<SearchTraversalLayer
  features={edgeFeatures}
  project={drawing.project}
  edgeIds={activeSearchEdgeIds}
/>
```

Yêu cầu:

- Chỉ render active traversal một lần.
- Instance còn lại phải dùng `displayEdgeFeatures`.
- Map mode dùng original GeoJSON geometry.
- Graph mode dùng topology edge geometry.
- Node layer và mọi edge layer phải dùng cùng hệ tọa độ trong từng layout.
- Không làm hỏng opposing directed edges hoặc self-loops trong Graph mode.

### Lỗi 2 — Active branch inference sai với weighted algorithms

`getActiveSearchBranchEdgeIds` hiện giữ parent ở lần discovery đầu:

```js
if (!frontierNode || discovered.has(frontierNode)) continue
parentByNode.set(frontierNode, parentNode)
```

Điều này không an toàn cho A*/Dijkstra/UCS vì parent có thể thay đổi.

Backend hiện không trả `parent`, `via_edge` hoặc current-path snapshot. Vì vậy frontend không được giả vờ biết parent chính xác.

Yêu cầu frontend-only:

1. Không chạy thuật toán trong frontend.
2. Không dùng coordinate proximity để đoán parent.
3. Nếu trace có explicit linkage trong tương lai, ví dụ một trong các dạng:

```text
frame.current_path_edges
frame.path_edges
frontier item.parent
frontier item.via_edge
```

thì có thể consume sau khi validate ID/direction.
4. Với contract hiện tại, chỉ cho phép first-discovery inference ở thuật toán mà quan hệ parent không bị re-parent theo logic đang dùng, tối thiểu BFS và DFS.
5. Với A*, Dijkstra, UCS và các thuật toán không thể chứng minh parent từ trace hiện tại:

- Không vẽ active road branch suy luận.
- Vẫn hiển thị current/frontier/visited node states.
- Không ảnh hưởng final route.
- UI không được crash.

6. Viết logic theo khả năng dữ liệu/algorithm một cách rõ ràng, không rải điều kiện magic string trong nhiều component.
7. Normalize tên algorithm an toàn vì response có thể trả `A*`, `A* Search`, `Dijkstra`, `BFS`, `DFS`, `UCS` hoặc request ID.
8. Nếu chưa chắc một algorithm có first-discovery parent ổn định, ưu tiên không vẽ sai.

Mục tiêu là:

```text
Đường không xuất hiện còn tốt hơn đường sai.
```

### Lỗi 3 — Active branch vẫn tồn tại khi completed

Yêu cầu:

- Khi `simulation.status === completed`, không hiển thị active search branch.
- Completed state chỉ hiển thị final route và final node states.
- Khi user Previous từ completed về paused, active branch có thể xuất hiện lại nếu trace đủ tin cậy.
- Reset phải xóa mọi active/progressive highlight của step trước.

### Lỗi 4 — Progressive final route được tính nhưng không được render

`getConfirmedRoutePrefix()` đã trả:

```text
visiblePathNodes
visiblePathEdges
latestConfirmedNodeId
```

Nhưng `GraphWorkspace` hiện chỉ dùng full path khi completed:

```js
const visiblePathEdges = showFinalPath ? result.path_edges : []
const visiblePathNodes = showFinalPath ? result.path_nodes : []
```

Yêu cầu:

- Trong lúc playing/paused/manual stepping, render đúng continuous confirmed prefix:

```text
confirmedRoute.visiblePathEdges
confirmedRoute.visiblePathNodes
```

- Khi completed hoặc result không có timeline, render full `result.path_edges/path_nodes`.
- Previous phải thu hồi các edge/node chưa được xác nhận ở frame trước.
- Reset về step đầu phải thu hồi progressive path.
- Chỉ final-route layer được phép dùng `result.path_edges`/confirmed prefix.
- Không trộn active search branch IDs với final route IDs.
- `latestConfirmedNodeId` vẫn phóng to đúng node vừa xác nhận.

### Lỗi 5 — Route cũ còn hiển thị khi request mới loading/error

Hiện `setRouteRequestLoading` và `setRouteRequestError` chỉ đổi `requestState`, không xóa `routeResult`/simulation.

Yêu cầu:

- Khi bắt đầu request mới, route/highlight cũ không được tiếp tục xuất hiện như thể thuộc request mới.
- Reset simulation về initial state khi request mới bắt đầu.
- Chọn một hành vi rõ ràng:
  - Xóa `routeResult` khi loading; hoặc
  - Giữ result trong store nhưng GraphWorkspace tuyệt đối không render nó khi request đang loading.
- Ưu tiên giải pháp state đơn giản, dễ kiểm chứng và không tạo flicker khó hiểu.
- Khi request transport error, không để final route cũ xuất hiện bên dưới error như result mới.
- `no_path` và `invalid_input` cũng không giữ route thành công cũ.

### Lỗi 6 — Demo fallback tham chiếu biến chưa khai báo

`routeService.js` đang gọi:

```js
fetch(MOCK_RESULT_URL)
```

nhưng `MOCK_RESULT_URL` chưa được khai báo.

Yêu cầu:

- Khôi phục frontend constant đúng với fixture hiện có:

```text
data/mock-result.json
```

- Giữ API-first behavior hiện tại.
- Development chỉ fallback khi không có custom URL và API local không kết nối được.
- Production không che API error bằng fixture.
- Không sửa backend để giải quyết fallback.

## Yêu cầu giữ nguyên chức năng

Không làm hỏng:

- API route search hiện tại.
- Map/Graph layout switch.
- Wheel zoom.
- Chuột trái kéo/pan.
- `+`, `−`, Reset view.
- Play/Pause.
- Previous action/Next action.
- Reset simulation.
- Speed selector.
- Bottom panel dạng năm tab ngang.
- Current node/frontier/visited colors.
- Final route normal/warning colors.
- Directed edge geometry.
- Multi-location request behavior.

Không thay đổi style tổng thể ngoài những gì cần để tránh visualization sai. Không redesign UI.

## Thứ tự thực hiện

### Bước 1 — Xác nhận source và tái hiện trước khi sửa

Ghi lại:

- Case `A* DL01 → DL18`, `S0`, `balanced`.
- Backend final path.
- Active branch frontend hiện suy luận.
- Số `SearchTraversalLayer` đang render.
- Map và Graph behavior.

### Bước 2 — Lập kế hoạch ngắn

Liệt kê file frontend dự kiến sửa và invariant cần giữ. Không bắt đầu bằng việc sửa backend.

### Bước 3 — Sửa từng nhóm nhỏ

Khuyến nghị thứ tự:

1. Xóa duplicate/mixed-coordinate traversal render.
2. Làm active-branch policy an toàn.
3. Ẩn active branch khi completed.
4. Nối progressive confirmed prefix vào FinalRouteLayer/GraphNodeLayer.
5. Xóa stale result khi request mới/error.
6. Sửa demo fallback constant.

### Bước 4 — Kiểm tra sau sửa

Không chỉ nhìn build success. Phải kiểm tra behavior/data.

## Test bắt buộc

### 1. Static/source checks

- `GraphWorkspace` chỉ còn một `SearchTraversalLayer` render.
- Traversal dùng `displayEdgeFeatures`.
- Không có original GeoJSON geometry đi qua identity projector trong Graph mode.
- `MOCK_RESULT_URL` được định nghĩa đúng một lần.
- Không có file backend/algorithm/data nào thay đổi.

### 2. Backend final route không bị frontend sửa

Với:

```text
A* DL01 → DL18, S0, balanced
```

Final route UI phải dùng đúng:

```text
E009, E104, E074, E069
```

Không được thay thành active-inference edges:

```text
E001, E017, E106, E074, E069
```

### 3. Active branch policy

- BFS/DFS: có thể tiếp tục first-discovery highlight nếu trace hợp lệ.
- A*/Dijkstra/UCS: với trace hiện tại không có parent/via-edge, active road branch phải rỗng thay vì sai.
- Node current/frontier/visited animation vẫn hoạt động.
- Completed: active road branch luôn rỗng.

### 4. Progressive final route

Với fixture hoặc successful response có final path nhiều edge:

- Step đầu: chưa sáng edge chưa xác nhận.
- Khi xác nhận node thứ hai: sáng đúng edge thứ nhất.
- Next: prefix tăng theo `path_edges`.
- Previous: prefix giảm chính xác.
- Reset: về prefix ban đầu.
- Completed: full final path.

### 5. Map/Graph coordinates

- Map mode: route bám GeoJSON node/road coordinates.
- Graph mode: mọi road, active branch, final route và node dùng topology coordinates.
- Không có cyan line nằm gần raw longitude/latitude `[108.x, 11.x]` trong Graph SVG coordinate system.

### 6. Request state

- Route A success và hiện path.
- Bắt đầu Route B: Route A không còn bị trình bày như Route B.
- Route B error/no_path/invalid_input: Route A không xuất hiện lại.

### 7. Demo fallback

- Backend chạy: frontend dùng API.
- Backend dừng trong dev, không custom URL: fixture DL01 → DL09 load được.
- Request demo không hỗ trợ: trả structured `invalid_input`.
- Production/custom URL error: không fallback âm thầm.

### 8. Build

Chạy:

```powershell
npm.cmd run build
```

Nếu project không có automated test framework, không tự thêm dependency lớn chỉ để hoàn tất nhiệm vụ. Có thể kiểm tra pure functions bằng Node read-only script hoặc thêm test nhỏ theo hạ tầng sẵn có.

### 9. Git scope

Sau sửa, chạy:

```powershell
git status --short
git diff --check
git diff --name-only
```

Fail nhiệm vụ nếu `git diff --name-only` có file dưới:

```text
backend/
algorithms/
advance_search/
data/
```

## Tiêu chí hoàn thành

- Backend và algorithms không thay đổi.
- Final route vẫn đúng backend `path_edges`.
- Không còn active branch sai cho A*/Dijkstra/UCS khi trace thiếu explicit parent.
- Không còn duplicate traversal layer.
- Không còn mixed coordinate system trong Graph mode.
- Active branch không xuất hiện ở completed.
- Progressive final route hoạt động với Next/Previous/Reset.
- Route cũ không tồn tại qua request loading/error.
- Demo fallback không còn ReferenceError.
- Build thành công.
- Có báo cáo file đã sửa, test đã chạy và giới hạn còn lại.

## Format báo cáo cuối

```markdown
# Kết quả

## Nguyên nhân frontend đã xử lý

## File frontend đã sửa

## Hành vi trước/sau

## Test và kết quả

## Xác nhận backend/data không thay đổi

## Giới hạn còn lại
```

Trong `Giới hạn còn lại`, phải nói rõ:

> Với backend trace hiện tại không có parent/via-edge, frontend chủ động không vẽ active road branch cho weighted algorithms để tránh hiển thị sai. Node animation và final route vẫn hoạt động.

Hãy đọc source, lập kế hoạch và thực hiện sửa lỗi frontend. Không sửa backend.
