import ArchitectureMap from './architecture/components/ArchitectureMap'
import { ARCHITECTURE } from './architecture/graph'
import { TOTALS } from './architecture/measured.generated'
import FleetOutline from './FleetOutline'
import MobileMap from './MobileMap'
import { useWideEnough } from './useWideEnough'

/**
 * The page around the map.
 *
 * The map is a full-height application, so it takes the whole viewport once
 * you reach it. Above it sits a short plain-language introduction for someone
 * who has never heard of any of these services.
 */

const SHELL: React.CSSProperties = {
  width: 'min(880px, calc(100% - 3rem))',
  margin: '0 auto',
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          color: 'var(--navy)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '0.72rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#7d776a',
        }}
      >
        {label}
      </div>
    </div>
  )
}

export default function App() {
  const wideEnough = useWideEnough()

  return (
    <>
      <a className="skip-link" href="#map">
        Skip to {wideEnough ? 'the map' : 'the outline'}
      </a>

      <header style={{ background: 'var(--navy)', color: '#fff', padding: '4rem 0 3.5rem' }}>
        <div style={SHELL}>
          <p
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: '0.75rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.72)',
              margin: '0 0 0.8rem',
            }}
          >
            CUNY AI Lab
          </p>
          <h1
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 'clamp(2.4rem, 6vw, 4rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.02,
              margin: '0 0 1.2rem',
            }}
          >
            The Lab&rsquo;s systems
          </h1>
          <p
            style={{
              fontSize: '1.15rem',
              lineHeight: 1.6,
              maxWidth: '60ch',
              color: 'rgba(255,255,255,0.88)',
              margin: 0,
            }}
          >
            The Lab runs a handful of services that let people at CUNY sign in once and use AI
            tools without handing their work to a vendor. This map covers what each service does
            and how a request travels between them.
          </p>
        </div>
      </header>

      <main>
        <section style={{ ...SHELL, padding: '3rem 0 2.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1.5rem',
              borderTop: '4px solid var(--navy)',
              paddingTop: '1.5rem',
              marginBottom: '2.5rem',
            }}
          >
            <Stat value={String(ARCHITECTURE.nodes.length)} label="Services mapped" />
            <Stat value={String(TOTALS.repos)} label="Repositories" />
            <Stat value={TOTALS.loc.toLocaleString('en-US')} label="Lines of code" />
            <Stat value={String(ARCHITECTURE.flows.length)} label="Traced journeys" />
          </div>

          <h2
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '1.6rem',
              letterSpacing: '-0.02em',
              margin: '0 0 0.8rem',
            }}
          >
            How to read it
          </h2>
          {wideEnough ? (
            <>
              <p style={{ maxWidth: '65ch', margin: '0 0 1rem' }}>
                Each building is one service. Its footprint is how much code it holds, and its
                height is how many of the journeys below run through it, so the tall buildings are
                the ones almost everything depends on. The lines between them are the calls they
                make to each other. Outlined shapes sit outside the Lab, where there is no code of
                ours to measure.
              </p>
              <p style={{ maxWidth: '65ch', margin: '0 0 1rem' }}>
                Start with a journey from the left-hand list. A dot follows the route a request
                takes, stopping at each service with a note on what happens there. Click a
                building for a plain description, with the technical detail underneath.
              </p>
            </>
          ) : (
            <p style={{ maxWidth: '65ch', margin: '0 0 1rem' }}>
              Each building is one service: wider means more code, taller means more journeys run
              through it. Outlined shapes sit outside the Lab. Pick a journey to watch a request
              travel it, or tap a building to read about it. Drag to move the map, and pinch to
              zoom.
            </p>
          )}
        </section>

        <section id="map" style={{ borderTop: '1px solid var(--rule)' }}>
          {wideEnough ? (
            <ArchitectureMap data={ARCHITECTURE} />
          ) : (
            <>
              <MobileMap data={ARCHITECTURE} />
              <FleetOutline data={ARCHITECTURE} />
            </>
          )}
        </section>
      </main>

      <footer
        style={{
          background: 'var(--navy)',
          color: 'rgba(255,255,255,0.85)',
          padding: '2.5rem 0',
          fontSize: '0.92rem',
        }}
      >
        <div style={SHELL}>
          <p style={{ margin: '0 0 0.6rem' }}>
            Built with the{' '}
            <a
              href="https://github.com/almendili/skills/tree/main/architecture-map"
              style={{ color: '#ffb81c' }}
            >
              architecture-map
            </a>{' '}
            skill. Sizes and counts come from the source repositories; the descriptions are
            written by hand.
          </p>
          <p style={{ margin: 0 }}>
            Questions about the Lab:{' '}
            <a href="mailto:ailab@gc.cuny.edu" style={{ color: '#ffb81c' }}>
              ailab@gc.cuny.edu
            </a>
          </p>
        </div>
      </footer>
    </>
  )
}
