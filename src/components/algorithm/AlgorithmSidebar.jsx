import { useAppStore } from '../../store/useAppStore'
import './AlgorithmSidebar.css'

const DEFAULT_ALGORITHMS = [
  {
    value: 'bfs',
    name: 'Breadth-First Search',
    shortName: 'BFS',
    description: 'Explores the graph level by level.',
    guarantee: 'Fewest edges',
  },
  {
    value: 'dfs',
    name: 'Depth-First Search',
    shortName: 'DFS',
    description: 'Explores one branch deeply before backtracking.',
    guarantee: 'No optimality',
  },
  {
    value: 'ucs',
    name: 'Uniform-Cost Search',
    shortName: 'UCS',
    description: 'Expands the route with the lowest accumulated cost.',
    guarantee: 'Optimal cost',
  },
  {
    value: 'dijkstra',
    name: 'Dijkstra',
    shortName: 'Dijkstra',
    description: 'Finds minimum-cost paths with nonnegative weights.',
    guarantee: 'Optimal cost',
  },
  {
    value: 'astar',
    name: 'A* Search',
    shortName: 'A*',
    description: 'Combines accumulated cost with a goal heuristic.',
    guarantee: 'Optimal if admissible',
  },
]

export default function AlgorithmSidebar({
  algorithms = DEFAULT_ALGORITHMS,
  disabled = false,
  onAlgorithmChange,
  className = '',
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

  return (
    <section className={rootClassName} aria-labelledby="algorithm-list-title">
      <header className="algorithm-sidebar__header">
        <span>Search strategy</span>
        <h2 id="algorithm-list-title">Algorithms</h2>
        <p>Select the algorithm used by the route service.</p>
      </header>

      <fieldset className="algorithm-sidebar__list" disabled={disabled}>
        <legend className="algorithm-sidebar__sr-only">
          Chọn thuật toán tìm kiếm
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
              <span className="algorithm-sidebar__content">
                <span className="algorithm-sidebar__name-row">
                  <strong>{algorithm.shortName}</strong>
                  <small>{algorithm.guarantee}</small>
                </span>
                <span className="algorithm-sidebar__full-name">
                  {algorithm.name}
                </span>
                <span className="algorithm-sidebar__description">
                  {algorithm.description}
                </span>
              </span>
            </label>
          )
        })}
      </fieldset>

      <footer className="algorithm-sidebar__footer">
        <span>Selected</span>
        <strong>
          {algorithms.find(({ value }) => value === selectedAlgorithm)
            ?.shortName ?? selectedAlgorithm}
        </strong>
      </footer>
    </section>
  )
}
