# Task: Khôi phục inferred search-path highlight chỉ bằng frontend

## Vai trò

Bạn là Senior React Frontend Engineer, có kinh nghiệm với React 19, Zustand, SVG, GeoJSON và trực quan hóa thuật toán tìm kiếm.

Project:

```text
C:\Users\Dell\projectdalat\AIPRO-Route_DaLat
```

Branch làm việc:

```text
frontend
```

## Bối cảnh

Frontend nhận toàn bộ kết quả tìm kiếm sau khi backend chạy xong rồi phát lại animation bằng:

```text
frontier_steps
visited_order
path_nodes
path_edges
```

Backend hiện không cung cấp `parent`, `via_edge` hoặc active-path snapshot trong từng bước. Tuy nhiên, yêu cầu UI hiện tại là vẫn phải minh họa đường tìm kiếm đang hoạt động bằng cách suy diễn ở frontend.

Đây là đường minh họa tiến trình tìm kiếm, có thể không phản ánh chính xác predecessor cuối cùng của A*, Dijkstra hoặc UCS. Final route vẫn phải lấy tuyệt đối từ `result.path_edges` và không được suy diễn.

## Phạm vi bắt buộc

Chỉ được sửa frontend:

```text
src/
```

Có thể bổ sung frontend-only tests nếu cần.

Không được sửa:

```text
backend/
algorithms/
advance_search/
data/
requirements.txt
```

Không được:

- Thêm hoặc sửa thuật toán tìm đường phía backend.
- Thay đổi API response contract.
- Yêu cầu backend bổ sung `parent`, `via_edge` hoặc trường mới.
- Tự tính shortest path trong frontend.
- Thay đổi `result.path_nodes` hoặc `result.path_edges`.
- Suy luận cạnh bằng khoảng cách tọa độ.
- Đảo chiều directed edge nếu cạnh đúng chiều không tồn tại.
- Làm hỏng Play, Pause, Reset, Previous action, Next action, Speed, Map/Graph, zoom hoặc pan.
- Commit, push hoặc merge nếu người dùng chưa yêu cầu riêng.

## Các file phải đọc trước khi sửa

```text
src/store/useAppStore.js
src/components/graph/GraphWorkspace.jsx
src/components/graph/GraphNodeLayer.jsx
src/components/graph/SearchAnimationLayer.jsx
src/components/graph/SearchTraversalLayer.jsx
src/components/graph/SearchTraversalLayer.css
src/components/graph/FinalRouteLayer.jsx
src/components/graph/searchTimeline.js
src/components/graph/topologyLayout.js
data/mock-result.json
data/README.md
```

Chỉ đọc file trong `data/` để hiểu contract; không sửa chúng.

## Mục tiêu chính

Khôi phục đường highlight màu cyan biểu diễn nhánh tìm kiếm từ node bắt đầu đến node đang được xét, kể cả đối với:

```text
BFS
DFS
UCS
Dijkstra
A*
Greedy
Hill Climbing
```

Việc này phải được thực hiện hoàn toàn ở frontend bằng timeline đã nhận và directed edges trong GeoJSON.

## Quy tắc suy diễn predecessor

Tạo một pure function tập trung trong `searchTimeline.js`. Không đặt logic suy diễn rải rác trong component.

Ví dụ API:

```js
getInferredSearchBranchEdgeIds(
  result,
  currentStep,
  edgeFeatures,
)
```

Thuật toán minh họa frontend:

1. Xác định `startNode` từ `result.start_node`, nếu thiếu mới fallback sang current của frame đầu tiên.
2. Duyệt `frontier_steps` từ frame `0` đến `currentStep`.
3. Mỗi frame có `frame.current` là node cha đang được mở rộng.
4. Với mỗi node xuất hiện trong `frame.frontier` lần đầu tiên:
   - Kiểm tra có directed edge thật từ `frame.current` đến frontier node hay không.
   - Nếu có, lưu predecessor của frontier node là `frame.current` và lưu đúng `edge_id`.
   - Nếu không có cạnh đúng chiều, không tạo predecessor giả.
5. Không suy luận edge từ tọa độ hoặc khoảng cách hình học.
6. Khi node đã có predecessor, mặc định giữ predecessor ở lần discovery đầu tiên để timeline ổn định khi Next/Previous.
7. Từ current node của frame đang hiển thị, lần ngược predecessor về start node.
8. Nếu predecessor bị thiếu, tạo chu trình hoặc không nối được về start node, trả về mảng rỗng thay vì crash.
9. Nếu một cặp directed node có nhiều edge, chọn nhất quán theo thứ tự xuất hiện trong `edgeFeatures`; không đổi lựa chọn giữa các lần render.
10. Nếu frame trong tương lai có explicit `current_path_edges`, `path_edges`, `parent` hoặc `via_edge`, ưu tiên dữ liệu explicit sau khi xác thực ID và chiều cạnh. Nếu không có thì dùng inference nói trên.

## Hành vi highlight bắt buộc

### Node highlight phải được giữ nguyên

Không được xóa hoặc làm yếu các trạng thái:

- `current`: node đang xét, màu cam và có pulse.
- `frontier`: node đang chờ xét, màu vàng.
- `visited`: node đã xét, màu xanh.
- `confirmed/latest-confirmed`: node thuộc final route đã được xác nhận, màu xanh lá và node mới nhất được phóng to.
- `final`: toàn bộ node của final route khi completed.

### Inferred active search branch

- Khi simulation là `playing` hoặc `paused`, vẽ đường cyan từ start node đến current node theo predecessor đã suy diễn.
- Phải hoạt động với nút Play và cả Previous/Next action.
- Next phải tăng đường highlight theo frame mới nếu suy diễn được.
- Previous phải khôi phục đúng nhánh được suy diễn tại frame trước.
- Reset phải xóa inferred active branch.
- Khi `simulation.status === completed`, ẩn inferred active branch để không che final route.
- Inferred branch và final route phải là hai layer/state độc lập.
- Không đưa inferred edge vào `result.path_edges`.

### Highlight cạnh đang được mở rộng

Ở frame hiện tại, frontend có thể highlight các directed edge thật từ `frame.current` đến các node mới xuất hiện trong frontier của frame đó.

Ví dụ:

```text
Current: DL01
Frontier: DL02, DL05, DL22, DL06
```

Nếu GeoJSON có các directed edge tương ứng thì đường từ `DL01` đến những node vừa được phát hiện được phép sáng cyan như các cạnh đang được kiểm tra.

Yêu cầu:

- Chỉ highlight edge có thật trong `edgeFeatures` và đúng `from_node → to_node`.
- Không nối trực tiếp hai node chỉ vì chúng ở gần nhau trên màn hình.
- Phân biệt rõ branch dẫn tới current node và outgoing discovery edges nếu cần bằng opacity hoặc CSS class, nhưng không redesign UI.
- Nếu timeline không cho biết chính xác frontier item nào đang được xét riêng lẻ, hiển thị tất cả outgoing discovery edges của frame đó và xem đây là animation minh họa.

## Map mode và Graph mode

- `SearchTraversalLayer` chỉ được render đúng một lần.
- Layer phải nhận `displayEdgeFeatures`, không nhận raw `edgeFeatures` trực tiếp khi đang ở Graph mode.
- Map mode dùng GeoJSON road geometry.
- Graph mode dùng edge geometry do `createTopologyLayout()` tạo.
- Road layer, inferred traversal layer, final route layer và node layer phải dùng cùng một hệ tọa độ trong mỗi mode.
- Không làm hỏng opposing directed edges hoặc self-loops trong Graph mode.

## Final route tuyệt đối không được thay đổi

Final route chỉ được lấy từ:

```text
result.path_nodes
result.path_edges
```

Không được dùng inferred branch làm final route.

Progressive final route vẫn hoạt động theo:

```text
confirmedRoute.visiblePathNodes
confirmedRoute.visiblePathEdges
confirmedRoute.latestConfirmedNodeId
```

Màu sắc phải tiếp tục phân biệt:

- Inferred search branch: cyan.
- Final route bình thường: blue.
- Final route warning/risk: orange.
- Confirmed/final nodes: green.

## Trạng thái UI và chú thích

Vì active branch được suy diễn, thêm một chú thích ngắn, không gây rối UI, ví dụ trong legend hoặc title:

```text
Inferred search path
```

Không mô tả nó là đường chính xác do backend lựa chọn.

Không cần popup cảnh báo lớn và không thay đổi layout tổng thể.

## Kiểm thử bắt buộc

### Static checks

- `GraphWorkspace` chỉ render một `SearchTraversalLayer`.
- Traversal layer dùng `displayEdgeFeatures`.
- Không có file backend, algorithm hoặc data nào bị thay đổi.
- Inference nằm tập trung trong `searchTimeline.js` hoặc module frontend chuyên biệt.

### Pure function tests

Tạo graph nhỏ có directed edges:

```text
A → B: E1
A → C: E2
B → D: E3
C → D: E4
```

Kiểm tra:

1. Frame A phát hiện B, C: discovery edges là E1, E2.
2. Frame B phát hiện D: inferred branch tới B là E1.
3. Frame D: inferred branch ổn định theo predecessor lần discovery đầu tiên.
4. Previous quay lại B: branch trở lại E1.
5. Directed edge ngược chiều không được sử dụng.
6. Missing predecessor hoặc cycle trả về `[]` và không crash.
7. A*, Dijkstra và UCS cũng có inferred highlight từ frontend.

### Existing functionality

- Current/frontier/visited nodes vẫn đổi màu đúng.
- Latest confirmed final-route node vẫn phóng to.
- Progressive final route vẫn tăng/giảm theo Next/Previous.
- Completed chỉ hiển thị final route, không hiển thị inferred branch.
- Reset xóa inferred branch và progressive highlight.
- Wheel zoom, left-click pan, Map/Graph switch và Reset view vẫn hoạt động.

### Build

Chạy:

```powershell
npm.cmd run build
```

Sau đó chạy:

```powershell
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

- Active search road highlight xuất hiện trở lại cho mọi thuật toán có timeline.
- Highlight được suy diễn hoàn toàn ở frontend.
- Không cần backend bổ sung thông tin.
- Node highlight hiện tại được giữ nguyên.
- Đường highlight sử dụng directed edge thật, không dùng tọa độ để đoán.
- Previous/Next/Play/Reset hoạt động nhất quán.
- Không còn duplicate traversal layer hoặc trộn hệ tọa độ.
- Final route vẫn chính xác tuyệt đối theo `result.path_edges`.
- Build thành công.
- Backend và data không thay đổi.

## Báo cáo cuối

Báo cáo:

1. File frontend đã sửa.
2. Quy tắc inference đã triển khai.
3. Hành vi của Play/Previous/Next/Reset.
4. Cách phân biệt inferred branch và final route.
5. Test đã chạy và kết quả.
6. Xác nhận backend/data không thay đổi.
7. Nêu rõ giới hạn sau:

> Inferred search path là hình ảnh minh họa do frontend tái dựng từ thứ tự discovery trong timeline. Với weighted algorithms, nó có thể khác predecessor nội bộ cuối cùng của backend; final route vẫn luôn dùng chính xác `result.path_edges`.

Hãy đọc source hiện tại, lập kế hoạch ngắn rồi triển khai. Chỉ sửa frontend.
