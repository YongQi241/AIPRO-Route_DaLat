import { useEffect, useId, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import RouteExplanation from '../results/RouteExplanation'
import RouteResultPanel from '../results/RouteResultPanel'
import SegmentDetails from '../results/SegmentDetails'
import {
  getKeyboardTabIndex,
  isResultTabLocked,
} from './bottomPanelTabsState'
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

const TAB_IDS = TABS.map(({ id }) => id)

export default function BottomPanelTabs({ className = '' }) {
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const hasRevealedFinalResult = useAppStore(
    (state) => state.hasRevealedFinalResult,
  )
  const instanceId = useId()
  const tabRefs = useRef([])
  const requestedIndex = Math.max(
    0,
    TABS.findIndex(({ id }) => id === activeTab),
  )
  const activeIndex = isResultTabLocked(
    TABS[requestedIndex].id,
    hasRevealedFinalResult,
  )
    ? 0
    : requestedIndex
  const active = TABS[activeIndex]
  const ActivePanel = active.Component

  useEffect(() => {
    if (activeTab !== active.id) setActiveTab(active.id)
  }, [active.id, activeTab])

  const selectTab = (index, moveFocus = false) => {
    const tab = TABS[index]
    if (!tab || isResultTabLocked(tab.id, hasRevealedFinalResult)) return

    setActiveTab(tab.id)
    if (moveFocus) tabRefs.current[index]?.focus()
  }

  const handleKeyDown = (event) => {
    const nextIndex = getKeyboardTabIndex(
      event.key,
      activeIndex,
      TAB_IDS,
      hasRevealedFinalResult,
    )
    if (nextIndex == null) return

    event.preventDefault()
    selectTab(nextIndex, true)
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
          const isLocked = isResultTabLocked(id, hasRevealedFinalResult)

          return (
            <button
              id={instanceId + '-' + id + '-tab'}
              className={isActive ? 'bottom-panel-tabs__tab--active' : ''}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={isLocked}
              aria-controls={instanceId + '-' + id + '-panel'}
              tabIndex={isActive ? 0 : -1}
              disabled={isLocked}
              title={
                isLocked
                  ? 'Available after the search simulation is completed'
                  : label
              }
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
        id={instanceId + '-' + active.id + '-panel'}
        className="bottom-panel-tabs__content"
        role="tabpanel"
        aria-labelledby={instanceId + '-' + active.id + '-tab'}
      >
        <ActivePanel />
      </div>
    </section>
  )
}
