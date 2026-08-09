export const RESULT_TAB_IDS = Object.freeze([
  'output',
  'breakdown',
  'reasoning',
])

export function isResultTabLocked(tabId, hasRevealedFinalResult) {
  return !hasRevealedFinalResult && RESULT_TAB_IDS.includes(tabId)
}

export function getKeyboardTabIndex(
  key,
  currentIndex,
  tabIds,
  hasRevealedFinalResult,
) {
  const enabledIndexes = tabIds
    .map((tabId, index) =>
      isResultTabLocked(tabId, hasRevealedFinalResult) ? null : index,
    )
    .filter((index) => index != null)

  if (enabledIndexes.length === 0) return null
  if (key === 'Home') return enabledIndexes[0]
  if (key === 'End') return enabledIndexes[enabledIndexes.length - 1]
  if (key !== 'ArrowRight' && key !== 'ArrowLeft') return null

  const direction = key === 'ArrowRight' ? 1 : -1
  for (let offset = 1; offset <= tabIds.length; offset += 1) {
    const candidate =
      (currentIndex + direction * offset + tabIds.length) % tabIds.length
    if (enabledIndexes.includes(candidate)) return candidate
  }

  return currentIndex
}
