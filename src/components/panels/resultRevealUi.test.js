import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { GRAPH_LEGEND_ITEMS } from '../graph/graphLegend.js'
import {
  getKeyboardTabIndex,
  isResultTabLocked,
} from './bottomPanelTabsState.js'

const tabIds = ['simulation', 'trace', 'output', 'breakdown', 'reasoning']

test('result tabs lock before reveal and keyboard navigation skips them', () => {
  assert.equal(isResultTabLocked('output', false), true)
  assert.equal(isResultTabLocked('breakdown', false), true)
  assert.equal(isResultTabLocked('reasoning', false), true)
  assert.equal(isResultTabLocked('trace', false), false)
  assert.equal(getKeyboardTabIndex('End', 0, tabIds, false), 1)
  assert.equal(getKeyboardTabIndex('ArrowRight', 1, tabIds, false), 0)
})

test('all tabs become keyboard-accessible after reveal', () => {
  assert.equal(isResultTabLocked('output', true), false)
  assert.equal(getKeyboardTabIndex('ArrowRight', 1, tabIds, true), 2)
  assert.equal(getKeyboardTabIndex('End', 0, tabIds, true), 4)
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
  assert.equal(states.get('candidate'), 'edge')
  assert.equal(states.get('active'), 'edge')
  assert.equal(states.get('route'), 'edge')
  assert.equal(states.get('warning'), 'edge')
})

test('PlaybackToolbar no longer exposes a manual Load data control', () => {
  const source = fs.readFileSync(
    new URL('../playback/PlaybackToolbar.jsx', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(source, /Load data|onLoad|loadDisabled/)
})
