import { useSyncExternalStore } from 'react'

/**
 * Whether there is room for the isometric map.
 *
 * The map is a canvas flanked by a rail and a reading panel. Measured on the
 * published site, the canvas is 204px wide at a 768px viewport and collapses to
 * zero on a phone — so the threshold is the width at which the drawing is still
 * the largest thing on screen, not the width at which it technically renders.
 */
const QUERY = '(min-width: 1024px)'

const query = typeof window === 'undefined' ? null : window.matchMedia(QUERY)

function subscribe(onChange: () => void) {
  query?.addEventListener('change', onChange)
  return () => query?.removeEventListener('change', onChange)
}

export function useWideEnough(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => query?.matches ?? true,
    () => true,
  )
}
