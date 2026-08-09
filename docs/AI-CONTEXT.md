# AI Handoff Context — AIPRO Route Đà Lạt Frontend

> Đọc file này trước khi tiếp tục làm việc với người dùng. Sau đó đọc source thực tế liên quan đến nhiệm vụ mới. File này là bản tóm tắt bối cảnh và quyết định đã thống nhất, không thay thế source code.

## 1. Người dùng và mục tiêu

Người dùng là sinh viên làm đồ án môn Trí tuệ Nhân tạo với đề tài:

```text
Search Algorithms for Vietnamese Traffic Route Optimization
```

Trong nhóm, người dùng đảm nhận vai trò **Display/GUI member**. Một thành viên khác là **Algorithm member**, chịu trách nhiệm toàn bộ thuật toán và Backend API.

Quy tắc cốt lõi của phần người dùng:

- Chỉ làm frontend React.
- Không viết hoặc sửa BFS, DFS, UCS, Dijkstra, A\* hay thuật toán tìm đường.
- Không tự tính tuyến đường trong frontend.
- Frontend chỉ gửi request, nhận result và trực quan hóa.
- Dùng đúng `node_id` và `edge_id` từ dataset/result.
- Không suy luận road edge bằng tọa độ.
- Backend/fixture phải cung cấp search trace và final route.

Người dùng giao tiếp bằng tiếng Việt, phong cách thân mật `t/m`, thích câu trả lời trực tiếp và thực hành trên project hơn lý thuyết dài dòng.

## 2. Workspace và Git

Repository:

```text
C:\Users\Dell\projectdalat\AIPRO-Route_DaLat
```

Remote:

```text
https://github.com/YongQi241/AIPRO-Route_DaLat.git
```

Branch frontend đang dùng:

```text
frontend
```

Trạng thái đã biết khi tạo context:

```text
frontend và origin/frontend cùng ở commit 0142659
main và origin/main ở commit b1c1144
```

Các commit frontend gần nhất:

```text
0142659 Document API integration and highlight active search branches
a5bb36d Add manual route playback and progressive highlighting
```

Pull Request đã tạo:

```text
PR #3: https://github.com/YongQi241/AIPRO-Route_DaLat/pull/3
frontend → main
```

Branch backup cho lần thử chuyển sang Python:

```text
python-migration-backup tại commit 04fbee7
```

Người dùng/leader đã quyết định giữ bản React. Không tự chuyển project sang Python trở lại nếu không có yêu cầu mới rõ ràng.

### Thay đổi chưa commit khi tạo file context

Trước khi tạo `AI-CONTEXT.md`, working tree có:

```text
?? docs/frontend-zero-to-understanding-tutor-prompt.md
```

File prompt học frontend này được tạo sau PR #3 và chưa commit/push. `AI-CONTEXT.md` cũng sẽ là file mới chưa commit sau khi được tạo. Không tự commit/push khi người dùng chưa yêu cầu.

## 3. Công nghệ frontend hiện tại

- React 19.
- Vite 6.
- Zustand 5.
- Functional Components và Hooks.
- CSS thuần, chia theo component.
- SVG để render graph/map.
- GeoJSON cho node coordinates và road geometries.
- Fetch API cho backend hoặc demo fixture.

Lệnh chạy trên Windows PowerShell:

```powershell
npm install
Copy-Item .env.example .env
npm.cmd run dev
```

Build:

```powershell
npm.cmd run build
```

Build gần nhất đã thành công với 72 modules transformed.

Nếu PowerShell chặn `npm.ps1`, dùng `npm.cmd`.

## 4. Tài liệu quan trọng

- `README.md`: tài liệu frontend architecture và Backend API integration, đã viết lại đầy đủ.
- `data/README.md`: dataset/team integration guide gốc.
- `docs/frontend-backend-readme-prompt.md`: prompt từng dùng để tạo root README.
- `docs/frontend-zero-to-understanding-tutor-prompt.md`: prompt gia sư từ số 0, hiện chưa commit.
- `data/mock-result.json`: fixture demo `DL01 → DL09`.
- `data/generated_routes_connected/nodes_snapped.geojson`: 25 location nodes.
- `data/generated_routes_connected/edges.geojson`: 114 directed edges.

Người dùng ban đầu cũng yêu cầu bám wireframe có:

- Playback controls phía trên.
- Graph workspace ở giữa/trái.
- Algorithm sidebar bên phải.
- Log/result ở dưới.

Bottom panel sau đó được đổi thành năm tab ngang giống tab trình duyệt.

## 5. Trách nhiệm frontend/backend đã thống nhất

### Backend/Algorithm member

- Load directed graph và scenario.
- Validate request.
- Chạy thuật toán thật.
- Tạo search trace.
- Trả `path_nodes`, `path_edges`, metrics và segments.
- Tạo `explanation` dựa trên kết quả thật.

### Frontend/Display member

- Load GeoJSON để vẽ node và roads.
- Thu thập lựa chọn người dùng.
- Gửi request.
- Nhận toàn bộ result.
- Replay result bằng timeline.
- Vẽ node states, active search branch và progressive final route.
- Hiển thị log, metrics, segments và explanation.

Animation hiện tại **không phải streaming realtime**. Frontend nhận full HTTP response trước, sau đó mới replay `frontier_steps` hoặc `visited_order`.

## 6. Request và result contract

Request frontend gửi:

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

Các result field frontend đang consume:

```text
status
algorithm
scenario_id
optimization
start_node
goal_node
path_nodes
path_edges
visited_order
frontier_steps
metrics
segments
explanation
message
optimality_note (optional)
```

Status hợp lệ:

```text
success | no_path | invalid_input | error
```

Invariant quan trọng:

```text
path_edges.length === path_nodes.length - 1
```

Mỗi `path_edges[i]` phải nối đúng:

```text
path_nodes[i] → path_nodes[i + 1]
```

Graph là directed. Không tự đảo edge.

Quy ước một `frontier_steps` frame:

```json
{
  "current": "DL06",
  "frontier": ["DL14", "DL19", "DL21"],
  "visited": ["DL01", "DL02", "DL06"]
}
```

- `current`: node vừa được lấy ra để expand.
- `frontier`: toàn bộ frontier snapshot sau khi expand `current`.
- `visited`: cumulative expanded nodes.
- Node mới phải xuất hiện lần đầu trong đúng frame nó được phát hiện.

## 7. Demo mode và API mode

`src/services/routeService.js` đọc:

```dotenv
VITE_ROUTE_API_URL
```

- Có URL: gửi `POST` JSON tới backend.
- URL trống: đọc `data/mock-result.json`.

Demo mode hiện chỉ hỗ trợ:

```text
DL01 → DL09
không có intermediate location
```

Demo mode không chạy A\*. Chọn thuật toán khác chỉ thay label trong fixture. Fixture dùng để test GUI, không chứng minh optimality.

## 8. Kiến trúc frontend hiện tại

Luồng chính:

```text
index.html
  → src/main.jsx
  → src/App.jsx
  → AppShell
      ├─ topBar
      ├─ workspace
      ├─ sidebar
      └─ bottomPanel
```

Data flow:

```text
GeoJSON
  → useGraphData
  → Zustand graphData
  → GraphWorkspace/SVG layers

User selection
  → Zustand routeSelection/selectedAlgorithm
  → useRouteSolver
  → routeService
  → Backend API hoặc mock-result.json
  → Zustand routeResult + simulation
  → map, log, result tabs
```

### Core files

- `src/App.jsx`: lắp ráp toàn app, tạo location options, nối hooks với components.
- `src/store/useAppStore.js`: nguồn state duy nhất.
- `src/hooks/useGraphData.js`: fetch và validate GeoJSON.
- `src/hooks/useRouteSolver.js`: quản lý lifecycle gọi route service.
- `src/services/routeService.js`: chọn API/demo mode và parse response.

### Zustand state

- `graphData`: nodes, edges, loading, error.
- `selectedAlgorithm`.
- `routeSelection`: start, goal, visit nodes, scenario, optimization.
- `routeResult`.
- `requestState`.
- `simulation`: `status`, `currentStep`, `speed`.

Playback actions:

```text
play
pause
nextAction
previousAction
resetSimulation
setSpeed
setCurrentStep
completeSimulation
```

`simulation.currentStep` là con trỏ timeline chung. Map, current task, search log, progressive route đều đọc cùng step nên phải đồng bộ.

## 9. Component frontend đã xây dựng

### Layout và controls

- `AppShell`: layout only; nhận slot `topBar`, `workspace`, `sidebar`, `bottomPanel`.
- `PlaybackToolbar`: Load, Previous, Play, Pause, Next, Reset, Speed.
- `RouteSelectionControls`: start, goal, intermediate, scenario, optimization, Find route.
- `AlgorithmSidebar`: chọn BFS/DFS/UCS/Dijkstra/A\*, không chạy thuật toán.
- `StatusMessage`: graph/request feedback.

### Graph/SVG

- `GraphWorkspace`: bounds/projection, layer composition, zoom/pan/reset.
- `graphGeometry.js`: chuyển GeoJSON LineString/MultiLineString thành SVG path.
- `RoadNetworkLayer`: roads nền.
- `GraphNodeLayer`: node states và enlarged latest-confirmed node.
- `SearchAnimationLayer`: timer playback và node states theo frame.
- `SearchTraversalLayer`: active search branch màu cyan.
- `FinalRouteLayer`: progressive final route màu xanh và warning styles.
- `searchTimeline.js`: frame, confirmed route prefix và active branch logic.

Map controls hiện có:

- Wheel: zoom.
- Chuột trái kéo: pan.
- Nút `+`, `−`.
- Reset view.
- Zoom giới hạn khoảng `0.6` đến `5`.

### Bottom panel tabs

Năm tab ngang:

1. Simulation → `CurrentTaskPanel`.
2. Algorithm trace → `SearchLogPanel`.
3. Output → `RouteResultPanel`.
4. Breakdown → `SegmentDetails`.
5. Human-readable reasoning → `RouteExplanation`.

Giữ UI tab ngang này nếu sửa các phần khác.

## 10. Manual playback đã triển khai

`PlaybackToolbar` có:

- `Previous action`.
- `Next action`.

Hành vi:

- Nhấn Previous/Next khi Play sẽ Pause.
- Không vượt frame đầu/cuối.
- Next tại cuối chuyển status thành completed.
- Previous từ completed chuyển về paused.
- Reset về step 0.
- Play sau completed replay từ đầu.
- Hai nút disable khi không có successful animation result.

Previous/Next không gọi thuật toán từng bước. Chúng chỉ thay đổi `simulation.currentStep` trên full result đã nhận.

## 11. Progressive final-route highlight

Fixture final route:

```text
path_nodes: DL01 → DL06 → DL19 → DL09
path_edges: E005 → E041 → E064
```

Frontend xác nhận prefix liên tục:

- Tới `DL06`: highlight `E005`, enlarge `DL06`.
- Tới `DL19`: highlight `E005`, `E041`, enlarge `DL19`.
- Tới `DL09`: highlight đủ ba edge, enlarge `DL09`.

Chỉ edge trong `result.path_edges` được dùng cho progressive final route.

## 12. Active search branch highlight

Yêu cầu bổ sung của người dùng:

> Khi đang xét một node không nhất thiết nằm trên final route, đường khám phá dẫn từ start tới node đó cũng phải sáng.

Ví dụ khi current node là `DL02`, highlight đường từ `DL01 → DL02` nếu trace/GeoJSON chứng minh quan hệ đó.

Logic hiện tại trong `getActiveSearchBranchEdgeIds`:

1. Khi node xuất hiện lần đầu trong `frontier`, ghi `current` của frame làm discovery parent.
2. Khi node trở thành `current`, lần ngược parent về start.
3. Khớp từng directed pair `from_node → to_node` với `edge_id` trong GeoJSON.
4. Nếu thiếu parent/edge hoặc có cycle, trả rỗng thay vì đoán.

`SearchTraversalLayer` vẽ nhánh này bằng cyan/glow. Nó khác với progressive final route màu xanh lá.

Nếu chỉ có `visited_order`, frontend không đủ dữ liệu xác định discovery parent và không nên đoán road.

## 13. Dataset frontend cần hiểu

### `nodes_snapped.geojson`

Chứa location points. Ví dụ `DL01`:

```text
node_id: DL01
name_vi: Nhà lao thiếu nhi Đà Lạt
geometry.type: Point
coordinates: [longitude, latitude]
```

Frontend dùng để:

- Vẽ icon/node.
- Tạo start/destination selectors.
- Hiển thị name/ID.
- Đổi màu, phóng to node theo animation.

### `edges.geojson`

Chứa directed road geometries. Ví dụ `E001`:

```text
edge_id: E001
from_node: DL01
to_node: DL02
geometry.type: LineString
```

Frontend dùng để:

- Vẽ road network.
- Match `path_edges`.
- Match active branch bằng đúng directed pair.

Không tự động hiểu `DL01 → DL02` đồng nghĩa `DL02 → DL01`.

## 14. Các hướng từng thử và quyết định cuối

Đã từng có yêu cầu chuyển toàn bộ frontend sang Python/PySide6. Một bản Python đã tồn tại và được backup trên `python-migration-backup`. Sau đó leader muốn giữ bản React, nên working branch được đưa về `frontend`.

Đã có các yêu cầu UI liên quan nền panel đen/chữ khó đọc và map zoom/pan trong bản Python. Những yêu cầu đó thuộc nhánh/thử nghiệm Python, không mặc định áp dụng lại vào React nếu source React không có lỗi tương tự.

Đã có một lần người dùng yêu cầu rollback ngay các chỉnh sửa UI panel. Sau đó yêu cầu chính xác được chốt là biến Simulation, Algorithm trace, Output, Breakdown và Human-readable reasoning thành năm tab ngang. Source React hiện tại đã theo quyết định tab ngang.

## 15. README integration đã hoàn thành

Root `README.md` đã được viết lại theo `docs/frontend-backend-readme-prompt.md`, bao gồm:

- Frontend/backend responsibility split.
- Tech stack và directory tree.
- Architecture/data flow.
- Component responsibilities.
- Zustand/playback.
- Active branch và progressive route.
- API request/success/failure contracts.
- `frontier_steps` convention.
- CORS và `.env`.
- Demo mode.
- Run/build/API test.
- Troubleshooting và checklist.

Các JSON example trong README đã được parse kiểm tra hợp lệ. `git diff --check` và production build đã pass trước commit `0142659`.

Production caveat đã ghi trong README: source đang fetch các URL dưới `data/`, nhưng Vite production build không tự đảm bảo copy thư mục đó. Deployment phải phục vụ `/data/...` hoặc nhóm phải thống nhất chuyển/copy assets sang `public`.

## 16. Tiến độ học frontend của người dùng

Người dùng nói họ đã vibe code toàn bộ frontend và gần như không hiểu HTML, CSS, JavaScript hoặc React. Họ yêu cầu AI đóng vai giáo viên giúp lấy gốc và thích **thực hành trực tiếp**.

Prompt giảng dạy nằm tại:

```text
docs/frontend-zero-to-understanding-tutor-prompt.md
```

Khi dạy:

- Dạy từ trực giác → định nghĩa → ví dụ nhỏ → source thật → bài tập.
- Không dùng thuật ngữ chưa giải thích.
- Mỗi lần chỉ một bài nhỏ.
- Sau bài có 3–5 câu kiểm tra và một bài thực hành.
- Không chỉ hỏi “hiểu chưa”; yêu cầu người dùng nói lại/dự đoán/thao tác.
- Mặc định không sửa source trong lúc học.
- Không sang bài mới quá nhanh nếu kiến thức gốc chưa chắc, trừ khi người dùng chủ động yêu cầu tiếp và phần thiếu có thể được vá trong bài sau.

### Khảo sát ban đầu của người dùng

Người dùng trả lời:

1. Hiểu file là nơi chứa code/text; từng nhầm folder là file chứa địa chỉ file.
2. Chưa từng viết HTML/CSS.
3. Quên object là gì; kiến thức JavaScript nền yếu.
4. Chưa từng dùng DevTools.
5. Muốn học bằng thực hành trực tiếp.

### Bài 1 đã dạy

Chủ đề:

```text
Trình duyệt, frontend và backend là gì?
```

Đã dạy:

- File khác folder.
- Browser/client/server.
- URL, request, response.
- HTML/CSS/JavaScript roles.
- DOM ở mức trực giác.
- Luồng `index.html → main.jsx → App.jsx`.
- API mode khác Demo mode.
- DevTools Elements/Console/Network.

Kết quả kiểm tra:

- Người dùng hiểu folder là ngăn chứa, file chứa dữ liệu.
- Hiểu HTML tạo cấu trúc nhưng chưa nhắc được CSS/JavaScript roles.
- Hiểu frontend gửi request và backend chạy thuật toán.
- Hiểu `root` là vùng React đưa giao diện vào, ban đầu gọi là “dữ liệu”.
- Chưa thực hiện/hiểu rõ việc chỉnh DOM tạm trong DevTools rồi refresh.

Đã giải thích rằng sửa `Load data` thành `Hello` trong Elements chỉ đổi DOM trong bộ nhớ; refresh sẽ trở lại source.

### Câu hỏi chen giữa về GeoJSON

Người dùng hỏi `nodes_snapped.geojson` và `edges.geojson` là gì.

Đã giải thích:

```text
nodes_snapped.geojson = các điểm địa điểm
edges.geojson = các đường có hướng nối các điểm
```

Đã dùng sample thật:

- `DL01`: Point, Nhà lao thiếu nhi Đà Lạt.
- `E001`: LineString, `DL01 → DL02`.

Đã nhấn mạnh frontend match `edge_id`, không đoán cạnh bằng tọa độ.

Người dùng chưa trả lời ba câu kiểm tra GeoJSON mà yêu cầu sang bài mới.

### Bài 2 đang học

Chủ đề hiện tại:

```text
HTML: Tag, element và quan hệ cha–con
```

Đã dạy:

- Tag mở/tag đóng.
- Element.
- Attribute.
- `className` trong JSX.
- Parent, child, sibling.
- Semantic tags: `div`, `header`, `main`, `section`, `aside`.
- Cây layout thật trong `AppShell.jsx`.
- `App.jsx` truyền `topBar`, `workspace`, `sidebar`, `bottomPanel` vào `AppShell`.
- Thực hành quan sát cây `div.app-shell` bằng DevTools Elements.

Câu hỏi đang chờ người dùng trả lời:

1. Parent của `section` trong đoạn `<main>` là gì?
2. `section` và `aside` có quan hệ gì?
3. Tag nào chứa danh sách thuật toán?
4. `className` dùng hiển thị chữ hay nhận diện element?
5. Bỏ `</main>` có thể xảy ra gì?

Bài thực hành đang chờ:

```text
1. Ba child trực tiếp của div.app-shell.
2. Hai child trực tiếp của main.app-shell__main.
3. Vùng sáng khi hover aside.app-shell__sidebar trong DevTools.
```

### Bài nên dạy tiếp

Sau khi review phần trên, tiếp tục phần HTML form:

- `form`.
- `fieldset`.
- `label`.
- `select` và `option`.
- `button`.
- Submit event.
- `disabled`, `aria-label`, `aria-invalid` ở mức cơ bản.

Dùng source thật:

```text
src/components/route-selection/RouteSelectionControls.jsx
src/components/playback/PlaybackToolbar.jsx
```

Sau HTML mới chuyển qua CSS nền tảng, rồi JavaScript từ số 0. Không nhảy ngay vào React Hooks vì người dùng chưa nắm biến/object/function.

## 17. Quy tắc cho AI tiếp theo

1. Luôn đọc source hiện tại trước khi mô tả hành vi.
2. Không tự ý sửa backend hoặc thuật toán.
3. Không tuyên bố frontend chạy A\*.
4. Không mô tả animation là streaming realtime.
5. Preserve UI five-tab bottom panel.
6. Preserve Play/Pause/Previous/Next/Reset/Speed và map zoom/pan.
7. Khi sửa graph highlight, chỉ dùng ID/trace có bằng chứng; không đoán bằng tọa độ.
8. Kiểm tra `git status` trước khi edit vì có file học tập chưa commit.
9. Không commit/push/merge nếu người dùng chỉ hỏi giải thích hoặc học.
10. Khi dạy, dùng tiếng Việt đơn giản, trực tiếp, ví dụ từ source thật và bài tập ngắn.

## 18. File nên đọc đầu tiên theo loại nhiệm vụ

### Nếu tiếp tục dạy

```text
docs/frontend-zero-to-understanding-tutor-prompt.md
docs/AI-CONTEXT.md
src/components/layout/AppShell.jsx
src/components/route-selection/RouteSelectionControls.jsx
src/components/playback/PlaybackToolbar.jsx
```

### Nếu sửa API integration

```text
README.md
src/services/routeService.js
src/hooks/useRouteSolver.js
src/store/useAppStore.js
data/mock-result.json
```

### Nếu sửa animation/highlight

```text
src/store/useAppStore.js
src/components/graph/GraphWorkspace.jsx
src/components/graph/SearchAnimationLayer.jsx
src/components/graph/searchTimeline.js
src/components/graph/SearchTraversalLayer.jsx
src/components/graph/FinalRouteLayer.jsx
data/mock-result.json
data/generated_routes_connected/edges.geojson
```

### Nếu sửa layout/UI

```text
src/App.jsx
src/components/layout/AppShell.jsx
src/components/panels/BottomPanelTabs.jsx
CSS file tương ứng với component được sửa
```

## 19. Điều chưa được yêu cầu hoàn tất

- Chưa commit/push prompt gia sư và context file này.
- Người dùng chưa hoàn thành bài kiểm tra Bài 2.
- Backend API thật chưa nằm trong phạm vi frontend và không được tự xây nếu không có yêu cầu thay đổi phạm vi rõ ràng.
- Demo mode vẫn chỉ có fixture `DL01 → DL09`.

---

Khi tiếp quản, hãy hỏi/đọc yêu cầu mới nhất của người dùng trước. Những yêu cầu cũ trong file này là bối cảnh; không tự động tiếp tục code, commit hoặc giảng bài nếu người dùng đang yêu cầu một việc khác.
