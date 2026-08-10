export const GRAPH_LEGEND_ITEMS = Object.freeze([
  { type: 'node', state: 'unvisited', label: 'Chưa thăm' },
  { type: 'node', state: 'frontier', label: 'Trên biên' },
  { type: 'node', state: 'visited', label: 'Đã thăm' },
  { type: 'node', state: 'current', label: 'Hiện tại' },
  { type: 'node', state: 'final-node', label: 'Nút thuộc tuyến cuối' },
  { type: 'edge', state: 'pending', label: 'Chưa xét' },
  { type: 'edge', state: 'checked', label: 'Đã xét' },
  { type: 'edge', state: 'chosen', label: 'Cạnh được chọn cuối cùng' },
  { type: 'edge', state: 'route', label: 'Đoạn tuyến bình thường' },
  { type: 'edge', state: 'warning', label: 'Đoạn tuyến cảnh báo' },
])
