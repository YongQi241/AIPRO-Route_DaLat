import {
  formatEdgeCostCalculation,
  formatEdgeDetailNumber as number,
} from './edgeCostDetails'
import { formatCost, formatNodeNumber } from '../results/resultFormatting'
import './EdgeHoverCard.css'

function Condition({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export default function EdgeHoverCard({
  edge,
  detail,
  formula,
  scenarioId,
  optimization,
  position,
}) {
  if (!edge || !position) return null

  const calculation = formatEdgeCostCalculation(detail, formula)
  const rawScenarioName = detail?.scenario_name ?? scenarioId
  const scenarioName = ({
    weekday_normal: 'ngày thường',
    weekend_busy: 'cuối tuần đông đúc',
    evening_rush: 'giờ cao điểm buổi tối',
    heavy_rain: 'mưa lớn',
    dense_fog: 'sương mù dày',
  })[rawScenarioName] ?? rawScenarioName ?? 'chưa tính toán'

  return (
    <aside
      className={[
        'edge-hover-card',
        position.placeAbove && 'edge-hover-card--above',
      ].filter(Boolean).join(' ')}
      role="tooltip"
      style={{ left: position.x, top: position.y }}
    >
      <header>
        <div>
          <span>Cạnh {edge.edgeId}</span>
          <strong>
            {formatNodeNumber(edge.fromNode)} → {formatNodeNumber(edge.toNode)}
          </strong>
        </div>
        <b className={detail?.closed ? 'is-closed' : ''}>
          {detail?.closed
            ? 'Đã đóng'
            : detail?.route_cost == null
              ? 'Không có giá trị chi phí'
              : `Chi phí: ${formatCost(detail.route_cost)}`}
        </b>
      </header>

      {edge.reason && <p className="edge-hover-card__reason">{edge.reason}</p>}

      {!detail ? (
        <p className="edge-hover-card__unavailable">
          Không có giá trị chi phí cho đường này. Hãy tính tuyến để tải dữ liệu
          theo kịch bản và tiêu chí đã chọn.
        </p>
      ) : (
        <section>
          <h3>
            Điều kiện kịch bản · {scenarioId ?? '—'} ({scenarioName})
          </h3>
          <dl>
            <Condition label="Quãng đường">
              {number(detail.distance_km, 3)} km → chuẩn hóa{' '}
              {number(detail.normalized?.distance)}
            </Condition>
            <Condition label="Thời gian cơ sở">
              {number(detail.base_time_min, 3)} phút
            </Condition>
            <Condition label="Hệ số thời gian">
              × {number(detail.time_multiplier, 3)}
            </Condition>
            <Condition label="Thời gian điều chỉnh">
              {number(detail.adjusted_time_min, 3)} phút → chuẩn hóa{' '}
              {number(detail.normalized?.time)}
            </Condition>
            <Condition label="Ùn tắc">
              {number(detail.scenario_congestion, 3)} / 5 → chuẩn hóa{' '}
              {number(detail.normalized?.congestion)}
            </Condition>
            <Condition label="Rủi ro cơ sở">
              {number(detail.base_risk, 3)}
            </Condition>
            <Condition label="Rủi ro mưa / sương mù">
              {number(detail.rain_risk, 3)} / {number(detail.fog_risk, 3)}
            </Condition>
            <Condition label="Công trình">
              + {number(detail.construction_penalty, 3)}
            </Condition>
            <Condition label="Tổng rủi ro">
              {number(detail.total_risk, 3)} → chuẩn hóa{' '}
              {number(detail.normalized?.risk)}
            </Condition>
          </dl>
        </section>
      )}

      {detail && (
        <footer>
          <h3>
            Công thức chi phí · {formula?.optimization ?? optimization ?? '—'}
          </h3>
          <code>{calculation.expression}</code>
          <code>{calculation.substitution}</code>
          {calculation.contributions && (
            <small>Các thành phần: {calculation.contributions}</small>
          )}
          {calculation.result && <strong>= {calculation.result}</strong>}
        </footer>
      )}
    </aside>
  )
}
