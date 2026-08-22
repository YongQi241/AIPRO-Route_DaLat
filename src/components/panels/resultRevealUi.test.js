import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { GRAPH_LEGEND_ITEMS } from '../graph/graphLegend.js'
import {
  getKeyboardTabIndex,
  isResultTabLocked,
} from './bottomPanelTabsState.js'

const tabIds = ['simulation', 'output', 'breakdown', 'reasoning']

test('result tabs lock before reveal and keyboard navigation skips them', () => {
  assert.equal(isResultTabLocked('output', false), true)
  assert.equal(isResultTabLocked('breakdown', false), true)
  assert.equal(isResultTabLocked('reasoning', false), true)
  assert.equal(getKeyboardTabIndex('End', 0, tabIds, false), 0)
  assert.equal(getKeyboardTabIndex('ArrowRight', 0, tabIds, false), 0)
})

test('all tabs become keyboard-accessible after reveal', () => {
  assert.equal(isResultTabLocked('output', true), false)
  assert.equal(getKeyboardTabIndex('ArrowRight', 0, tabIds, true), 1)
  assert.equal(getKeyboardTabIndex('End', 0, tabIds, true), 3)
})

test('legend distinguishes all required node and edge states', () => {
  const states = new Map(
    GRAPH_LEGEND_ITEMS.map(({ state, type }) => [state, type]),
  )

  assert.equal(states.get('unvisited'), 'node')
  assert.equal(states.get('frontier'), 'node')
  assert.equal(states.get('visited'), 'node')
  assert.equal(states.get('current'), 'node')
  assert.equal(states.get('final-node'), 'node')
  assert.equal(states.has('pending'), false)
  assert.equal(states.has('checked'), false)
  assert.equal(states.get('chosen'), 'edge')
  assert.equal(states.has('candidate'), false)
  assert.equal(states.get('route'), 'edge')
  assert.equal(states.get('traffic'), 'edge')
  assert.equal(states.get('warning'), 'edge')
})

test('PlaybackToolbar no longer exposes a manual Load data control', () => {
  const source = fs.readFileSync(
    new URL('../playback/PlaybackToolbar.jsx', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(source, /Load data|onLoad|loadDisabled/)
})

test('scenario detail is transient and detail panels start closed', () => {
  const scenarioPanel = fs.readFileSync(
    new URL('../route-selection/ScenarioFormulaPanel.jsx', import.meta.url),
    'utf8',
  )
  const appShell = fs.readFileSync(
    new URL('../layout/AppShell.jsx', import.meta.url),
    'utf8',
  )
  const workspace = fs.readFileSync(
    new URL('../graph/GraphWorkspace.jsx', import.meta.url),
    'utf8',
  )

  assert.match(scenarioPanel, /setTimeout\(\(\) => setIsVisible\(false\), 3200\)/)
  assert.match(appShell, /isBottomPanelCollapsed, setIsBottomPanelCollapsed\] = useState\(true\)/)
  assert.match(workspace, /edgePopupsEnabled, setEdgePopupsEnabled\] = useState\(false\)/)
})

test('high traffic and risk warnings use separate graph styles', () => {
  const finalRouteCss = fs.readFileSync(
    new URL('../graph/FinalRouteLayer.css', import.meta.url),
    'utf8',
  )
  const traversalCss = fs.readFileSync(
    new URL('../graph/SearchTraversalLayer.css', import.meta.url),
    'utf8',
  )

  assert.match(finalRouteCss, /edge--high-traffic/)
  assert.match(finalRouteCss, /edge--warning/)
  assert.doesNotMatch(traversalCss, /edge--pending|edge--checked/)
})

test('final route traffic stays above chosen search overlays', () => {
  const workspace = fs.readFileSync(
    new URL('../graph/GraphWorkspace.jsx', import.meta.url),
    'utf8',
  )
  const traversalIndex = workspace.indexOf('<SearchTraversalLayer')
  const finalRouteIndex = workspace.indexOf('<FinalRouteLayer')

  assert.ok(traversalIndex >= 0)
  assert.ok(finalRouteIndex > traversalIndex)
})

test('route explanation omits verbose metric, trace, and segment sections', () => {
  const explanation = fs.readFileSync(
    new URL('../results/RouteExplanation.jsx', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(explanation, /Các chỉ số kết quả đã ghi nhận/)
  assert.doesNotMatch(explanation, /Các đánh giá được ghi nhận khi tìm kiếm/)
  assert.doesNotMatch(explanation, /Chỉ số và điều kiện của các đường đã chọn/)
})

test('route costs use their actual unscaled notation', () => {
  const files = [
    '../results/RouteResultPanel.jsx',
    '../graph/EdgeLabelLayer.jsx',
    '../graph/EdgeHoverCard.jsx',
    '../route-selection/ScenarioFormulaPanel.jsx',
  ]
  const source = files.map((file) => fs.readFileSync(
    new URL(file, import.meta.url),
    'utf8',
  )).join('\n')

  assert.doesNotMatch(source, /×100|x100/i)
  assert.match(source, /cost=/)
})
