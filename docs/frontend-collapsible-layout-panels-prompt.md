# Task: Collapsible Layout Panels để mở rộng không gian bản đồ

## Bối cảnh project

Bạn đang làm việc trên frontend React của project:

- React 19
- Vite
- Zustand
- SVG map
- Branch hiện tại: `frontend`

Hãy đọc kỹ source hiện tại trước khi chỉnh sửa, đặc biệt:

- `src/AppShell.jsx`
- File CSS của `AppShell`
- `src/components/playback/PlaybackToolbar.jsx`
- `src/components/route/RouteSelectionControls.jsx`
- Component chứa Search Strategy/Algorithm Sidebar
- Component quản lý bottom tabs
- `src/components/graph/GraphWorkspace.jsx`
- `src/store/useAppStore.js`

Tên và đường dẫn thực tế có thể khác. Hãy tìm component tương ứng trong source trước khi sửa.

## Quy tắc bắt buộc

- Chỉ chỉnh sửa frontend React.
- Không sửa backend, thuật toán hoặc dữ liệu trong `data/`.
- Không thay đổi API contract.
- Không làm hỏng:
  - Play/Pause/Reset/Speed
  - Previous action/Next action
  - Find route
  - Bottom tabs
  - Map/Graph mode
  - Zoom bằng nút hoặc con lăn
  - Kéo bản đồ bằng chuột trái
  - Search animation và final route
- Không reset dữ liệu hoặc trạng thái mô phỏng khi đóng/mở panel.
- Không commit, push hoặc merge.

## Mục tiêu

Thêm khả năng thu gọn và mở rộng ba khu vực giao diện để bản đồ ở giữa tự động chiếm phần diện tích được giải phóng:

1. Khu vực điều khiển phía trên.
2. Search Strategy sidebar bên phải.
3. Bottom panel chứa các tab kết quả.

Các khu vực phải đóng/mở độc lập.

---

# 1. Thu gọn khu vực phía trên

Khu vực phía trên hiện chứa:

- Playback Toolbar
- Load data
- Previous/Next action
- Play/Pause/Reset/Speed
- Route Selection Controls
- Start location
- Destination
- Scenario
- Optimization
- Find route
- Status message nếu có

Thêm một nút hình tam giác:

- Khi khu vực đang mở: tam giác hướng lên.
- Khi khu vực đang đóng: tam giác hướng xuống.

## Khi thu gọn

- Toàn bộ nội dung điều khiển được ẩn.
- Khu vực co lên sát đầu trang.
- Chỉ giữ một thanh nhỏ đủ để chứa nút mở lại.
- Không unmount những component chứa state nội bộ nếu việc đó làm mất dữ liệu.
- Không xóa route selection, result hoặc simulation state.
- Bản đồ tự động tăng chiều cao.

## Khi mở lại

- Hiện lại đầy đủ các control.
- Giữ nguyên:
  - Start/Destination
  - Algorithm
  - Scenario
  - Optimization
  - Simulation status
  - Current action
  - Route result

---

# 2. Thu gọn Search Strategy sidebar

Search Strategy là sidebar bên phải chứa danh sách thuật toán.

Thêm nút tam giác:

- Sidebar đang mở: tam giác hướng sang phải để thu gọn.
- Sidebar đang đóng: tam giác hướng sang trái để mở lại.

## Khi thu gọn

- Sidebar co về sát mép phải.
- Chỉ giữ một strip nhỏ và nút mở lại.
- Không làm mất thuật toán đang chọn.
- Map workspace phải tự động tăng chiều rộng.
- Không để lại một vùng trống bằng chiều rộng sidebar cũ.

## Khi mở lại

- Sidebar trở về đúng kích thước ban đầu.
- Danh sách thuật toán và vị trí scroll hợp lý.
- Thuật toán đang chọn vẫn được giữ nguyên.

---

# 3. Thu gọn Bottom Panel

Bottom Panel hiện chứa các tab ngang:

- Simulation
- Algorithm trace
- Output
- Breakdown
- Human-readable reasoning

Thêm nút tam giác:

- Panel đang mở: tam giác hướng xuống để thu gọn.
- Panel đang đóng: tam giác hướng lên để mở lại.

## Khi thu gọn

- Nội dung tab đang mở được ẩn.
- Panel co xuống sát đáy.
- Có thể giữ thanh tab hoặc một thanh tiêu đề nhỏ.
- Phải luôn có nút để mở lại panel.
- Map workspace tự động tăng chiều cao.
- Không reset tab đang chọn.
- Không reset scroll hoặc dữ liệu Search Log nếu có thể giữ được.

## Khi mở lại

- Mở đúng tab đã chọn trước đó.
- Nội dung panel vẫn sử dụng state cũ.
- Không quay về tab Simulation một cách tự động.

---

# 4. Trạng thái collapse

Tạo ba state độc lập:

```js
isTopPanelCollapsed
isSidebarCollapsed
isBottomPanelCollapsed
```

Có thể đặt trong:

- `AppShell` bằng `useState`, nếu chỉ AppShell sử dụng.
- Zustand, nếu nhiều component cần đọc hoặc điều khiển trạng thái này.

Ưu tiên giữ state ở `AppShell` nếu không có nhu cầu dùng toàn cục.

Không đặt cùng một state rải rác trong nhiều component.

Các handler gợi ý:

```js
toggleTopPanel()
toggleSidebar()
toggleBottomPanel()
```

Việc đóng/mở layout tuyệt đối không được gọi:

```js
resetSimulation()
clearRouteResult()
setRouteResult()
setSelectedAlgorithm()
```

---

# 5. Layout behavior

Sử dụng CSS Grid/Flexbox và class modifier, ví dụ:

```text
app-shell--top-collapsed
app-shell--sidebar-collapsed
app-shell--bottom-collapsed
```

Khi trạng thái thay đổi, layout phải tự điều chỉnh:

```text
Top collapsed:
grid-template-rows giảm chiều cao hàng trên.

Sidebar collapsed:
grid-template-columns giảm chiều rộng cột phải.

Bottom collapsed:
grid-template-rows giảm chiều cao hàng dưới.
```

Không hard-code vị trí map bằng JavaScript nếu CSS Grid có thể xử lý.

Map phải sử dụng toàn bộ diện tích còn lại:

```css
min-width: 0;
min-height: 0;
width: 100%;
height: 100%;
```

Kiểm tra SVG có `width: 100%` và `height: 100%` để resize theo container.

Không reset viewport của GraphWorkspace khi layout thay đổi.

Nếu SVG hoặc container cần cập nhật sau resize, ưu tiên CSS responsive hoặc `ResizeObserver`. Không dùng `window.location.reload()`.

---

# 6. Thiết kế nút collapse

Mỗi nút phải:

- Dùng `<button type="button">`.
- Có vùng bấm đủ lớn, tối thiểu khoảng `32px × 32px`.
- Có hover và focus-visible rõ ràng.
- Có `aria-label`.
- Có `aria-expanded`.
- Có `aria-controls`.
- Có `title` dễ hiểu.

Ví dụ:

```jsx
<button
  type="button"
  aria-expanded={!isTopPanelCollapsed}
  aria-controls="top-controls"
  aria-label={
    isTopPanelCollapsed
      ? 'Expand route controls'
      : 'Collapse route controls'
  }
>
  <span aria-hidden="true">
    {isTopPanelCollapsed ? '▼' : '▲'}
  </span>
</button>
```

Hướng tam giác:

```text
Top:
▲ thu gọn
▼ mở rộng

Sidebar:
▶ thu gọn
◀ mở rộng

Bottom:
▼ thu gọn
▲ mở rộng
```

Không chỉ dựa vào hướng icon để truyền đạt ý nghĩa; bắt buộc có accessibility label.

---

# 7. Animation

Có thể thêm transition nhẹ cho:

- Chiều cao top panel
- Chiều rộng sidebar
- Chiều cao bottom panel
- Opacity nội dung

Thời gian gợi ý:

```css
transition: 180ms ease;
```

Không dùng animation quá lâu.

Hỗ trợ:

```css
@media (prefers-reduced-motion: reduce)
```

Trong chế độ reduced motion, tắt transition không cần thiết.

Không để nội dung tràn ra ngoài trong lúc đóng:

```css
overflow: hidden;
```

---

# 8. Responsive behavior

Kiểm tra tối thiểu:

- Desktop rộng.
- Laptop khoảng 1366px.
- Màn hình hẹp.

Ở màn hình hẹp:

- Sidebar có thể tự chuyển thành overlay hoặc hàng riêng nếu source hiện tại đã có responsive layout.
- Các nút mở lại luôn phải nhìn thấy.
- Không để map có chiều rộng hoặc chiều cao bằng 0.
- Không để các nút collapse đè lên zoom controls.

Không tự động thay đổi collapse state của người dùng mỗi lần resize.

---

# 9. Tiêu chí nghiệm thu

## Top panel

- Thu gọn được lên phía trên.
- Mở lại được.
- Map tăng chiều cao khi thu gọn.
- Dữ liệu form không bị mất.

## Sidebar

- Thu gọn được sang bên phải.
- Mở lại được.
- Map tăng chiều rộng khi thu gọn.
- Thuật toán đang chọn không bị mất.

## Bottom panel

- Thu gọn được xuống dưới.
- Mở lại được.
- Map tăng chiều cao khi thu gọn.
- Tab đang chọn không bị thay đổi.
- Search Log và result không bị xóa.

## Kết hợp

Kiểm tra các tổ hợp:

- Chỉ đóng top.
- Chỉ đóng sidebar.
- Chỉ đóng bottom.
- Đóng top và bottom.
- Đóng cả ba.
- Mở lại từng khu vực theo thứ tự khác nhau.

Ở mọi trường hợp:

- Map resize đúng.
- Zoom và pan vẫn hoạt động.
- Current simulation action vẫn được giữ.
- Không xuất hiện thanh cuộn ngoài ý muốn.
- Không có lỗi console.

---

# 10. Kiểm tra chức năng cũ

Sau khi triển khai, kiểm tra lại:

- Load data
- Find route
- Play
- Pause
- Previous action
- Next action
- Reset
- Speed
- Chuyển Map/Graph
- Nút zoom
- Con lăn chuột
- Kéo bản đồ bằng chuột trái
- Chuyển bottom tab
- Chọn thuật toán
- Search Log
- Final route highlight

Collapse chỉ thay đổi bố cục, không được tác động vào logic tìm đường hoặc playback.

---

# 11. Build và Git

Chạy:

```powershell
npm.cmd test
npm.cmd run build
git diff --check
git diff --name-only
git status --short
```

Fail nếu có file bị thay đổi trong:

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
2. State collapse được đặt ở đâu.
3. Cách CSS Grid thay đổi khi từng panel đóng.
4. Cách bảo toàn form, tab, simulation và map viewport.
5. Kết quả kiểm tra từng panel.
6. Kết quả test/build.
7. Những giới hạn còn lại nếu có.
