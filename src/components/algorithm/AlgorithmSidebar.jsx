import { useAppStore } from '../../store/useAppStore'
import './AlgorithmSidebar.css'

const DEFAULT_ALGORITHMS = [
  {
    value: 'bfs',
    name: 'Breadth-First Search',
    shortName: 'BFS',
    description: 'Khám phá đồ thị lần lượt theo từng mức.',
    guarantee: 'Ít cạnh nhất',
  },
  {
    value: 'dfs',
    name: 'Depth-First Search',
    shortName: 'DFS',
    description: 'Đi sâu vào một nhánh trước khi quay lui.',
    guarantee: 'Không bảo đảm tối ưu',
  },
  {
    value: 'ucs',
    name: 'Uniform-Cost Search',
    shortName: 'UCS',
    description: 'Mở rộng tuyến có chi phí tích lũy thấp nhất.',
    guarantee: 'Chi phí tối ưu',
  },
  {
    value: 'dijkstra',
    name: 'Dijkstra',
    shortName: 'Dijkstra',
    description: 'Tìm đường có chi phí nhỏ nhất với trọng số không âm.',
    guarantee: 'Chi phí tối ưu',
  },
  {
    value: 'astar',
    name: 'A* Search',
    shortName: 'A*',
    description: 'Kết hợp chi phí tích lũy với hàm ước lượng tới đích.',
    guarantee: 'Tối ưu nếu ước lượng chấp nhận được',
  },
  {
    value: 'greedy',
    name: 'Greedy Best-First Search',
    shortName: 'Greedy',
    description: 'Ưu tiên nút có khoảng cách ước lượng tới đích nhỏ nhất.',
    guarantee: 'Không bảo đảm tối ưu',
  },
  {
    value: 'hill_climbing',
    name: 'Hill Climbing with Backtracking',
    shortName: 'Hill Climbing',
    description: 'Ưu tiên nút gần hơn và quay lui khỏi cực tiểu cục bộ.',
    guarantee: 'Đầy đủ, không tối ưu',
  },
  {
    value: 'nearest_neighbor',
    name: 'Nearest Neighbor',
    shortName: 'Nearest Neighbor',
    description: 'Xây dựng tuyến đi qua các địa điểm trung gian.',
    guarantee: 'Ước lượng nhanh',
  },
  {
    value: 'brute_force_tsp',
    name: 'Brute Force TSP',
    shortName: 'Exact TSP',
    description: 'Duyệt mọi thứ tự điểm trung gian (tối đa 8 điểm).',
    guarantee: 'Tối ưu toàn cục',
  },
]

export default function AlgorithmSidebar({
  algorithms = DEFAULT_ALGORITHMS,
  disabled = false,
  onAlgorithmChange,
  className = '',
  compact = false,
}) {
  const selectedAlgorithm = useAppStore((state) => state.selectedAlgorithm)
  const setSelectedAlgorithm = useAppStore(
    (state) => state.setSelectedAlgorithm,
  )

  const handleChange = (algorithm) => {
    setSelectedAlgorithm(algorithm)
    onAlgorithmChange?.(algorithm)
  }

  const rootClassName = ['algorithm-sidebar', className]
    .filter(Boolean)
    .join(' ')

  if (compact) {
    return (
      <label className={`${rootClassName} algorithm-sidebar--compact`}>
        <span>Strategy</span>
        <select
          value={selectedAlgorithm}
          disabled={disabled}
          onChange={(event) => handleChange(event.target.value)}
          aria-label="Select search strategy"
        >
          {algorithms.map((algorithm) => (
            <option key={algorithm.value} value={algorithm.value}>
              {algorithm.shortName}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <section className={rootClassName} aria-labelledby="algorithm-list-title">
      <header className="algorithm-sidebar__header">
        <h2 id="algorithm-list-title">Search strategy</h2>
      </header>

      <fieldset className="algorithm-sidebar__list" disabled={disabled}>
        <legend className="algorithm-sidebar__sr-only">
          Select search algorithm
        </legend>

        {algorithms.map((algorithm) => {
          const isSelected = selectedAlgorithm === algorithm.value

          return (
            <label
              className={[
                'algorithm-sidebar__card',
                isSelected && 'algorithm-sidebar__card--selected',
              ]
                .filter(Boolean)
                .join(' ')}
              key={algorithm.value}
            >
              <input
                type="radio"
                name="search-algorithm"
                value={algorithm.value}
                checked={isSelected}
                onChange={(event) => handleChange(event.target.value)}
              />
              <span className="algorithm-sidebar__radio" aria-hidden="true" />
              <strong className="algorithm-sidebar__name">
                {algorithm.shortName}
              </strong>
            </label>
          )
        })}
      </fieldset>

    </section>
  )
}
