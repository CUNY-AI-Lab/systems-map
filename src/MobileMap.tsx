import { useEffect, useRef } from 'react'
import IsoCanvas from './architecture/components/IsoCanvas'
import type { ArchitectureData } from './architecture/components/ArchitectureMap'
import { clearView, select, setActiveFlow, useMapView } from './architecture/stores/useMapView'

/**
 * The map on a phone.
 *
 * The vendored `ArchitectureMap` is a canvas flanked by a rail and a reading
 * panel, and below about 1024px those two columns leave the canvas nothing —
 * measured at 204px on a tablet and zero on a phone. But the canvas itself is
 * touch-ready: it uses pointer events with `touchAction: 'none'`, so drag-to-pan
 * already works.
 *
 * So this composes the same `IsoCanvas` with mobile chrome instead: the flows as
 * a scrollable strip, the reading panel as a pane beneath the drawing, and zoom
 * as buttons — phones have no `+` key, and the canvas owns its camera privately,
 * so the buttons press that key on the reader's behalf.
 */

const MONO = '"IBM Plex Mono", ui-monospace, monospace'

function prose(text: string) {
  return text.split(/\[\[(.+?)\]\]/g).map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} style={{ color: 'var(--navy)', fontWeight: 600 }}>
        {part}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}

export default function MobileMap({ data }: { data: ArchitectureData }) {
  const { selection, activeFlowId } = useMapView()
  const frame = useRef<HTMLDivElement>(null)

  /**
   * The camera lives inside IsoCanvas and is not exposed. Its keyboard handler
   * is, though, so a zoom button sends the same key a laptop user would press.
   */
  const sendKey = (key: string) => {
    const surface = frame.current?.querySelector<HTMLElement>('[role="application"]')
    surface?.focus()
    surface?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  }

  /**
   * Pinch to zoom.
   *
   * The camera knows two inputs: a wheel, which zooms about a point, and one
   * dragging pointer, which pans. Given two fingers it simply follows the
   * first one, so a pinch slid the map sideways and left the scale alone.
   *
   * Two things are needed to fix that, and the second is the load-bearing
   * one. Each change in the distance between the fingers becomes a wheel
   * event at their midpoint, which the camera already knows how to zoom
   * about. And while two fingers are down, `pointermove` is stopped in the
   * capture phase before it reaches React's root listener — otherwise the pan
   * recomputes the view from the frozen start of its gesture on every move,
   * throwing the zoom away as fast as it is applied.
   */
  useEffect(() => {
    const surface = frame.current?.querySelector<HTMLElement>('[role="application"]')
    if (surface === null || surface === undefined) return

    let touching = 0
    let spread: number | null = null

    const pair = (touches: TouchList) => {
      const [a, b] = [touches[0], touches[1]]
      return a === undefined || b === undefined ? null : { a, b }
    }

    const blockPan = (event: PointerEvent) => {
      if (touching >= 2) {
        event.stopPropagation()
        event.stopImmediatePropagation()
      }
    }

    const onStart = (event: TouchEvent) => {
      touching = event.touches.length
      const touches = pair(event.touches)
      if (touching === 2 && touches !== null) {
        spread = Math.hypot(touches.a.clientX - touches.b.clientX, touches.a.clientY - touches.b.clientY)
      }
    }

    const onMove = (event: TouchEvent) => {
      touching = event.touches.length
      const touches = pair(event.touches)
      if (touching !== 2 || touches === null || spread === null || spread <= 0) return
      event.preventDefault()
      const next = Math.hypot(
        touches.a.clientX - touches.b.clientX,
        touches.a.clientY - touches.b.clientY,
      )
      const factor = next / spread
      if (next <= 0 || Math.abs(factor - 1) < 1e-6) return
      spread = next
      // The camera zooms by exp(-deltaY * 0.0015), so invert that to ask for
      // exactly the factor the fingers just described.
      surface.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: -Math.log(factor) / 0.0015,
          clientX: (touches.a.clientX + touches.b.clientX) / 2,
          clientY: (touches.a.clientY + touches.b.clientY) / 2,
          bubbles: true,
          cancelable: true,
        }),
      )
    }

    const onEnd = (event: TouchEvent) => {
      touching = event.touches.length
      if (touching < 2) spread = null
    }

    document.addEventListener('pointermove', blockPan, true)
    surface.addEventListener('touchstart', onStart, { passive: false })
    surface.addEventListener('touchmove', onMove, { passive: false })
    surface.addEventListener('touchend', onEnd)
    surface.addEventListener('touchcancel', onEnd)
    return () => {
      document.removeEventListener('pointermove', blockPan, true)
      surface.removeEventListener('touchstart', onStart)
      surface.removeEventListener('touchmove', onMove)
      surface.removeEventListener('touchend', onEnd)
      surface.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  const node = selection?.kind === 'node' ? data.nodes.find((n) => n.id === selection.id) : undefined
  const edge = selection?.kind === 'edge' ? data.edges.find((e) => e.id === selection.id) : undefined
  const flow = data.flows.find((f) => f.id === activeFlowId)

  const title = node?.name ?? edge?.label ?? flow?.name ?? data.intro.title
  const meta =
    node !== undefined && node.count
      ? `${node.count} files · ~${(node.loc ?? 0).toLocaleString('en-US')} lines`
      : edge !== undefined
        ? `${data.nodes.find((n) => n.id === edge.from)?.name} → ${data.nodes.find((n) => n.id === edge.to)?.name}`
        : flow !== undefined
          ? flow.payload
          : data.intro.lede
  const body = node?.whatItDoes ?? flow?.summary ?? (edge ? `${edge.label}.` : data.intro.whatItDoes)
  const detail = node?.howItsBuilt ?? (edge || flow ? undefined : data.intro.howItsBuilt)

  const buttonBase: React.CSSProperties = {
    font: 'inherit',
    fontFamily: MONO,
    fontSize: '0.78rem',
    padding: '0.5rem 0.8rem',
    border: '1px solid var(--rule)',
    background: '#fffdf8',
    color: '#565247',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    minHeight: 44,
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          overflowX: 'auto',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--rule)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {data.flows.map((f) => {
          const on = f.id === activeFlowId
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFlow(on ? null : f.id)}
              aria-pressed={on}
              style={{
                ...buttonBase,
                background: on ? 'var(--navy)' : '#fffdf8',
                color: on ? '#fff' : '#565247',
                borderColor: on ? 'var(--navy)' : 'var(--rule)',
              }}
            >
              {f.name}
            </button>
          )
        })}
      </div>

      {/* IsoCanvas is `flex: 1`, so it needs a flex column with a real height
          to grow into — as a plain block child it collapses to zero. */}
      <div
        ref={frame}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          height: '58svh',
          minHeight: 340,
        }}
      >
        <IsoCanvas groups={data.groups} nodes={data.nodes} edges={data.edges} flows={data.flows} />
        <div
          style={{
            position: 'absolute',
            right: '0.75rem',
            bottom: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          {[
            { key: '+', label: '+', name: 'Zoom in' },
            { key: '-', label: '−', name: 'Zoom out' },
            { key: '0', label: '⤢', name: 'Fit the whole map' },
          ].map((control) => (
            <button
              key={control.key}
              type="button"
              onClick={() => sendKey(control.key)}
              aria-label={control.name}
              style={{ ...buttonBase, width: 44, minHeight: 44, textAlign: 'center', padding: 0 }}
            >
              {control.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--rule)',
          padding: '1rem 1rem 1.4rem',
          background: '#fffdf8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
          <h3
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '1.2rem',
              margin: '0 0 0.3rem',
            }}
          >
            {title}
          </h3>
          {(selection !== null || activeFlowId !== null) && (
            <button
              type="button"
              onClick={clearView}
              style={{ ...buttonBase, marginLeft: 'auto', padding: '0.5rem 0.8rem' }}
            >
              Clear
            </button>
          )}
        </div>
        {meta !== undefined && (
          <p style={{ margin: '0 0 0.6rem', fontFamily: MONO, fontSize: '0.75rem', color: '#7d776a' }}>
            {meta}
          </p>
        )}
        <p style={{ margin: 0 }}>{prose(body)}</p>
        {detail !== undefined && (
          <p style={{ margin: '0.6rem 0 0', color: '#565247', fontSize: '0.95rem' }}>
            {prose(detail)}
          </p>
        )}
        {flow !== undefined && selection === null && (
          <ol style={{ margin: '0.9rem 0 0', padding: 0, listStyle: 'none' }}>
            {flow.route.map((edgeId, index) => {
              const step = data.edges.find((e) => e.id === edgeId)
              if (step === undefined) return null
              const to = data.nodes.find((n) => n.id === step.to)
              return (
                <li key={edgeId} style={{ padding: '0.35rem 0' }}>
                  <button
                    type="button"
                    onClick={() => to && select({ kind: 'node', id: to.id })}
                    style={{
                      font: 'inherit',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'inherit',
                    }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#7d776a' }}>
                      {index + 1}{' '}
                    </span>
                    <strong style={{ color: 'var(--navy)' }}>{to?.name ?? step.to}</strong>
                    <span style={{ color: '#565247' }}> — {step.label}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        )}
        {node === undefined && flow === undefined && edge === undefined && (
          <p style={{ margin: '0.8rem 0 0', color: '#7d776a', fontSize: '0.9rem' }}>
            Pick a journey above to watch a request travel it, or tap any building to read about it.
            Drag to move the map.
          </p>
        )}
      </div>
    </div>
  )
}
