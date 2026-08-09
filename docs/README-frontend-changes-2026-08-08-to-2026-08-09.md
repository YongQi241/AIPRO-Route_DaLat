# Tổng hợp thay đổi Frontend ngày 08–09/08/2026

Tài liệu này ghi lại các thay đổi được thực hiện trên branch `frontend` trong hai ngày 08–09/08/2026. Phạm vi thay đổi chỉ gồm giao diện React, state mô phỏng, logic trình bày dữ liệu và tài liệu dành cho frontend.

## 1. Phạm vi và nguyên tắc

- Không sửa mã nguồn backend, database, dữ liệu GeoJSON hoặc thuật toán BFS, DFS, UCS, Dijkstra, A*.
- Frontend tiếp tục nhận và hiển thị `frontier_steps`, `visited_order`, `path_nodes` và `path_edges` từ kết quả route.
- Frontend không tự tính đường đi tối ưu và không thay đổi kết quả cuối do backend trả về.
- Các vi bước xét cạnh chỉ phục vụ trực quan hóa. Trạng thái `ADD`, `UPDATE`, `KEEP` hoặc `UNKNOWN` được suy ra từ snapshot frontier để giải thích dữ liệu đã nhận, không thay thế thuật toán backend.

## 2. Timeline mô phỏng chi tiết

- Bổ sung bộ dựng timeline thuần `buildSearchActionTimeline` trong `src/components/graph/searchTimeline.js`.
- Mỗi bước mở rộng node được trình bày thành các action nhỏ:
  - `expand`: bắt đầu xét node hiện tại;
  - `consider-edge`: lần lượt xét từng cạnh đi ra từ node hiện tại;
  - `frame-complete`: hoàn tất frame và đồng bộ trạng thái frontier/visited.
- Candidate edge dùng quan hệ node–edge có trong GeoJSON, không suy luận cạnh từ khoảng cách tọa độ.
- Cạnh đang xét được tô cyan; các cạnh ứng viên còn lại dùng nét đứt; node đang được đánh giá có vòng nhấn trực quan.
- Search log và Current task cùng đọc một timeline với bản đồ nên trạng thái hiển thị đồng bộ khi Play, tua tới hoặc tua lui.

## 3. Điều khiển phát và tua thủ công

Thanh Playback hiện hỗ trợ:

- `First action`: trở về action đầu tiên;
- `Previous action`: lùi một action;
- Play/Pause: chạy hoặc tạm dừng tự động;
- `Next action`: tiến một action;
- `Last action`: tới action cuối;
- Reset và lựa chọn tốc độ phát.

`simulation.status`, `simulation.currentStep` và `simulation.speed` vẫn được quản lý tập trung bằng Zustand. Khi thao tác thủ công trong lúc đang chạy, mô phỏng tự chuyển sang Pause. Các giới hạn đầu/cuối ngăn step vượt khỏi timeline.

## 4. Thời điểm công bố kết quả cuối

- Thêm state `hasRevealedFinalResult` để phân biệt “backend đã trả kết quả” với “người xem đã chạy tới cuối mô phỏng”.
- Các tab `Output`, `Breakdown` và `Human-readable reasoning` bị khóa trước lần đầu tới action cuối.
- Sau khi kết quả đã được công bố, nội dung vẫn giữ nguyên khi dùng Previous, First, Reset hoặc replay.
- Kết quả chỉ bị xóa/khóa lại khi bắt đầu một yêu cầu route mới, xóa kết quả hoặc gặp lỗi route mới.
- Trường hợp kết quả thành công nhưng không có timeline thì kết quả được hiển thị ngay.
- Nội dung Human-readable reasoning được giữ nguyên ngôn ngữ từ dữ liệu hiện có.

## 5. Dữ liệu và toolbar

- Dữ liệu đồ thị mẫu vẫn được tự động nạp khi ứng dụng khởi động.
- Bỏ nút `Load data` thủ công vì fixture đã được cấu hình sẵn và thao tác này không còn cần thiết với luồng demo.
- `routeService` tham chiếu fixture `data/mock-result.json` để phục vụ chế độ demo phía giao diện; không sửa nội dung fixture.

## 6. Layout có thể thu gọn

`AppShell` có ba vùng thu gọn độc lập:

- Route controls phía trên;
- Search strategy bên phải;
- Search details phía dưới.

Khi thu gọn, workspace bản đồ nhận thêm không gian. Component bên trong vẫn được mount nên lựa chọn form, tab đang mở, simulation, scroll và trạng thái bản đồ không bị mất. Các nút có `aria-expanded`, `aria-controls`, nhãn và tooltip để hỗ trợ truy cập.

## 7. Chú giải màu sắc

Legend được tách rõ thành hai nhóm trạng thái:

- Node: Unvisited, Frontier, Visited, Current và Final-route node;
- Edge: Candidate edge, Active relaxation, Normal route segment và Warning route segment.

Màu xanh/cam trên tuyến cuối là trạng thái của từng route segment, không phải màu trạng thái node. Cách tách này tránh hiểu nhầm giữa cạnh đang xét và cạnh của đường đi cuối cùng.

## 8. Tương tác bản đồ được giữ nguyên

- Chuyển chế độ Map/Graph;
- Phóng to, thu nhỏ và Reset view;
- Zoom bằng con lăn chuột;
- Giữ chuột trái để kéo bản đồ;
- Highlight tuyến cuối và animation tìm kiếm.

## 9. Kiểm thử

Các test frontend bao phủ timeline, điều khiển Zustand, vòng đời công bố kết quả, trạng thái tab và legend. Chạy bằng:

```powershell
npm.cmd test
npm.cmd run build
```

## 10. Các file chính liên quan

- `src/store/useAppStore.js`: state và action playback/result reveal.
- `src/components/graph/searchTimeline.js`: chuyển trace thành timeline trực quan.
- `src/components/graph/SearchTraversalLayer.jsx`: cạnh ứng viên và cạnh đang relax.
- `src/components/graph/GraphNodeLayer.jsx`: trạng thái node trong animation.
- `src/components/graph/GraphWorkspace.jsx`: phối hợp layer, timeline và legend.
- `src/components/playback/PlaybackToolbar.jsx`: First/Previous/Play/Next/Last/Reset/Speed.
- `src/components/panels/BottomPanelTabs.jsx`: tab Simulation, Algorithm trace và các tab kết quả.
- `src/components/layout/AppShell.jsx`: bố cục và ba vùng thu gọn.

## 11. Ngoài phạm vi thay đổi

- Không thêm thông số `g`, `h`, `f` lên node hoặc cạnh.
- Không rút gọn số lượng action trong timeline.
- Không thay đổi hợp đồng API, thuật toán backend, database hoặc dữ liệu đầu vào.
