import { useMemo } from 'react'
import { useAppStore } from '../../store/useAppStore'
import {
  createNodeNameLookup,
  formatAlgorithmLabel,
  formatNumber,
  formatOptimizationLabel,
} from './resultFormatting'
import { buildRouteReasoning } from './routeReasoning'
import './RouteExplanation.css'

function Figure({ label, value, unit = '' }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{formatNumber(value, 3)}{unit ? ` ${unit}` : ''}</dd>
    </div>
  )
}

function TraceStatistics({ trace }) {
  const figures = [
    ['Thao tác đã ghi nhận', trace.recordedActions],
    ['Nút đã mở rộng', trace.expansions],
    ['Đường đã xét', trace.edgeChecks],
    ['Mục mới trên biên', trace.added],
    ['Mục được cải thiện', trace.improved],
    ['Tuyến hiện có được giữ lại', trace.retainedExisting],
    ['Lần so sánh địa điểm', trace.locationComparisons],
    ['Địa điểm không thể đến', trace.unreachableLocations],
    ['Kích thước biên lớn nhất', trace.peakFrontier],
  ].filter(([, value]) => value > 0)

  return <dl className="route-explanation__stats">
    {figures.map(([label, value]) => <Figure key={label} label={label} value={value} />)}
  </dl>
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

function SegmentConsiderations({ segments }) {
  if (segments.length === 0) return null
  return (
    <section className="route-explanation__section">
      <h3>Chỉ số và điều kiện của các đường đã chọn</h3>
      <ol className="route-explanation__segments">
        {segments.map((segment) => {
          const detail = segment.detail
          return <li key={`${segment.edgeId}-${segment.index}`}>
            <header>
              <span>{segment.index}</span>
              <div><strong>{segment.from} → {segment.to}</strong><small>Cạnh {segment.edgeId}</small></div>
            </header>
            <dl>
              <Figure label="Quãng đường" value={segment.distance} unit="km" />
              <Figure label="Thời gian điều chỉnh" value={segment.time} unit="phút" />
              <Figure label="Chi phí kịch bản ×100" value={segment.cost} />
              <Figure label="Ùn tắc" value={segment.congestion} unit="/ 5" />
              <Figure label="Rủi ro" value={segment.risk} />
              {detail?.time_multiplier != null && <Figure label="Hệ số thời gian" value={detail.time_multiplier} unit="×" />}
            </dl>
            <p>
              Đường này đóng góp các chỉ số trên vào toàn bộ tuyến.
              {detail?.construction_penalty > 0 ? ` Công trình làm tăng rủi ro thêm ${formatNumber(detail.construction_penalty, 3)}.` : ''}
              {detail?.rain_risk > 0 || detail?.fog_risk > 0 ? ` Rủi ro thời tiết: mưa ${formatNumber(detail.rain_risk, 3)}, sương mù ${formatNumber(detail.fog_risk, 3)}.` : ''}
            </p>
          </li>
        })}
      </ol>
    </section>
  )
}

export default function RouteExplanation({ className = '' }) {
  const result = useAppStore((state) => state.routeResult)
  const nodes = useAppStore((state) => state.graphData.nodes)
  const edges = useAppStore((state) => state.graphData.edges)
  const names = useMemo(() => createNodeNameLookup(nodes), [nodes])
  const reasoning = useMemo(
    () => buildRouteReasoning(result, names, edges?.features ?? []),
    [edges, names, result],
  )
  const rootClassName = ['route-explanation', className].filter(Boolean).join(' ')

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
            {result.explanation && <p>{result.explanation}</p>}
          </section>

          <section className="route-explanation__section">
            <h3>Các chỉ số kết quả đã ghi nhận</h3>
            <p className="route-explanation__objective">
              Mục tiêu quyết định: <strong>{reasoning.objective.label}</strong>
              {reasoning.objective.value != null && <> · giá trị ghi nhận <strong>{formatNumber(reasoning.objective.value, 6)} {reasoning.objective.unit}</strong></>}
            </p>
            <dl className="route-explanation__figures">
              {reasoning.figures.map((figure) => <Figure key={figure.label} {...figure} />)}
            </dl>
          </section>

          <section className="route-explanation__section">
            <h3>Các đánh giá được ghi nhận khi tìm kiếm</h3>
            <TraceStatistics trace={reasoning.trace} />
            <p>“Đã thêm” nghĩa là một đích lần đầu được đưa vào biên; “được cải thiện” nghĩa là một tuyến rẻ hơn thay thế giá trị trước đó; “được giữ lại” nghĩa là phương án mới không tốt hơn giá trị hiện có.</p>
            {reasoning.permutations && <p><strong>Mức độ duyệt cạn:</strong> đã đánh giá {formatNumber(reasoning.permutations.evaluated, 0)} thứ tự khả thi trong tổng số {formatNumber(reasoning.permutations.possible, 0)} hoán vị có thể.</p>}
          </section>

          <SelectionRounds rounds={reasoning.selectionRounds} />
          <ScenarioFormula formula={reasoning.formula} contributions={reasoning.contributions} />
          <SegmentConsiderations segments={reasoning.segments} />

          {result.optimality_note && <aside><strong>Bảo đảm của kết quả</strong><span>{result.optimality_note}</span></aside>}
        </div>
      )}
    </section>
  )
}
