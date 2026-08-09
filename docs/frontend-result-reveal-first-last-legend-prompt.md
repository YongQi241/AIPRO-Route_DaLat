# Task: Result Reveal Lifecycle, First/Last Controls và Graph Legend Correction

## Bối cảnh project

Bạn đang làm việc trên frontend React của project:

- React 19
- Vite
- Zustand
- SVG map
- Branch hiện tại: `frontend`

Hãy đọc source hiện tại trước khi chỉnh sửa, đặc biệt:

- `src/App.jsx`
- `src/hooks/useGraphData.js`
- `src/hooks/useRouteSolver.js`
- `src/store/useAppStore.js`
- `src/components/playback/PlaybackToolbar.jsx`
- `src/components/playback/PlaybackToolbar.css`
- `src/components/panels/BottomPanelTabs.jsx`
- `src/components/panels/BottomPanelTabs.css`
- `src/components/results/RouteResultPanel.jsx`
- `src/components/results/SegmentDetails.jsx`
- `src/components/results/RouteExplanation.jsx`
- `src/components/graph/GraphWorkspace.jsx`
- `src/components/graph/GraphWorkspace.css`
- `src/components/graph/GraphNodeLayer.css`
- `src/components/graph/SearchTraversalLayer.css`
- `src/components/graph/FinalRouteLayer.jsx`
- `src/components/graph/FinalRouteLayer.css`
- `src/components/graph/searchTimeline.js`

Tên hoặc vị trí file thực tế có thể khác. Hãy tìm component tương ứng trước khi sửa.

## Quy tắc bắt buộc

- Chỉ chỉnh sửa frontend React.
- Không sửa:
  - `backend/`
  - `algorithms/`
  - `advance_search/`
  - `data/`
- Không thay đổi API contract.
- Không tự tính lại thuật toán.
- Không thêm `g`, `h`, `f` lên node hoặc cạnh.
- Không rút gọn, gộp hoặc giảm số lượng micro-action.
- Giữ nguyên chức năng collapse của top panel, sidebar và bottom panel.
- Không làm hỏng:
  - Play/Pause/Reset/Speed
  - Previous/Next action
  - Find route
  - Bottom tabs
  - Map/Graph mode
  - Zoom bằng nút và con lăn
  - Pan bằng chuột trái
  - Search animation
  - Final route
- Giữ nguyên nội dung và ngôn ngữ hiện tại của `Human-readable reasoning`.
- Không commit, push hoặc merge.
- Working tree có thể đang chứa thay đổi của người dùng. Không xóa hoặc ghi đè thay đổi không liên quan.

---

# Mục tiêu 1: Bỏ nút Load data

GeoJSON đã được ứng dụng tự động tải khi khởi động, vì vậy người dùng không cần bấm `Load data`.

## Yêu cầu

- Xóa nút `Load data` khỏi `PlaybackToolbar`.
- Loại bỏ các props chỉ phục vụ nút này, ví dụ:
  - `onLoad`
  - `loadDisabled`
- Cập nhật `App.jsx` tương ứng.
- Không xóa logic tự động tải GeoJSON trong `useGraphData`.
- Kiểm tra ứng dụng vẫn tự tải:
  - Nodes.
  - Edges.
  - Danh sách Start/Destination.
  - Road network trên map.
- Nếu `loadGraphData()` đang được gọi trong `useEffect`, phải giữ nguyên.
- Không chuyển việc load dữ liệu sang thao tác thủ công khác.

Luồng mong muốn:

```text
Mở ứng dụng
→ frontend tự tải GeoJSON
→ map và danh sách địa điểm xuất hiện
→ không có nút Load data
```

---

# Mục tiêu 2: Chỉ công bố kết quả sau khi animation hoàn thành

Backend trả toàn bộ result trước khi frontend phát animation. Vì vậy hiện tại các tab kết quả làm lộ route cuối quá sớm.

Ba tab cần được kiểm soát:

- `Output`
- `Breakdown`
- `Human-readable reasoning`

## Reveal state

Bổ sung một state riêng trong Zustand, ví dụ:

```js
hasRevealedFinalResult: false
```

Có thể đặt tên khác, nhưng ý nghĩa phải rõ ràng:

```text
Route hiện tại đã từng chạy tới action cuối hay chưa?
```

Không dùng trực tiếp `simulation.status === completed` để quyết định duy trì nội dung, vì khi người dùng bấm Previous hoặc First thì status có thể chuyển về paused nhưng kết quả vẫn phải tiếp tục hiển thị.

## Trước khi hoàn thành

Khi route mới đã được backend trả về nhưng animation chưa từng tới cuối:

- Không hiển thị nội dung thật của:
  - Output.
  - Breakdown.
  - Human-readable reasoning.
- Không làm lộ:
  - `path_nodes`
  - `path_edges`
  - `segments`
  - `metrics`
  - `explanation`
  - `optimality_note`
- Có thể disable ba tab.
- Hoặc cho phép mở nhưng chỉ hiển thị một placeholder, ví dụ:

```text
Kết quả sẽ xuất hiện sau khi quá trình mô phỏng hoàn tất.
```

Ưu tiên disable ba tab để tránh nhầm lẫn.

Các tab `Simulation` và `Algorithm trace` vẫn hoạt động bình thường.

## Khi hoàn thành lần đầu

Khi animation tới action cuối bằng một trong các cách:

- Play chạy tới cuối.
- Next action đi tới cuối.
- Last action chuyển tới cuối.
- Result thành công nhưng không có timeline để phát.

Phải đặt:

```js
hasRevealedFinalResult = true
```

Sau đó:

- Output hiển thị kết quả tổng.
- Breakdown hiển thị các segment.
- Human-readable reasoning hiển thị nội dung hiện tại.
- Final route được phép xuất hiện trên map theo logic completed hiện tại.

## Khi quay lại action trước

Sau khi `hasRevealedFinalResult` đã là `true`, các thao tác sau không được đặt lại thành `false`:

- Previous action.
- First action.
- Reset simulation.
- Pause.
- Play lại.
- Thay đổi speed.
- Chuyển tab.
- Thu gọn/mở layout.

Ba tab kết quả phải tiếp tục hoạt động và giữ nguyên dữ liệu.

Lưu ý:

- Map vẫn được phép quay về trạng thái animation của action trước.
- Không bắt buộc giữ final-route overlay trên map khi đang xem lại micro-action.
- Reveal state chủ yếu kiểm soát quyền xem ba tab kết quả.
- Không dùng reveal state để làm hỏng candidate edge hoặc active relaxation.

## Khi nào được xóa reveal state?

Chỉ xóa kết quả đã công bố khi:

- Người dùng bắt đầu một yêu cầu `Find route` mới.
- Route result bị clear hoàn toàn.
- Route request mới lỗi hoặc bị thay thế.

Không xóa chỉ vì người dùng thay đổi Start/Destination nhưng chưa bấm `Find route`, trừ khi source hiện tại đã có quy tắc stale-result rõ ràng yêu cầu điều đó.

Các action thích hợp có thể là:

```js
revealFinalResult()
clearFinalResultReveal()
```

Không rải logic reveal trong nhiều component. Zustand phải là nguồn state duy nhất.

## Result không có timeline

Nếu backend trả:

```json
{
  "status": "success",
  "frontier_steps": [],
  "visited_order": []
}
```

nhưng vẫn có final route, frontend không được khóa kết quả vĩnh viễn.

Trong trường hợp không có animation:

- Reveal final result ngay.
- Hiển thị final route.
- Cho phép mở Output, Breakdown và Human-readable reasoning.

---

# Mục tiêu 3: Giữ nguyên Human-readable reasoning

Không Việt hóa phần này.

## Yêu cầu

- Giữ nguyên nội dung `result.explanation`.
- Giữ nguyên `result.optimality_note`.
- Không dịch bằng frontend.
- Không thêm thư viện dịch.
- Không thay đổi backend.
- Không thay đổi ngôn ngữ của những template hiện có nếu không cần thiết cho chức năng reveal.

Nhiệm vụ chỉ kiểm soát thời điểm nội dung được hiển thị.

---

# Mục tiêu 4: Thêm First action và Last action

Trong `PlaybackToolbar`, bổ sung:

- `First action`
- `Last action`

Thứ tự gợi ý:

```text
First action
Previous action
Play
Pause
Next action
Last action
Reset
```

## First action

Khi nhấn:

1. Nếu simulation đang chạy thì Pause.
2. Chuyển `simulation.currentStep` về `0`.
3. Đặt status thành `paused`.
4. Không xóa:
   - Route result.
   - Reveal state.
   - Output.
   - Breakdown.
   - Human-readable reasoning.
5. Không reset zoom hoặc pan.
6. Disable khi:
   - Chưa có timeline.
   - Đang ở action đầu.

Thêm Zustand action tập trung, ví dụ:

```js
firstAction()
```

## Last action

Khi nhấn:

1. Chuyển `simulation.currentStep` tới action cuối.
2. Dừng Play nếu đang chạy.
3. Đặt simulation status thành `completed`.
4. Đặt `hasRevealedFinalResult = true`.
5. Hiển thị final route.
6. Mở khóa ba tab kết quả.
7. Disable khi:
   - Chưa có timeline.
   - Đã ở action cuối và completed.

Thêm Zustand action tập trung, ví dụ:

```js
lastAction()
```

## Các action hiện có

Đảm bảo:

- `nextAction()` đi tới action cuối thì reveal kết quả.
- `completeSimulation()` reveal kết quả.
- `previousAction()` không xóa reveal state.
- `resetSimulation()` không xóa reveal state.
- `play()` sau completed có thể replay từ đầu nhưng không khóa lại kết quả đã từng được công bố.
- Route request mới phải xóa reveal state cũ.

Không đặt logic thay đổi timeline trực tiếp trong toolbar. Toolbar chỉ gọi Zustand actions.

---

# Mục tiêu 5: Sửa Graph Legend

Legend hiện tại dùng hình tròn cho cả node và edge, đồng thời không giải thích vì sao final route có đoạn xanh và đoạn cam.

## Ý nghĩa màu hiện tại phải được giữ

### Node states

- Unvisited: marker trắng, viền xám.
- Frontier: vàng nhạt, viền cam.
- Visited: xanh dương nhạt, viền xanh dương.
- Current: cam đậm, có pulse.
- Final-route node: xanh lá.

### Edge states

- Candidate edge: cyan nhạt, nét đứt.
- Active relaxation: cyan sáng.
- Normal final-route segment: xanh dương.
- Warning final-route segment: cam, nét đứt.

Warning segment hiện được xác định bởi logic hiện tại:

```js
congestion_level >= 4 || risk > 0
```

Không thay đổi điều kiện này trong nhiệm vụ hiện tại.

## Legend mới

Legend phải phân biệt rõ node và edge.

Gợi ý nội dung:

```text
○ Unvisited
○ Frontier
○ Visited
○ Current
○ Final-route node

- - - Candidate edge
━━━━ Active relaxation
━━━━ Normal route segment
- - - Warning route segment
```

## Quy tắc hiển thị

- Node state sử dụng symbol hình tròn.
- Edge state sử dụng symbol dạng đoạn thẳng.
- Candidate edge phải là đoạn cyan nhạt, nét đứt.
- Active relaxation phải là đoạn cyan sáng.
- Normal route segment phải là đoạn xanh dương.
- Warning route segment phải là đoạn cam nét đứt.
- Không dùng chấm xanh lá với label `Final path` vì điều đó làm người dùng tưởng toàn bộ đường route có màu xanh lá.
- Đổi label xanh lá thành `Final-route node` hoặc tên tương đương.
- Không để màu warning route bị hiểu nhầm thành Current hoặc Frontier.
- Legend phải responsive và có thể wrap trên màn hình hẹp.

Có thể chuyển danh sách legend thành cấu trúc object:

```js
{
  type: 'node' | 'edge',
  state: '...',
  label: '...'
}
```

CSS phải có class riêng cho node swatch và edge swatch.

---

# Không thực hiện trong task này

Tuyệt đối không:

- Thêm score lên node.
- Thêm `g`, `h`, `f`.
- Thêm tentative cost lên cạnh.
- Tự suy diễn score.
- Thay đổi micro-action timeline.
- Gộp các action `KEEP`.
- Giảm số lượng action.
- Thay đổi thứ tự candidate edge.
- Sửa thuật toán.
- Sửa backend.
- Thay đổi điều kiện warning segment.
- Việt hóa Human-readable reasoning.

---

# State lifecycle bắt buộc

Luồng route mới:

```text
Người dùng bấm Find route
→ clear reveal state của route cũ
→ backend trả result
→ animation bắt đầu
→ Output/Breakdown/Reasoning vẫn khóa
→ animation tới action cuối
→ reveal state = true
→ ba tab được mở
```

Luồng xem lại:

```text
Route đã completed
→ reveal state = true
→ người dùng Previous hoặc First
→ simulation chuyển về paused/action cũ
→ ba tab vẫn mở và giữ dữ liệu
```

Luồng tua cuối:

```text
Người dùng Last action
→ currentStep = last action
→ status = completed
→ reveal state = true
→ final route và ba tab xuất hiện
```

Luồng route không có timeline:

```text
Backend trả success + final route + không có timeline
→ reveal ngay
→ không khóa kết quả vĩnh viễn
```

---

# Accessibility

Các nút First/Last phải có:

- `<button type="button">`
- `aria-label`
- `title`
- Disabled state chính xác.
- Focus-visible rõ ràng.

Các tab bị khóa phải có:

- `disabled` nếu sử dụng button tab.
- `aria-disabled="true"` khi phù hợp.
- Không cho keyboard focus vào tab bị khóa.
- Không để keyboard navigation chọn tab đang bị khóa.

Legend không được chỉ dựa vào màu:

- Candidate và warning có nét đứt.
- Active và normal route dùng nét liền.
- Node dùng hình tròn.
- Edge dùng đoạn thẳng.

---

# Tests bắt buộc

Bổ sung hoặc cập nhật frontend tests để kiểm tra:

1. `firstAction()` đưa current step về `0`.
2. `firstAction()` chuyển trạng thái sang paused.
3. `lastAction()` chuyển tới action cuối.
4. `lastAction()` đặt status completed.
5. `lastAction()` reveal final result.
6. `nextAction()` tới cuối reveal final result.
7. `completeSimulation()` reveal final result.
8. `previousAction()` không xóa reveal state.
9. `resetSimulation()` không xóa reveal state.
10. Route request mới xóa reveal state.
11. Result thành công không có timeline được reveal ngay.
12. Output/Breakdown/Reasoning bị khóa trước reveal.
13. Ba tab hoạt động sau reveal.
14. Keyboard navigation bỏ qua tab bị disable.
15. Không còn nút Load data.
16. Legend có đủ node và edge states cần thiết.

Nếu project chưa có React DOM test framework, ưu tiên:

- Pure-function tests.
- Zustand store tests.
- Không thêm thư viện lớn chỉ để kiểm tra một vài string JSX.
- Production build phải thành công.

---

# Kiểm tra hồi quy

Sau khi sửa, kiểm tra lại:

- GeoJSON tự động load khi mở trang.
- Start/Destination có dữ liệu.
- Find route hoạt động.
- Play/Pause/Speed hoạt động.
- Previous/Next hoạt động từng micro-action.
- First/Last hoạt động đúng.
- Reset không làm mất revealed result.
- Map/Graph mode hoạt động.
- Zoom buttons hoạt động.
- Wheel zoom hoạt động.
- Left-click pan hoạt động.
- Collapse top/sidebar/bottom hoạt động.
- Active tab được giữ hợp lý.
- Search Log vẫn scroll.
- Candidate và active relaxation không bị thay đổi.
- Final route xanh/cam vẫn đúng logic hiện tại.
- Không có lỗi console.

---

# Build và Git

Chạy:

```powershell
npm.cmd test
npm.cmd run build
git diff --check
git diff --name-only
git status --short
```

Fail nếu có thay đổi trong:

```text
backend/
algorithms/
advance_search/
data/
```

Không stage, commit, push hoặc merge.

---

# Báo cáo cuối

Sau khi hoàn thành, báo cáo:

1. Những file đã sửa.
2. Nút Load data đã được loại bỏ như thế nào.
3. Reveal state được đặt ở đâu.
4. Khi nào reveal state được bật và bị xóa.
5. Behavior của First/Last/Previous/Next/Reset.
6. Cách khóa và mở ba result tabs.
7. Cấu trúc legend mới.
8. Kết quả tests/build.
9. Xác nhận không thêm score và không thay đổi micro-action timeline.
10. Các giới hạn còn lại nếu có.
