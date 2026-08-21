export function horizontalWheelDelta(event) {
  const deltaX = Number(event?.deltaX) || 0
  const deltaY = Number(event?.deltaY) || 0

  return Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY
}

export function horizontalWheelPixels(event, pageSize = 0) {
  const delta = horizontalWheelDelta(event)

  if (event?.deltaMode === 1) return delta * 32
  if (event?.deltaMode === 2) return delta * Math.max(Number(pageSize), 1)
  return delta
}

export function scrollRoutePathOnWheel(element, event) {
  if (!element || !event) return false

  const maxScrollLeft = Math.max(
    0,
    Number(element.scrollWidth) - Number(element.clientWidth),
  )
  const delta = horizontalWheelPixels(event, element.clientWidth)

  if (maxScrollLeft === 0 || delta === 0) return false

  const currentScrollLeft = Number(element.scrollLeft) || 0
  const nextScrollLeft = Math.min(
    maxScrollLeft,
    Math.max(0, currentScrollLeft + delta),
  )

  // Let the page keep scrolling when the route is already at that boundary.
  if (nextScrollLeft === currentScrollLeft) return false

  event.preventDefault()
  element.scrollLeft = nextScrollLeft
  return true
}
