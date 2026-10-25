import { onBeforeUnmount } from 'vue'
import type { XYPosition } from '@vue-flow/core'

type CenterProvider = () => XYPosition


let provider: CenterProvider | null = null

/** Registers the mounted graph as the source of the visible center. */
export function provideGraphViewportCenter(centerProvider: CenterProvider) {
  provider = centerProvider
  onBeforeUnmount(() => {
    if (provider === centerProvider) provider = null
  })
}

/** Where a new node lands in the visible part of the graph, or null when no graph is on screen. */
export function graphViewportCenter(): XYPosition | null {
  return provider?.() ?? null
}
