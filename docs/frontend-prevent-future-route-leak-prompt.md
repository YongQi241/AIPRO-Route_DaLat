# Task: Ngăn frontend làm lộ final route trong lúc phát search animation

## Vai trò

Bạn là Senior React Frontend Engineer chuyên React 19, Zustand, SVG, GeoJSON và trực quan hóa thuật toán tìm kiếm.

Project:

```text
C:\Users\Dell\projectdalat\AIPRO-Route_DaLat
```

Branch hiện tại:

```text
frontend
```

## Vấn đề cần sửa

Frontend nhận toàn bộ kết quả từ backend trước khi bắt đầu playback, bao gồm:

```text
frontier_steps
visited_order
path_nodes
path_edges
```

Do frontend đã biết `path_nodes/path_edges`, code hiện tại dùng `getConfirmedRoutePrefix()` để tô xanh node thuộc final route và highlight progressive final-route edge ngay khi node đó xuất hiện trong `current` hoặc `visited`.

Điều này làm lộ đáp án tương lai và gây hiểu nhầm rằng thuật toán đã chốt node đó thuộc tuyến tối ưu.

Ví dụ A* từ `DL01 → DL18`:

```text
Backend final route:
DL01 → DL22 → DL21 → DL10 → DL18
```

Khi playback vừa xét DL22, UI đã tô xanh DL22 và highlight `DL01 → DL22`. Sau đó A* tiếp tục xét DL06. Người xem vì thế hiểu nhầm rằng thuật toán đã chốt DL22 rồi nhưng vẫn kiểm tra node khác.

Thực tế, việc một node được đưa ra khỏi frontier để mở rộng không chứng minh node đó đã được xác nhận thuộc final route. Backend trace hiện không cung cấp predecessor/current-path/settled-final-prefix đủ để frontend xác nhận final route theo từng bước.

## Mục tiêu

Trong lúc thuật toán đang được phát lại:

- Chỉ hiển thị trạng thái search thực sự có trong trace:
  - Current node.
  - Frontier nodes.
  - Visited nodes.
  - Inferred search branch.
  - Newly discovered directed edges.
- Không tô node xanh chỉ vì node đó nằm trong `result.path_nodes`.
- Không highlight bất kỳ phần nào của `result.path_edges` như final route trước khi simulation hoàn tất.

Chỉ khi simulation hoàn tất mới:

- Highlight toàn bộ final route từ `result.path_edges`.
- Tô xanh toàn bộ final-route nodes từ `result.path_nodes`.
- Ẩn inferred search branch và discovery edges.

## Phạm vi tuyệt đối

Chỉ được sửa frontend:

```text
src/
```

Có thể thêm frontend-only tests nếu cần.

Không được sửa:

```text
backend/
algorithms/
advance_search/
data/
requirements.txt
```

Không được:

- Thay đổi thuật toán BFS, DFS, UCS, Dijkstra, A*, Greedy hoặc Hill Climbing.
- Thay đổi API response contract.
- Yêu cầu backend thêm trường dữ liệu mới.
- Tự tính shortest path trong frontend.
- Thay đổi `result.path_nodes` hoặc `result.path_edges`.
- Suy luận final route từ tọa độ.
- Làm hỏng inferred search-path highlight vừa được bổ sung.
- Làm hỏng Play, Pause, Reset, Previous action, Next action hoặc Speed.
- Làm hỏng Map/Graph, wheel zoom, left-click pan hoặc Reset view.
- Commit, push hoặc merge nếu người dùng chưa yêu cầu riêng.

## Trạng thái Git cần bảo toàn

Trước khi sửa, chạy:

```powershell
git status --short --branch
git diff --name-only
```

Project có thể đang có các thay đổi frontend chưa commit từ những nhiệm vụ trước. Phải giữ lại chúng và chỉ chỉnh đúng phần cần thiết. Không xóa hoặc ghi đè file untracked không liên quan.

## File bắt buộc phải đọc

```text
src/store/useAppStore.js
src/components/graph/GraphWorkspace.jsx
src/components/graph/GraphNodeLayer.jsx
src/components/graph/GraphNodeLayer.css
src/components/graph/SearchAnimationLayer.jsx
src/components/graph/SearchTraversalLayer.jsx
src/components/graph/FinalRouteLayer.jsx
src/components/graph/searchTimeline.js
src/components/playback/PlaybackToolbar.jsx
src/components/panels/CurrentTaskPanel.jsx
src/components/panels/SearchLogPanel.jsx
data/mock-result.json
data/README.md
```

Chỉ đọc `data/` để hiểu contract; không sửa dữ liệu.

## Quy tắc hiển thị theo simulation status

### `idle`

- Không hiển thị inferred branch.
- Không hiển thị discovery edges.
- Không hiển thị progressive final route.
- Không tô node theo final route.
- Graph trở về trạng thái ban đầu sau Reset.

### `playing`

- Hiển thị current/frontier/visited theo frame hiện tại.
- Current node phải màu cam và có pulse, kể cả khi node đó nằm trong `result.path_nodes`.
- Hiển thị inferred search branch màu cyan nếu suy diễn được.
- Hiển thị newly discovered edges theo style hiện có.
- Không hiển thị final-route edge.
- Không dùng `path_nodes` để tô xanh node.

### `paused`

- Giữ chính xác trạng thái frame hiện tại.
- Previous/Next phải khôi phục current/frontier/visited và inferred highlight của frame tương ứng.
- Không hiển thị final-route edge hoặc final node.

### `completed`

- Ẩn toàn bộ inferred branch và discovery edges.
- Hiển thị toàn bộ `result.path_edges` bằng `FinalRouteLayer`.
- Tô xanh toàn bộ `result.path_nodes`.
- Không hiển thị `latest-confirmed` vì không còn khái niệm progressive confirmation.
- Current/frontier/visited không được có ưu tiên màu cao hơn final nodes.

### Result thành công nhưng không có timeline

Nếu `result.status === 'success'` nhưng không có `frontier_steps` và `visited_order`:

- Không có animation để phát.
- Có thể hiển thị full final route ngay vì không tồn tại trạng thái playback trung gian.
- Không tạo inferred branch.

## Thay đổi logic bắt buộc

### 1. Gỡ progressive final-route reveal khỏi `GraphWorkspace`

Không được truyền:

```text
confirmedRoute.visiblePathEdges
confirmedRoute.visiblePathNodes
confirmedRoute.latestConfirmedNodeId
```

vào final/node layers trong lúc `playing` hoặc `paused`.

Logic mong muốn tương đương:

```js
const showFinalPath =
  isSuccessful &&
  (simulation.status === SIMULATION_STATUS.COMPLETED ||
    frame.totalSteps === 0)

const visiblePathEdges = showFinalPath ? result.path_edges ?? [] : []
const visiblePathNodes = showFinalPath ? result.path_nodes ?? [] : []
```

Không nhất thiết phải chép nguyên đoạn trên nếu có cách rõ ràng hơn, nhưng behavior phải giống.

### 2. Không để final-route membership ghi đè current node

Trong lúc chưa completed, một node thuộc `result.path_nodes` vẫn phải hiển thị theo trạng thái trace:

```text
current > frontier > visited > unvisited
```

Không được tô `confirmed/latest-confirmed` trong playback.

Khi completed:

```text
final node state
```

được áp dụng cho toàn bộ `result.path_nodes`.

### 3. Giữ inferred search highlight

Không xóa hoặc vô hiệu hóa:

```text
getInferredSearchBranchEdgeIds()
getInferredDiscoveryEdgeIds()
SearchTraversalLayer
```

Trong `playing/paused`:

- Inferred branch và discovery edges tiếp tục hiển thị.
- `SearchTraversalLayer` chỉ render đúng một lần.
- Layer dùng `displayEdgeFeatures` để Map và Graph mode cùng hệ tọa độ.

Trong `idle/completed`:

- Hai loại inferred highlight đều rỗng.

### 4. Có thể giữ hoặc xóa dead code có kiểm soát

Nếu `getConfirmedRoutePrefix()` không còn caller sau thay đổi:

- Có thể xóa function và import liên quan để tránh dead code; hoặc
- Giữ lại nếu có test/consumer frontend thực sự cần.

Không được xóa bừa các function khác trong timeline.

## Ý nghĩa màu sắc bắt buộc

- Current node: cam, có pulse.
- Frontier node: vàng.
- Visited node: xanh dương nhạt.
- Inferred branch/discovery: cyan.
- Final route edge: xanh dương hoặc cam cảnh báo.
- Final route node: xanh lá, chỉ khi completed hoặc không có timeline.

Không redesign UI.

## Test case bắt buộc

### Case chính: A* DL01 → DL18

Request:

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

Backend final route hiện tại:

```text
path_nodes:
DL01 → DL22 → DL21 → DL10 → DL18

path_edges:
E009 → E104 → E074 → E069
```

Trong playback:

1. Khi current là DL22:
   - DL22 phải mang state `current`, màu cam và pulse.
   - Không được mang state `confirmed`, `latest-confirmed` hoặc `final`.
   - `E009` không được hiển thị bởi `FinalRouteLayer`.
   - Inferred/discovery cyan vẫn có thể xuất hiện.

2. Khi current tiếp theo là DL06:
   - DL06 phải màu cam và pulse.
   - DL22 lúc này trở thành visited theo trace, không phải final node.
   - Không được giữ đoạn final `DL01 → DL22` như thể đã chốt.

3. Khi current là DL10 và DL18 mới xuất hiện trong frontier:
   - Discovery edge `E069: DL10 → DL18` có thể sáng cyan.
   - Không được coi đây là final route confirmation.

4. Khi simulation completed:
   - Inferred branch/discovery biến mất.
   - Full final path xuất hiện đúng `E009,E104,E074,E069`.
   - Các node `DL01,DL22,DL21,DL10,DL18` trở thành final nodes màu xanh lá.

### Manual stepping

- Previous từ completed về paused phải ẩn full final route ngay và khôi phục search frame trước.
- Next tới last step theo store hiện tại có thể chuyển completed; khi đó final route mới xuất hiện.
- Reset đưa về idle và xóa tất cả route highlights.
- Replay sau completed bắt đầu lại mà không để final route tồn tại ở frame đầu.

### Result không có timeline

- Successful result vẫn hiển thị full final route.
- Không crash.

### Static checks

- Chỉ một `SearchTraversalLayer` trong `GraphWorkspace`.
- Traversal nhận `displayEdgeFeatures`.
- `FinalRouteLayer` chỉ nhận full `result.path_edges` khi `showFinalPath` là true.
- Không còn progressive final-route edge/node trong `playing/paused`.
- Node current/frontier/visited CSS không bị xóa.
- Không có backend/data/algorithm file nào thay đổi.

### Build và Git checks

Chạy:

```powershell
npm.cmd run build
git diff --check
git diff --name-only
git status --short
```

Fail nhiệm vụ nếu có file thay đổi dưới:

```text
backend/
algorithms/
advance_search/
data/
```

## Tiêu chí hoàn thành

- DL22 không còn bị tô như final node khi A* chỉ mới xét nó.
- DL06 vẫn được hiển thị hợp lý là current node ở frame kế tiếp.
- Không còn final-route future leak trong playing/paused.
- Search animation vẫn giữ current/frontier/visited và inferred cyan edges.
- Full final route chỉ xuất hiện khi completed hoặc khi result không có timeline.
- Previous/Next/Reset/Replay hoạt động đúng.
- Map/Graph/zoom/pan không bị ảnh hưởng.
- Build thành công.
- Backend, algorithms và data không thay đổi.

## Báo cáo cuối

Trình bày:

1. Nguyên nhân UI làm lộ final route.
2. File frontend đã sửa.
3. Behavior trước và sau.
4. Kết quả case A* DL01 → DL18 tại DL22, DL06 và completed.
5. Test/build đã chạy.
6. Xác nhận backend/data/algorithms không thay đổi.

Nêu rõ:

> Current hoặc visited chỉ mô tả trạng thái search trace, không đồng nghĩa node đã được chốt thuộc final route. Vì backend trace hiện không cung cấp final-prefix confirmation, frontend chỉ hiển thị final route sau khi simulation hoàn tất.

Hãy đọc source hiện tại, lập kế hoạch ngắn và thực hiện sửa lỗi. Chỉ sửa frontend.
