# AIPRO Route DaLat - Advanced Search Module

Thư mục này chứa các thuật toán tìm kiếm nâng cao (Advanced Search) phục vụ cho dự án tìm đường thông minh tại Đà Lạt. Code đã được thiết kế theo chuẩn OOP (Object-Oriented Programming) và phân tách thành các module độc lập (Modular Design) để dễ dàng bảo trì và mở rộng.

## Cấu trúc File & Chức năng

### 1. Dữ liệu & Đồ thị (Data & Graph)
- **`graph_loader.py`**: Chuyên trách việc tải dữ liệu bản đồ (`nodes_snapped.csv`, `edges.csv`), tính toán trọng số động dựa trên điều kiện thời tiết/giao thông, và xây dựng đồ thị `networkx.DiGraph`.
- **`heuristic.py`**: Chứa lớp `Heuristic`. Hàm này ước lượng chi phí (theo đường chim bay Haversine) từ một điểm bất kỳ tới đích đến dựa trên các tiêu chí tối ưu cụ thể (`shortest`, `fastest`, `balanced`, `safest`).

### 2. Kiến trúc thuật toán (Algorithm Core)
- **`base_algorithm.py`**: Chứa abstract class `BaseSearchAlgorithm`. Tất cả các thuật toán tìm đường đều bắt buộc phải kế thừa class này. Nó cung cấp API chuẩn (`solve()`) và các hàm hỗ trợ chung để định dạng kết quả đồng nhất.

### 3. Thuật toán Tìm đường 1-1 (Point-to-Point)
Dùng để tìm đường đi từ một điểm xuất phát đến một điểm đích.
- **`greedy_best_first.py`**: Thuật toán *Greedy Best-First Search*. Sử dụng hàng đợi ưu tiên (Priority Queue) để liên tục bung rộng đỉnh có giá trị heuristic tốt nhất (có vẻ gần đích nhất).
- **`hill_climbing.py`**: Thuật toán *Hill Climbing* (Leo đồi). Phương pháp tìm kiếm cục bộ (Local Search), liên tục di chuyển sang node kề liền kề có heuristic tốt nhất cho đến khi tìm thấy đích, hoặc dừng lại nếu bị kẹt ở ngõ cụt cục bộ (local maximum).

### 4. Thuật toán Lộ trình nhiều điểm (Multi-location / TSP)
Dùng cho bài toán đi qua nhiều điểm (Traveling Salesperson Problem).
- **`nearest_neighbor.py`**: Thuật toán *Nearest Neighbor* (Tham lam). Tại mỗi bước, thuật toán sẽ tự động chọn điểm gần nhất chưa được thăm. Chạy siêu nhanh nhưng lộ trình trả về có thể không phải là ngắn nhất.
- **`brute_force_tsp.py`**: Thuật toán *Brute Force*. Sinh ra toàn bộ hoán vị (permutations) thứ tự đi qua các điểm để đo lường. Chạy chậm khi số lượng điểm quá lớn nhưng luôn đảm bảo tìm được lộ trình có chi phí tối ưu nhất tuyệt đối.

### 5. Công cụ và Hệ thống
- **`test_runner.py`**: File kịch bản (script) để chạy kiểm thử tổng hợp. Nó sẽ nạp dữ liệu thật và chạy lần lượt cả 4 thuật toán trên để so sánh kết quả.
- **`__init__.py`**: File rỗng để Python nhận diện thư mục `advance_search` là một package (hỗ trợ import giữa các file).
- **`heuristic_design.md`**: Tài liệu nháp/ghi chú về mặt ý tưởng toán học khi thiết kế hàm Heuristic (nếu có).

## Cách chạy thử

Mở Terminal tại thư mục `advance_search` và gõ lệnh sau để xem các thuật toán hoạt động:

```bash
python test_runner.py
```
