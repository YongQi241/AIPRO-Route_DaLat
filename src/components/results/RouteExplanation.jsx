import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import {
  createNodeNameLookup,
  formatAlgorithmLabel,
  formatNumber,
  formatOptimizationLabel,
} from './resultFormatting'
import { buildRouteReasoning } from './routeReasoning'
import {
  buildOptimizationComparisonNarrative,
  getComparisonRecommendation,
} from '../../services/routeComparison'
import './RouteExplanation.css'

function Figure({ label, value, unit = '' }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{formatNumber(value, 3)}{unit ? ` ${unit}` : ''}</dd>
    </div>
  )
}

function ScenarioFormula({ formula, contributions }) {
  if (!formula || !contributions) return null
  const weights = formula.weights ?? {}
  return (
    <section className="route-explanation__section">
      <h3>Tính chi phí kịch bản trên toàn tuyến đã chọn</h3>
      <p>{formula.expression}</p>
      <code>
        α={formatNumber(weights.distance, 3)}, β={formatNumber(weights.time, 3)},{' '}
        γ={formatNumber(weights.congestion, 3)}, δ={formatNumber(weights.risk, 3)}
      </code>
      <dl className="route-explanation__contributions">
        <Figure label="Đóng góp của quãng đường" value={contributions.distance} />
        <Figure label="Đóng góp của thời gian" value={contributions.time} />
        <Figure label="Đóng góp của ùn tắc" value={contributions.congestion} />
        <Figure label="Đóng góp của rủi ro" value={contributions.risk} />
      </dl>
      <small>Các thành phần đóng góp được cộng cho mỗi lần một cạnh xuất hiện trong tuyến cuối cùng.</small>
    </section>
  )
}

function SelectionRounds({ rounds }) {
  if (rounds.length === 0) return null
  return (
    <section className="route-explanation__section">
      <h3>Đánh giá theo từng điểm dừng</h3>
      <ol className="route-explanation__rounds">
        {rounds.map((round) => <li key={round.index}>
          <strong>Vòng {round.index}: từ {round.from}, chọn {round.selected}</strong>
          <span>Điểm số tốt nhất: {formatNumber(round.selectedScore, 6)}</span>
          <ul>
            {round.candidates.map((candidate) => <li
              className={candidate.selected ? 'is-selected' : ''}
              key={candidate.node}
            >
              <span>{candidate.node}</span>
              <b>{candidate.reachable ? formatNumber(candidate.score, 6) : 'Không thể đến'}</b>
              <small>{candidate.selected ? 'Điểm số khả dụng thấp nhất' : candidate.reachable ? 'Điểm số cao hơn; tạm hoãn' : 'Không có đường đi có hướng'}</small>
            </li>)}
          </ul>
        </li>)}
      </ol>
    </section>
  )
}

export default function RouteExplanation({ className = '' }) {
  const result = useAppStore((state) => state.routeResult)
  const comparison = useAppStore((state) => state.routeComparison)
  const activateComparisonRoute = useAppStore(
    (state) => state.activateComparisonRoute,
  )
  const nodes = useAppStore((state) => state.graphData.nodes)
  const edges = useAppStore((state) => state.graphData.edges)
  const names = useMemo(() => createNodeNameLookup(nodes), [nodes])
  const reasoning = useMemo(
    () => buildRouteReasoning(result, names, edges?.features ?? []),
    [edges, names, result],
  )
  const rootClassName = ['route-explanation', className].filter(Boolean).join(' ')
  const comparisonNarrative = useMemo(
    () => buildOptimizationComparisonNarrative(result, comparison),
    [comparison, result],
  )
  const recommendation = useMemo(
    () => getComparisonRecommendation(result, comparison?.candidates),
    [comparison, result],
  )

  return (
    <section className={rootClassName} aria-labelledby="route-explanation-title">
      <header className="route-explanation__header">
        <div><span>Giải thích thuật toán</span><h2 id="route-explanation-title">Cách thuật toán chọn tuyến đường</h2></div>
        {result && <dl className="route-explanation__context">
          <div><dt>Algorithm</dt><dd>{formatAlgorithmLabel(result.algorithm) || '—'}</dd></div>
          <div><dt>Kịch bản</dt><dd>{result.scenario_id ?? '—'}</dd></div>
          <div><dt>Optimization</dt><dd>{formatOptimizationLabel(result.optimization) || '—'}</dd></div>
        </dl>}
      </header>

      {!reasoning ? <div className="route-explanation__empty"><strong>Chưa có giải thích</strong><span>Hoàn tất một lượt tìm kiếm để xem căn cứ lựa chọn.</span></div> : (
        <div className="route-explanation__body">
          <section className="route-explanation__summary">
            <span>Tuyến đường đã chọn</span>
            <strong>{reasoning.path.join(' → ') || 'Không có tuyến hoàn chỉnh'}</strong>
            <p>{reasoning.method}</p>
            {comparisonNarrative && <p>{comparisonNarrative}</p>}
            {recommendation && <button
              className="route-explanation__load-route"
              type="button"
              onClick={() => activateComparisonRoute(recommendation)}
            >
              Tải và chạy tuyến {formatOptimizationLabel(recommendation.optimization)} tối ưu
            </button>}
          </section>

          <SelectionRounds rounds={reasoning.selectionRounds} />
          <ScenarioFormula formula={reasoning.formula} contributions={reasoning.contributions} />

          {result.optimality_note && <aside><strong>Bảo đảm của kết quả</strong><span>{result.optimality_note}</span></aside>}
        </div>
      )}
    </section>
  )
}
