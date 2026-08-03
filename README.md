# AIPRO-Route_DaLat
Hệ thống tìm kiếm và tối ưu hóa tuyến đường giao thông đô thị dựa trên bản đồ Đà Lạt.

## Cấu trúc thư mục (Module `urban_routing`)
Dự án được triển khai thành các file phân tách rõ ràng (Modular Design), tự định nghĩa cấu trúc đồ thị từ đầu (không phụ thuộc thư viện NetworkX) để bám sát bản chất thuật toán.

### 1. `graph_model.py` (Mô hình Dữ liệu Đồ thị)
Định nghĩa cấu trúc đồ thị cơ bản nhất.
- **`Node`**: Lưu thông tin của một địa điểm (ID, Tên, Kinh độ, Vĩ độ).
- **`Edge`**: Lưu thông tin đường đi nối giữa 2 địa điểm (Khoảng cách, Thời gian, Kẹt xe).
- **`Graph`**: Lớp quản lý tổng thể, cung cấp hàm `add_node`, `add_edge`, và đặc biệt là `get_neighbors(node_id)` dùng để tìm các ngã rẽ xung quanh một điểm.

### 2. `csv_handler.py` (Đọc Dữ liệu)
- **`load_graph_from_csv()`**: Hàm đọc dữ liệu bản đồ từ 2 file `nodes_snapped.csv` và `edges.csv`. Hàm sẽ làm sạch dữ liệu, tự động bỏ qua các tuyến đường đang bị phong tỏa (closed), và nạp toàn bộ vào đối tượng `Graph`.

### 3. `heuristics.py` (Hàm Chi phí & Đánh giá)
- **`haversine_distance()`**: Hàm tính khoảng cách đường chim bay thực tế giữa 2 tọa độ GPS.
- **`calculate_h(current, goal)`**: Cung cấp giá trị ước lượng $h(n)$ (Gợi ý cho thuật toán biết còn cách đích bao xa).
- **`get_weights_by_profile(profile)`**: Cung cấp bộ trọng số linh hoạt tương ứng với 4 chiến thuật tìm đường: Cân bằng (`balanced`), Ngắn nhất (`shortest`), Nhanh nhất (`fastest`), và Tránh kẹt xe (`avoid_traffic`).
- **`calculate_g_edge(edge, profile)`**: Tính chi phí thực tế $g(n)$ khi đi qua một cung đường tùy theo chiến thuật người dùng lựa chọn. Ví dụ nếu chọn `fastest`, trọng số thời gian sẽ được đẩy lên 80%.

### 4. `algorithms.py` (Các Thuật toán Lõi)
Trái tim của dự án, chứa các hàm giải thuật:

**▶ Giải bài toán đi từ A đến B (2 điểm):**
- **`a_star_search()`**: Thuật toán toàn diện nhất. Kết hợp cả chi phí đã đi $g(n)$ và ước lượng tương lai $h(n)$. Luôn đảm bảo tìm được đường đi tối ưu nhất.
- **`greedy_bfs()`**: Tìm kiếm tham lam. Chỉ dòm vào tương lai $h(n)$. Thuật toán chạy cực nhanh nhưng lộ trình trả về thường đi đường vòng (không tối ưu).
- **`hill_climbing()`**: Leo đồi. Cũng tham lam dựa vào $h(n)$ nhưng cực đoan hơn: không lưu vết lịch sử, không biết quay đầu. Nếu lỡ đi vào ngõ cụt thì thuật toán sẽ báo lỗi.

**▶ Giải bài toán đi qua nhiều điểm (TSP - Giao hàng/Du lịch):**
- **`nearest_neighbor_tsp()`**: Thuật toán Hàng xóm gần nhất. Từ vị trí hiện tại, cứ thấy điểm nào chưa đi mà gần nhất thì phóng tới đó. Tính toán cực nhanh nhưng lộ trình tổng thể chưa chắc là tốt nhất.
- **`brute_force_tsp()`**: Duyệt cạn hoán vị. Gom hết mọi điểm cần đến ra sắp xếp thành mọi kịch bản có thể (A-B-C, A-C-B, C-A-B...). Tính khoảng cách của tất cả rồi lấy cái ngắn nhất. Chắc chắn tối ưu tuyệt đối nhưng chạy rất chậm nếu điểm đến quá nhiều.
  
### 5. `main.py` (Thực thi)
- Hàm **`main()`**: Nơi nối tất cả các file trên lại. Tải dữ liệu -> Gọi thuật toán (Đặc biệt có vòng lặp so sánh trực quan 4 chiến thuật: Balanced, Shortest, Fastest, Avoid_Traffic) -> In ra màn hình console kết quả chi tiết.

## Cú pháp chạy chương trình
Mở terminal/cmd lên và gõ:
```bash
python urban_routing/main.py
```
