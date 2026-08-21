import assert from 'node:assert/strict'
import test from 'node:test'
import {
  horizontalWheelDelta,
  horizontalWheelPixels,
  scrollRoutePathOnWheel,
} from './routePathScroll.js'

test('uses the dominant wheel axis for horizontal route scrolling', () => {
  assert.equal(horizontalWheelDelta({ deltaX: 4, deltaY: 30 }), 30)
  assert.equal(horizontalWheelDelta({ deltaX: -40, deltaY: 8 }), -40)
})

test('normalizes line and page wheel deltas to visible pixels', () => {
  assert.equal(horizontalWheelPixels({ deltaY: 3, deltaMode: 1 }), 96)
  assert.equal(horizontalWheelPixels({ deltaY: -1, deltaMode: 2 }, 500), -500)
})

test('scrolls only the route region and prevents page scrolling', () => {
  const element = { scrollLeft: 100, scrollWidth: 800, clientWidth: 300 }
  let prevented = false
  const moved = scrollRoutePathOnWheel(element, {
    deltaX: 0,
    deltaY: 120,
    preventDefault() { prevented = true },
  })

  assert.equal(moved, true)
  assert.equal(prevented, true)
  assert.equal(element.scrollLeft, 220)
})

test('releases page scrolling at either route boundary', () => {
  for (const [scrollLeft, deltaY] of [[0, -80], [500, 80]]) {
    const element = { scrollLeft, scrollWidth: 800, clientWidth: 300 }
    let prevented = false
    const moved = scrollRoutePathOnWheel(element, {
      deltaX: 0,
      deltaY,
      preventDefault() { prevented = true },
    })

    assert.equal(moved, false)
    assert.equal(prevented, false)
    assert.equal(element.scrollLeft, scrollLeft)
  }
})

test('does nothing when the full route already fits', () => {
  const element = { scrollLeft: 0, scrollWidth: 300, clientWidth: 300 }
  let prevented = false
  const moved = scrollRoutePathOnWheel(element, {
    deltaY: 100,
    preventDefault() { prevented = true },
  })

  assert.equal(moved, false)
  assert.equal(prevented, false)
})
