export const GRAPH_LEGEND_ITEMS = Object.freeze([
  { type: 'node', state: 'unvisited', label: 'Chưa thăm' },
  { type: 'node', state: 'frontier', label: 'Trên biên' },
  { type: 'node', state: 'visited', label: 'Đã thăm' },
  { type: 'node', state: 'current', label: 'Hiện tại' },
  { type: 'node', state: 'final-node', label: 'Nút thuộc tuyến cuối' },
  { type: 'edge', state: 'chosen', label: 'Cạnh được chọn cuối cùng' },
  { type: 'edge', state: 'route', label: 'Đoạn tuyến bình thường' },
  { type: 'edge', state: 'traffic', label: 'Ùn tắc cao (≥ 3/5)' },
  { type: 'edge', state: 'warning', label: 'Cảnh báo rủi ro' },
])
