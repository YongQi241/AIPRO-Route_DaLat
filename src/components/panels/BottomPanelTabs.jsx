import { useId, useRef, useState } from 'react'
import RouteExplanation from '../results/RouteExplanation'
import RouteResultPanel from '../results/RouteResultPanel'
import SegmentDetails from '../results/SegmentDetails'
import CurrentTaskPanel from './CurrentTaskPanel'
import SearchLogPanel from './SearchLogPanel'
import './BottomPanelTabs.css'

const TABS = [
  { id: 'simulation', label: 'Simulation', Component: CurrentTaskPanel },
  { id: 'trace', label: 'Algorithm trace', Component: SearchLogPanel },
  { id: 'output', label: 'Output', Component: RouteResultPanel },
  { id: 'breakdown', label: 'Breakdown', Component: SegmentDetails },
  {
    id: 'reasoning',
    label: 'Human-readable reasoning',
    Component: RouteExplanation,
  },
]

export default function BottomPanelTabs({ className = '' }) {
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const instanceId = useId()
  const tabRefs = useRef([])
  const activeIndex = Math.max(
    0,
    TABS.findIndex(({ id }) => id === activeTab),
  )
  const active = TABS[activeIndex]
  const ActivePanel = active.Component

  const selectTab = (index, moveFocus = false) => {
    const safeIndex = (index + TABS.length) % TABS.length
    setActiveTab(TABS[safeIndex].id)
    if (moveFocus) tabRefs.current[safeIndex]?.focus()
  }

  const handleKeyDown = (event) => {
    const keyTargets = {
      ArrowRight: activeIndex + 1,
      ArrowLeft: activeIndex - 1,
      Home: 0,
      End: TABS.length - 1,
    }
    if (!(event.key in keyTargets)) return

    event.preventDefault()
    selectTab(keyTargets[event.key], true)
  }

  const rootClassName = ['bottom-panel-tabs', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={rootClassName}>
      <div
        className="bottom-panel-tabs__bar"
        role="tablist"
        aria-label="Simulation and route information"
        onKeyDown={handleKeyDown}
      >
        {TABS.map(({ id, label }, index) => {
          const isActive = id === active.id

          return (
            <button
              id={`${instanceId}-${id}-tab`}
              className={isActive ? 'bottom-panel-tabs__tab--active' : ''}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${instanceId}-${id}-panel`}
              tabIndex={isActive ? 0 : -1}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              key={id}
              onClick={() => selectTab(index)}
            >
              <span aria-hidden="true" />
              {label}
            </button>
          )
        })}
      </div>

      <div
        id={`${instanceId}-${active.id}-panel`}
        className="bottom-panel-tabs__content"
        role="tabpanel"
        aria-labelledby={`${instanceId}-${active.id}-tab`}
      >
        <ActivePanel />
      </div>
    </section>
  )
}
