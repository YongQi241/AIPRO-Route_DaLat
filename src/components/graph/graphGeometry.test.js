import assert from 'node:assert/strict'
import test from 'node:test'

import { getLineLabelPosition } from './graphGeometry.js'

const identity = ([x, y]) => [x, y]

test('places an edge label at its length midpoint with a perpendicular offset', () => {
  assert.deepEqual(getLineLabelPosition([[0, 0], [10, 0]], identity), {
    x: 5,
    y: 7,
    angle: 0,
  })
})

test('offsets a reverse-direction edge onto the opposite side', () => {
  const forward = getLineLabelPosition([[0, 0], [10, 0]], identity)
  const reverse = getLineLabelPosition([[10, 0], [0, 0]], identity)

  assert.equal(forward.x, reverse.x)
  assert.equal(forward.y, -reverse.y)
  assert.equal(reverse.angle, 0)
})

test('uses the true midpoint of a multi-segment edge', () => {
  assert.deepEqual(
    getLineLabelPosition([[0, 0], [4, 0], [4, 6]], identity, 0),
    { x: 4, y: 1, angle: 90 },
  )
})
